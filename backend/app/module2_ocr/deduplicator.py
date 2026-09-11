import re
import difflib
from typing import List, Dict, Any, Tuple, Optional
from pathlib import Path
import fitz  # PyMuPDF
import cv2
import numpy as np

def compute_dhash(img: np.ndarray, hash_size: int = 8) -> int:
    """Computes difference hash (dHash) for visual similarity comparison."""
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img
    resized = cv2.resize(gray, (hash_size + 1, hash_size), interpolation=cv2.INTER_AREA)
    diff = resized[:, 1:] > resized[:, :-1]
    return sum([2 ** i for (i, v) in enumerate(diff.flatten()) if v])

def compute_dhash_similarity(hash1: int, hash2: int, hash_size: int = 8) -> float:
    """Calculates normalized similarity (0.0 to 1.0) based on Hamming distance."""
    bit_len = hash_size * hash_size
    hamming_dist = bin(hash1 ^ hash2).count('1')
    return max(0.0, 1.0 - (hamming_dist / float(bit_len)))

def compute_ssim_simple(img1: np.ndarray, img2: np.ndarray) -> float:
    """Computes simplified SSIM between two grayscale images of identical size."""
    if len(img1.shape) == 3:
        g1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
    else:
        g1 = img1
    if len(img2.shape) == 3:
        g2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)
    else:
        g2 = img2

    g1 = cv2.resize(g1, (256, 256))
    g2 = cv2.resize(g2, (256, 256))

    c1 = (0.01 * 255) ** 2
    c2 = (0.03 * 255) ** 2

    g1 = g1.astype(np.float64)
    g2 = g2.astype(np.float64)

    mu1 = cv2.GaussianBlur(g1, (11, 11), 1.5)
    mu2 = cv2.GaussianBlur(g2, (11, 11), 1.5)

    mu1_sq = mu1 ** 2
    mu2_sq = mu2 ** 2
    mu1_mu2 = mu1 * mu2

    sigma1_sq = cv2.GaussianBlur(g1 ** 2, (11, 11), 1.5) - mu1_sq
    sigma2_sq = cv2.GaussianBlur(g2 ** 2, (11, 11), 1.5) - mu2_sq
    sigma12 = cv2.GaussianBlur(g1 * g2, (11, 11), 1.5) - mu1_mu2

    ssim_map = ((2 * mu1_mu2 + c1) * (2 * sigma12 + c2)) / ((mu1_sq + mu2_sq + c1) * (sigma1_sq + sigma2_sq + c2))
    return float(np.mean(ssim_map))


def normalize_text_for_comparison(text: str) -> str:
    """Normalizes text by lowercasing, stripping extra whitespace, and removing standard OCR noise."""
    if not text:
        return ""
    text = text.lower()
    # Replace line breaks and multiple spaces with a single space
    text = re.sub(r'\s+', ' ', text)
    # Remove non-alphanumeric noise except basic punctuation
    text = re.sub(r'[^a-z0-9\s]', '', text)
    return text.strip()


def is_header_footer_or_page_num(line_text: str) -> bool:
    """Returns True if line matches common page number or slide number patterns."""
    clean = line_text.strip().lower()
    patterns = [
        r'^\s*(page|slide)?\s*\d+(\s*(of|\/)\s*\d+)?\s*$',
        r'^\s*\d+\s*$'
    ]
    for p in patterns:
        if re.match(p, clean):
            return True
    return False


def extract_page_texts_and_visuals(
    pdf_path: str,
    page_results: Optional[List[Dict[str, Any]]] = None
) -> Tuple[List[str], List[np.ndarray]]:
    """
    Extracts normalized text and rendered images for all pages.
    Reuses OCR elements if page_results provided, otherwise PyMuPDF page text.
    """
    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    page_texts = []
    page_images = []

    # Detect repetitive headers/footers across pages
    line_counts = {}
    
    raw_pages_lines = []
    for i in range(total_pages):
        page = doc[i]
        lines = []
        if page_results and i < len(page_results):
            elements = page_results[i].get("elements", [])
            for elem in elements:
                t = elem.get("text", "").strip()
                if t:
                    lines.append(t)
        else:
            text = page.get_text()
            lines = [l.strip() for l in text.splitlines() if l.strip()]

        raw_pages_lines.append(lines)
        for l in lines:
            norm_l = normalize_text_for_comparison(l)
            # Only count short strings (< 45 chars) as potential repetitive headers/footers
            if norm_l and len(norm_l) < 45:
                line_counts[norm_l] = line_counts.get(norm_l, 0) + 1

    # Frequency threshold: short strings appearing on >= 75% of pages (min 3 pages) are considered repetitive header/footer
    freq_threshold = max(3, int(total_pages * 0.75))
    repetitive_strings = {s for s, count in line_counts.items() if count >= freq_threshold}

    for i in range(total_pages):
        page = doc[i]
        lines = raw_pages_lines[i]
        filtered_lines = []
        for l in lines:
            if is_header_footer_or_page_num(l):
                continue
            norm_l = normalize_text_for_comparison(l)
            if len(norm_l) < 45 and norm_l in repetitive_strings:
                continue
            if norm_l:
                filtered_lines.append(norm_l)

        full_norm_text = " ".join(filtered_lines)
        page_texts.append(full_norm_text)

        # Render page image for visual fallback
        pix = page.get_pixmap(dpi=100)
        img_data = np.frombuffer(pix.samples, dtype=np.uint8).reshape((pix.height, pix.width, pix.n))
        if pix.n == 4:
            img_bgr = cv2.cvtColor(img_data, cv2.COLOR_RGBA2BGR)
        else:
            img_bgr = cv2.cvtColor(img_data, cv2.COLOR_RGB2BGR)
        page_images.append(img_bgr)

    doc.close()
    return page_texts, page_images


def calculate_text_similarity(text1: str, text2: str, threshold: float = 0.75) -> float:
    """Calculates text similarity using character ratio, Jaccard word similarity, and build-up overlap."""
    if not text1 and not text2:
        return 1.0
    if not text1 or not text2:
        return 0.0
    char_sim = difflib.SequenceMatcher(None, text1, text2).ratio()
    w1 = set(text1.split())
    w2 = set(text2.split())
    if w1 and w2:
        word_jaccard = len(w1 & w2) / float(len(w1 | w2))
        overlap_min = len(w1 & w2) / float(min(len(w1), len(w2)))
    else:
        word_jaccard = 1.0
        overlap_min = 1.0

    # Build-up slide overlap: if overlap_min matches or exceeds threshold, use overlap_min
    if overlap_min >= threshold:
        word_sim = overlap_min
    else:
        word_sim = word_jaccard

    return min(char_sim, (char_sim + word_sim) / 2.0)


def is_visually_duplicate(img1: np.ndarray, img2: np.ndarray, threshold: float = 0.75) -> bool:
    """Checks visual similarity using dHash & SSIM with adaptive thresholds."""
    std1, std2 = np.std(img1), np.std(img2)
    mean1, mean2 = np.mean(img1), np.mean(img2)

    # Blank vs non-blank mismatch check
    if (std1 < 3.0 and std2 >= 3.0) or (std1 >= 3.0 and std2 < 3.0):
        return False

    # Mean color / brightness difference check
    if abs(mean1 - mean2) > 25.0:
        return False

    # Non-background content color difference check (ignores background whitespace)
    gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
    gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)
    non_bg_mask = (gray1 < 248) | (gray2 < 248)
    if np.any(non_bg_mask):
        content_color_diff = float(np.mean(np.abs(img1[non_bg_mask].astype(np.float32) - img2[non_bg_mask].astype(np.float32))))
        if content_color_diff > 30.0:
            return False

    dhash1 = compute_dhash(img1)
    dhash2 = compute_dhash(img2)
    dhash_sim = compute_dhash_similarity(dhash1, dhash2)

    if dhash_sim >= 0.75:
        ssim = compute_ssim_simple(img1, img2)
        if ssim >= min(threshold, 0.78):
            return True
    return False


def analyze_duplicate_slides(
    pdf_path: str,
    page_results: Optional[List[Dict[str, Any]]] = None,
    similarity_threshold: float = 0.50
) -> Dict[str, Any]:
    """
    Detects duplicate slides/pages in a PDF document based on text overlap & visual similarity.
    Groups duplicate/build-up slides together and keeps the most complete page ('sisakan yang bener').
    """
    page_texts, page_images = extract_page_texts_and_visuals(pdf_path, page_results)
    total_pages = len(page_texts)

    if total_pages == 0:
        return {
            "original_page_count": 0,
            "unique_page_count": 0,
            "duplicate_page_count": 0,
            "duplicate_groups": [],
            "unique_pages": [],
            "duplicate_pages": []
        }

    page_word_counts = [len(t.split()) for t in page_texts]

    # Cluster duplicate / build-up pages into groups
    groups: List[List[int]] = []

    for i in range(total_pages):
        p_num = i + 1
        p_text = page_texts[i]
        p_img = page_images[i]
        p_words = page_word_counts[i]

        matched_group_idx = None

        for g_idx, group_members in enumerate(groups):
            for member_p_num in group_members:
                m_idx = member_p_num - 1
                m_text = page_texts[m_idx]
                m_img = page_images[m_idx]
                m_words = page_word_counts[m_idx]

                is_dup = False

                # Case A: Both pages have text content
                if p_words >= 2 and m_words >= 2:
                    sim = calculate_text_similarity(p_text, m_text, threshold=similarity_threshold)
                    if sim >= similarity_threshold:
                        is_dup = True
                # Case B: Low text / visual slides
                else:
                    if is_visually_duplicate(p_img, m_img, threshold=similarity_threshold):
                        is_dup = True

                if is_dup:
                    matched_group_idx = g_idx
                    break

            if matched_group_idx is not None:
                break

        if matched_group_idx is not None:
            groups[matched_group_idx].append(p_num)
        else:
            groups.append([p_num])

    # Select the most complete page ('sisakan yang bener') per duplicate group
    kept_pages = []
    duplicate_pages = []
    duplicate_groups = []

    for group in groups:
        if len(group) == 1:
            kept_pages.append(group[0])
        else:
            # Select page with highest word count (or earliest if equal word count)
            best_page = max(group, key=lambda p: (page_word_counts[p - 1], -p))
            kept_pages.append(best_page)

            dups = [p for p in group if p != best_page]
            duplicate_pages.extend(dups)
            duplicate_groups.append({
                "keep_page": best_page,
                "duplicate_pages": dups
            })

    kept_pages.sort()
    duplicate_pages.sort()

    return {
        "original_page_count": total_pages,
        "unique_page_count": len(kept_pages),
        "duplicate_page_count": len(duplicate_pages),
        "duplicate_groups": duplicate_groups,
        "unique_pages": kept_pages,
        "duplicate_pages": duplicate_pages
    }


def generate_unique_pdf(pdf_path: str, unique_pages: List[int], output_pdf_path: str) -> str:
    """
    Generates a new PDF containing only the selected unique pages.
    Preserves vector graphics, text layers, dimensions, and image quality without re-rasterization.
    """
    doc = fitz.open(pdf_path)
    if not unique_pages:
        unique_pages = list(range(1, len(doc) + 1))

    # Convert 1-based page numbers to 0-based indices for PyMuPDF
    page_indices = [p - 1 for p in unique_pages if 1 <= p <= len(doc)]

    doc.select(page_indices)
    doc.save(output_pdf_path, garbage=4, deflate=True)
    doc.close()
    return output_pdf_path

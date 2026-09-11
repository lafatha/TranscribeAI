import re
from typing import List, Dict, Any, Tuple
from pathlib import Path
import fitz  # PyMuPDF

def is_box_subsumed(r_small: fitz.Rect, existing_rects: List[fitz.Rect]) -> bool:
    """Returns True if r_small is contained inside or >= 75% overlapped by an existing larger rect."""
    area_small = r_small.width * r_small.height
    if area_small <= 0:
        return False

    for r_big in existing_rects:
        # Containment check with 3.0pt margin tolerance
        if (r_big.x0 - 3.0 <= r_small.x0 and r_small.x1 <= r_big.x1 + 3.0 and
            r_big.y0 - 3.0 <= r_small.y0 and r_small.y1 <= r_big.y1 + 3.0):
            return True

        # Intersection ratio over smaller rect area
        intersect = r_small & r_big
        if not intersect.is_empty:
            intersect_area = intersect.width * intersect.height
            if (intersect_area / area_small) >= 0.75:
                return True

    return False


def is_whole_word_match(page: fitz.Page, rect: fitz.Rect, target_kw: str) -> bool:
    """
    Verifies that target_kw match rect is a standalone whole word and not a sub-part of a longer word (e.g. 'cin' inside 'cinta').
    """
    words_in_target = target_kw.strip().split()
    first_target_word = re.sub(r'^\W+|\W+$', '', words_in_target[0].lower()) if words_in_target else ""
    last_target_word = re.sub(r'^\W+|\W+$', '', words_in_target[-1].lower()) if words_in_target else ""

    expanded_rect = fitz.Rect(
        max(0, rect.x0 - 15),
        max(0, rect.y0 - 4),
        min(page.rect.width, rect.x1 + 15),
        min(page.rect.height, rect.y1 + 4)
    )

    page_words = page.get_text("words", clip=expanded_rect)
    if not page_words:
        return True

    start_rect = fitz.Rect(rect.x0 - 2, rect.y0, min(rect.x1, rect.x0 + 15), rect.y1)
    end_rect = fitz.Rect(max(rect.x0, rect.x1 - 15), rect.y0, rect.x1 + 2, rect.y1)

    for w in page_words:
        w_rect = fitz.Rect(w[0], w[1], w[2], w[3])
        w_str = w[4]
        clean_w = re.sub(r'^\W+|\W+$', '', w_str.lower())
        if not clean_w:
            continue

        intersect_start = start_rect & w_rect
        if not intersect_start.is_empty and intersect_start.width > 2:
            if first_target_word and clean_w != first_target_word and len(clean_w) > len(first_target_word):
                if clean_w.startswith(first_target_word) or clean_w.endswith(first_target_word):
                    return False

        intersect_end = end_rect & w_rect
        if not intersect_end.is_empty and intersect_end.width > 2:
            if last_target_word and clean_w != last_target_word and len(clean_w) > len(last_target_word):
                if clean_w.startswith(last_target_word) or clean_w.endswith(last_target_word):
                    return False

    return True


def scan_keywords_in_pdf(
    pdf_path: str,
    keywords: List[Any],
    case_sensitive: bool = False,
    whole_word_only: bool = True
) -> Dict[str, Any]:
    """
    Scans PDF for occurrences of keywords and returns match locations (72 DPI PDF points) and preview summary.
    Prioritizes longer multi-word keywords first (e.g. 'Aku Susu' over 'Aku') and enforces whole-word boundaries ('cin' != 'cinta').
    """
    doc = fitz.open(pdf_path)
    total_pages = len(doc)

    kw_items = []
    for k in keywords:
        if isinstance(k, dict):
            word = str(k.get("keyword", "")).strip()
            lbl = str(k.get("label") or k.get("acronym") or "").strip()
        else:
            s_val = str(k).strip()
            if ":" in s_val and not s_val.startswith("http"):
                parts = s_val.split(":", 1)
                word = parts[0].strip()
                lbl = parts[1].strip()
            else:
                word = s_val
                lbl = ""
        if word:
            kw_items.append({"keyword": word, "label": lbl})

    if not kw_items:
        doc.close()
        return {
            "total_redactions": 0,
            "total_pages_affected": 0,
            "keywords_summary": [],
            "matches": []
        }

    # Sort keywords by length descending so longer phrase matches (e.g. 'Aku Susu') take precedence
    sorted_kw_items = sorted(kw_items, key=lambda item: len(item["keyword"]), reverse=True)

    matches = []
    keyword_stats = {
        item["keyword"]: {"matches_count": 0, "pages": set(), "label": item["label"]} for item in kw_items
    }
    affected_pages = set()

    for p_idx in range(total_pages):
        page_num = p_idx + 1
        page = doc[p_idx]
        page_accepted_rects: List[fitz.Rect] = []

        for item in sorted_kw_items:
            kw = item["keyword"]
            label = item["label"]

            rects = []
            if case_sensitive:
                rects = page.search_for(kw)
            else:
                candidates = [kw, kw.lower(), kw.upper(), kw.title()]
                seen_keys = set()
                for cand in candidates:
                    for r in page.search_for(cand):
                        key = (round(r.x0, 1), round(r.y0, 1), round(r.x1, 1), round(r.y1, 1))
                        if key not in seen_keys:
                            seen_keys.add(key)
                            rects.append(r)

            for r_idx, rect in enumerate(rects):
                # Skip shorter keyword match if it is subsumed by an existing longer keyword match
                if is_box_subsumed(rect, page_accepted_rects):
                    continue

                # Whole word match check (e.g. 'cin' should not match inside 'cinta')
                if whole_word_only and not is_whole_word_match(page, rect, kw):
                    continue

                if case_sensitive:
                    extracted_rect_text = page.get_text("text", clip=rect).strip()
                    if kw not in extracted_rect_text:
                        continue

                bbox = [
                    round(rect.x0, 2),
                    round(rect.y0, 2),
                    round(rect.x1, 2),
                    round(rect.y1, 2)
                ]

                match_id = f"m_{page_num}_{kw}_{r_idx}"
                
                snippet_rect = fitz.Rect(
                    max(0, rect.x0 - 100),
                    max(0, rect.y0 - 20),
                    min(page.rect.width, rect.x1 + 100),
                    min(page.rect.height, rect.y1 + 20)
                )
                snippet = page.get_text("text", clip=snippet_rect).replace("\n", " ").strip()
                if not snippet:
                    snippet = f"... {kw} ..."

                matches.append({
                    "match_id": match_id,
                    "keyword": kw,
                    "label": label,
                    "page": page_num,
                    "bbox": bbox,
                    "snippet": snippet
                })

                page_accepted_rects.append(rect)
                keyword_stats[kw]["matches_count"] += 1
                keyword_stats[kw]["pages"].add(page_num)
                affected_pages.add(page_num)

    doc.close()

    keywords_summary = []
    for item in kw_items:
        kw = item["keyword"]
        stats = keyword_stats[kw]
        pages_list = sorted(list(stats["pages"]))
        keywords_summary.append({
            "keyword": kw,
            "label": stats["label"],
            "matches_count": stats["matches_count"],
            "pages_count": len(pages_list),
            "page_numbers": pages_list
        })

    return {
        "total_redactions": len(matches),
        "total_pages_affected": len(affected_pages),
        "keywords_summary": keywords_summary,
        "matches": matches
    }


def apply_pdf_redactions(
    pdf_path: str,
    matches_to_redact: List[Dict[str, Any]],
    output_pdf_path: str
) -> Tuple[str, Dict[str, Any]]:
    """
    Performs TRUE PDF Redaction on specified matches.
    Permanently deletes underlying text content, vector streams, and renders black redaction rectangle.
    Optionally overlays custom replacement text/acronym (in white font) on top of the blackout box.
    """
    doc = fitz.open(pdf_path)

    # Group matches by page
    page_matches: Dict[int, List[Dict[str, Any]]] = {}
    for m in matches_to_redact:
        p = m.get("page")
        if p is not None:
            if p not in page_matches:
                page_matches[p] = []
            page_matches[p].append(m)

    redacted_keywords = set()

    for p_num, m_list in page_matches.items():
        if 1 <= p_num <= len(doc):
            page = doc[p_num - 1]
            for m in m_list:
                bbox = m.get("bbox", [])
                kw = m.get("keyword", "")
                label = m.get("label") or m.get("acronym")
                if kw:
                    redacted_keywords.add(kw)
                if len(bbox) == 4:
                    rect = fitz.Rect(bbox[0], bbox[1], bbox[2], bbox[3])
                    if label and str(label).strip():
                        # Blackout + custom acronym / label text on top (white text on black box)
                        text_label = str(label).strip()
                        page.add_redact_annot(
                            rect,
                            text=text_label,
                            fill=(0, 0, 0),
                            text_color=(1, 1, 1),
                            fontname="helv",
                            align=fitz.TEXT_ALIGN_CENTER
                        )
                    else:
                        # Pure blackout box
                        page.add_redact_annot(rect, fill=(0, 0, 0))

            # Apply redactions - permanently strips text objects & graphics inside redaction rectangles
            page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)

    doc.save(output_pdf_path, garbage=4, deflate=True)
    doc.close()

    # Programmatic Security Verification Check
    verify_doc = fitz.open(output_pdf_path)
    unredacted_occurrences = 0
    unredacted_details = []

    for kw in redacted_keywords:
        kw_clean = kw.strip().lower()
        if not kw_clean:
            continue
        for p_idx in range(len(verify_doc)):
            page_t = verify_doc[p_idx].get_text().lower()
            if kw_clean in page_t:
                unredacted_occurrences += 1
                unredacted_details.append({
                    "keyword": kw,
                    "page": p_idx + 1
                })

    verify_doc.close()

    is_verified = (unredacted_occurrences == 0)

    verification_meta = {
        "verified": is_verified,
        "total_redactions_applied": len(matches_to_redact),
        "redacted_keywords": list(redacted_keywords),
        "unredacted_occurrences_found": unredacted_occurrences,
        "unredacted_details": unredacted_details
    }

    return output_pdf_path, verification_meta

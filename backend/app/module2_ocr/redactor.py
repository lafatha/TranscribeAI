import re
from typing import List, Dict, Any, Tuple
from pathlib import Path
import fitz  # PyMuPDF

def scan_keywords_in_pdf(
    pdf_path: str,
    keywords: List[str],
    case_sensitive: bool = False
) -> Dict[str, Any]:
    """
    Scans PDF for occurrences of keywords and returns match locations (72 DPI PDF points) and preview summary.
    """
    doc = fitz.open(pdf_path)
    total_pages = len(doc)

    clean_keywords = [k.strip() for k in keywords if k and k.strip()]
    if not clean_keywords:
        doc.close()
        return {
            "total_redactions": 0,
            "total_pages_affected": 0,
            "keywords_summary": [],
            "matches": []
        }

    matches = []
    keyword_stats = {
        kw: {"matches_count": 0, "pages": set()} for kw in clean_keywords
    }
    affected_pages = set()

    for p_idx in range(total_pages):
        page_num = p_idx + 1
        page = doc[p_idx]
        page_text = page.get_text()

        for kw in clean_keywords:
            rects = []
            if case_sensitive:
                rects = page.search_for(kw)
            else:
                # Try all case variations to guarantee matching
                candidates = [kw, kw.lower(), kw.upper(), kw.title()]
                seen_keys = set()
                for cand in candidates:
                    for r in page.search_for(cand):
                        key = (round(r.x0, 1), round(r.y0, 1), round(r.x1, 1), round(r.y1, 1))
                        if key not in seen_keys:
                            seen_keys.add(key)
                            rects.append(r)

            for r_idx, rect in enumerate(rects):
                bbox = [
                    round(rect.x0, 2),
                    round(rect.y0, 2),
                    round(rect.x1, 2),
                    round(rect.y1, 2)
                ]

                # Case sensitivity check if requested
                if case_sensitive:
                    extracted_rect_text = page.get_text("text", clip=rect).strip()
                    if kw not in extracted_rect_text:
                        continue

                # Context snippet around match
                match_id = f"m_{page_num}_{kw}_{r_idx}"
                
                # Extract surrounding text
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
                    "page": page_num,
                    "bbox": bbox,
                    "snippet": snippet
                })

                keyword_stats[kw]["matches_count"] += 1
                keyword_stats[kw]["pages"].add(page_num)
                affected_pages.add(page_num)

    doc.close()

    keywords_summary = []
    for kw in clean_keywords:
        stats = keyword_stats[kw]
        pages_list = sorted(list(stats["pages"]))
        keywords_summary.append({
            "keyword": kw,
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
    Verifies programmatically that redacted keywords no longer exist in text layer.
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
                if kw:
                    redacted_keywords.add(kw)
                if len(bbox) == 4:
                    rect = fitz.Rect(bbox[0], bbox[1], bbox[2], bbox[3])
                    # Add redaction annotation (solid black box)
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

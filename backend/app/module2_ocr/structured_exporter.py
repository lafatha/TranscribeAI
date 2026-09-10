import json
from pathlib import Path
from typing import List, Dict, Any, Tuple

from app.config import EXPORT_DIR, DEFAULT_OCR_REVIEW_THRESHOLD

def generate_structured_outputs(
    doc_name: str,
    pdf_path: str,
    page_results: List[Dict[str, Any]],
    ocr_review_threshold: float = DEFAULT_OCR_REVIEW_THRESHOLD
) -> Tuple[str, str, str, int]:
    """
    Generates output.md, output.json, and output.txt without hallucination.
    Returns (md_path, json_path, txt_path, needs_review_count).
    """
    base_name = Path(pdf_path).stem
    out_dir = EXPORT_DIR / base_name
    out_dir.mkdir(parents=True, exist_ok=True)

    md_path = str(out_dir / f"{base_name}_output.md")
    json_path = str(out_dir / f"{base_name}_output.json")
    txt_path = str(out_dir / f"{base_name}_output.txt")

    needs_review_count = 0
    md_lines = [f"# Presentation: {doc_name}\n"]
    txt_lines = []

    json_data = {
        "document": doc_name,
        "pdf_path": pdf_path,
        "total_pages": len(page_results),
        "pages": []
    }

    for p_idx, page in enumerate(page_results, start=1):
        elements = page.get("elements", [])
        visuals = page.get("visuals", [])
        confidences = [e.get("confidence", 1.0) for e in elements]
        mean_conf = float(sum(confidences) / len(confidences)) if confidences else 1.0

        is_review_needed = mean_conf < ocr_review_threshold
        if is_review_needed:
            needs_review_count += 1
            status_str = f"Needs Review (Confidence: {int(mean_conf * 100)}%)"
        else:
            status_str = f"OK ({int(mean_conf * 100)}%)"

        md_lines.append(f"## Slide {p_idx}")
        md_lines.append(f"**Status**: {status_str}\n")

        # Titles & Paragraphs
        titles = [e for e in elements if e.get("type") == "title"]
        paras = [e for e in elements if e.get("type") == "paragraph"]

        if titles:
            md_lines.append("### Title")
            for t in titles:
                md_lines.append(t["text"])
            md_lines.append("")

        if paras:
            md_lines.append("### Text")
            for p in paras:
                md_lines.append(p["text"])
            md_lines.append("")

        # Visuals (Charts, Tables, Diagrams)
        if visuals:
            md_lines.append("### Visual Content")
            for vis in visuals:
                v_type = vis.get("type", "visual")
                v_img = vis.get("image_path", "")
                rel_img_path = Path(v_img).name if v_img else ""

                if v_type == "table":
                    md_lines.append(f"#### Table")
                    nearby = vis.get("nearby_text", [])
                    if nearby:
                        # Format deterministic markdown table if structure clean
                        md_lines.append("| Extracted Content |")
                        md_lines.append("|---|")
                        for n_text in nearby[:5]:
                            clean_t = n_text.replace("\n", " ").replace("|", "\\|")
                            md_lines.append(f"| {clean_t} |")
                    else:
                        md_lines.append("[Table detected but structure could not be reconstructed reliably.]")
                    if rel_img_path:
                        md_lines.append(f"\n![Table Image]({v_img})\n")

                elif v_type == "chart":
                    subtype = vis.get("subtype", "Chart")
                    md_lines.append(f"#### {subtype}")
                    nearby = vis.get("nearby_text", [])
                    if nearby:
                        md_lines.append("Visible labels / categories:")
                        for n_text in nearby:
                            md_lines.append(f"- {n_text}")
                    if rel_img_path:
                        md_lines.append(f"\n![Chart Image]({v_img})\n")

        md_lines.append("---\n")

        # TXT content for search
        page_full_text = f"Slide {p_idx}:\n" + "\n".join([e["text"] for e in elements])
        txt_lines.append(page_full_text)

        # JSON data
        json_data["pages"].append({
            "page": p_idx,
            "status": status_str,
            "mean_confidence": round(mean_conf, 2),
            "elements": elements,
            "visuals": visuals,
            "text": "\n".join([e["text"] for e in elements])
        })

    # Save files
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines))

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(json_data, f, indent=2)

    with open(txt_path, "w", encoding="utf-8") as f:
        f.write("\n\n".join(txt_lines))

    return md_path, json_path, txt_path, needs_review_count

import json
from pathlib import Path
from typing import List, Dict, Any, Tuple

from app.config import EXPORT_DIR, DEFAULT_OCR_REVIEW_THRESHOLD

import fitz  # PyMuPDF

def generate_searchable_pdf(pdf_path: str, page_results: List[Dict[str, Any]], output_pdf_path: str) -> str:
    """
    Creates a Searchable PDF by embedding an invisible selectable text layer (render_mode=3)
    on top of each slide page so users can highlight, copy, & Ctrl+F text in any PDF reader.
    Uses 72 DPI PDF Point coordinates directly for pixel-perfect 1:1 alignment.
    """
    doc = fitz.open(pdf_path)
    for i, page_data in enumerate(page_results):
        if i >= len(doc):
            break
        page = doc[i]
        elements = page_data.get("elements", [])
        if not elements:
            continue

        for elem in elements:
            text = elem.get("text", "").strip()
            bbox = elem.get("bbox", [])
            if not text or len(bbox) != 4:
                continue

            x0, y0, x1, y1 = bbox
            rect = fitz.Rect(x0, y0, x1, y1)
            if rect.width > 0.5 and rect.height > 0.5:
                try:
                    # Estimate font size from rectangle height for accurate text fitting
                    font_size = max(5.0, min(rect.height * 0.75, 36.0))
                    page.insert_textbox(rect, text, render_mode=3, fontname="helv", fontsize=font_size)
                except Exception:
                    pass

    doc.save(output_pdf_path, garbage=4, deflate=True)
    doc.close()
    return output_pdf_path



def generate_formatted_pdf_report(doc_name: str, page_results: List[Dict[str, Any]], output_pdf_path: str) -> str:
    """
    Creates a neatly formatted PDF document report containing structured OCR titles,
    paragraphs, and extracted table visuals.
    """
    report_doc = fitz.open()

    for p_idx, page_data in enumerate(page_results, start=1):
        # Create an A4 page (595 x 842 points)
        page = report_doc.new_page(width=595, height=842)
        
        # Header banner
        shape = page.new_shape()
        shape.draw_rect(fitz.Rect(0, 0, 595, 45))
        shape.finish(color=(0.12, 0.12, 0.16), fill=(0.12, 0.12, 0.16))
        shape.commit()

        page.insert_text((30, 28), f"OCR Presentation Document — Slide #{p_idx}", fontsize=12, color=(1, 1, 1))

        y_cursor = 70
        elements = page_data.get("elements", [])
        visuals = page_data.get("visuals", [])

        # Slide Titles & Paragraphs
        for elem in elements:
            if y_cursor > 780:
                page = report_doc.new_page(width=595, height=842)
                y_cursor = 50

            text = elem.get("text", "").strip()
            e_type = elem.get("type", "paragraph")

            if e_type == "title":
                rect = fitz.Rect(30, y_cursor, 565, y_cursor + 35)
                page.insert_textbox(rect, text, fontsize=13, fontname="helv", color=(0.1, 0.2, 0.6))
                y_cursor += 40
            else:
                rect = fitz.Rect(30, y_cursor, 565, y_cursor + 50)
                page.insert_textbox(rect, text, fontsize=10, fontname="helv", color=(0.2, 0.2, 0.2))
                y_cursor += max(25, 15 * (text.count("\n") + 1))

        # Embedded Table / Graphic Images
        for vis in visuals:
            v_img = vis.get("image_path", "")
            if v_img and Path(v_img).exists():
                if y_cursor > 600:
                    page = report_doc.new_page(width=595, height=842)
                    y_cursor = 50

                img_rect = fitz.Rect(30, y_cursor, 400, y_cursor + 180)
                try:
                    page.insert_image(img_rect, filename=v_img)
                    y_cursor += 195
                except Exception:
                    pass

    report_doc.save(output_pdf_path, garbage=4, deflate=True)
    report_doc.close()
    return output_pdf_path


def generate_structured_outputs(
    doc_name: str,
    pdf_path: str,
    page_results: List[Dict[str, Any]],
    ocr_review_threshold: float = DEFAULT_OCR_REVIEW_THRESHOLD
) -> Tuple[str, str, str, str, str, int]:
    """
    Generates output.md, output.json, output.txt, searchable.pdf, and report.pdf.
    Returns (md_path, json_path, txt_path, searchable_pdf_path, pdf_report_path, needs_review_count).
    """
    base_name = Path(pdf_path).stem
    out_dir = EXPORT_DIR / base_name
    out_dir.mkdir(parents=True, exist_ok=True)

    md_path = str(out_dir / f"{base_name}_output.md")
    json_path = str(out_dir / f"{base_name}_output.json")
    txt_path = str(out_dir / f"{base_name}_output.txt")
    searchable_pdf_path = str(out_dir / f"{base_name}_searchable.pdf")
    pdf_report_path = str(out_dir / f"{base_name}_report.pdf")

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

    # Generate Searchable PDF (Embedded OCR text layer overlay)
    try:
        generate_searchable_pdf(pdf_path, page_results, searchable_pdf_path)
    except Exception as e:
        print(f"Warning: Failed to generate searchable PDF: {e}")
        searchable_pdf_path = pdf_path

    # Generate Formatted PDF Report
    try:
        generate_formatted_pdf_report(doc_name, page_results, pdf_report_path)
    except Exception as e:
        print(f"Warning: Failed to generate PDF report: {e}")
        pdf_report_path = pdf_path

    return md_path, json_path, txt_path, searchable_pdf_path, pdf_report_path, needs_review_count

import cv2
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Tuple

from app.config import CROPS_DIR

def analyze_page_layout_and_graphics(
    page_img: np.ndarray,
    page_num: int,
    text_elements: List[Dict[str, Any]],
    doc_id: str
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Analyzes visual page layout, identifies charts/tables/diagrams,
    saves graphic crops, and links nearby text labels.
    """
    h, w = page_img.shape[:2]
    gray = cv2.cvtColor(page_img, cv2.COLOR_BGR2GRAY)
    
    visual_elements = []
    updated_elements = list(text_elements)

    # 1. Table Detection via Line Morphological Filter
    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (int(w * 0.05), 1))
    vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, int(h * 0.05)))
    
    thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
    
    h_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, horizontal_kernel)
    v_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, vertical_kernel)
    
    table_mask = cv2.add(h_lines, v_lines)
    table_contours, _ = cv2.findContours(table_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    crop_dir = CROPS_DIR / doc_id
    crop_dir.mkdir(parents=True, exist_ok=True)

    table_idx = 1
    chart_idx = 1

    for cnt in table_contours:
        x, y, bw, bh = cv2.boundingRect(cnt)
        if bw > w * 0.20 and bh > h * 0.15: # Table candidate
            crop = page_img[y:y+bh, x:x+bw]
            filename = f"page_{page_num:03d}_table_{table_idx:02d}.png"
            crop_path = str(crop_dir / filename)
            cv2.imwrite(crop_path, crop)

            # Find text inside/nearby table
            nearby_texts = []
            for elem in text_elements:
                eb = elem["bbox"]
                if (x <= eb[0] <= x + bw or x <= eb[2] <= x + bw) and (y - 40 <= eb[1] <= y + bh + 40):
                    nearby_texts.append(elem["text"])

            visual_elements.append({
                "type": "table",
                "bbox": [x, y, x + bw, y + bh],
                "image_path": crop_path,
                "nearby_text": nearby_texts,
                "confidence": 0.90
            })
            table_idx += 1

    # 2. Chart / Diagram Detection (Non-text graphical clusters)
    # Mask out text bounding boxes
    non_text_mask = thresh.copy()
    for elem in text_elements:
        eb = elem["bbox"]
        cv2.rectangle(non_text_mask, (max(0, eb[0]-5), max(0, eb[1]-5)), (min(w, eb[2]+5), min(h, eb[3]+5)), 0, -1)

    chart_contours, _ = cv2.findContours(non_text_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for cnt in chart_contours:
        x, y, bw, bh = cv2.boundingRect(cnt)
        if bw > w * 0.25 and bh > h * 0.20 and (bw * bh) > (w * h * 0.05):
            # Check if this overlaps with an already detected table
            is_table_overlap = any(
                abs(x - t["bbox"][0]) < 30 and abs(y - t["bbox"][1]) < 30
                for t in visual_elements if t["type"] == "table"
            )
            if not is_table_overlap:
                crop = page_img[y:y+bh, x:x+bw]
                filename = f"page_{page_num:03d}_chart_{chart_idx:02d}.png"
                crop_path = str(crop_dir / filename)
                cv2.imwrite(crop_path, crop)

                # Determine chart type heuristic (circle/pie vs bar/line)
                chart_type = "Chart / Graphic"
                if abs(bw - bh) < min(bw, bh) * 0.2:
                    chart_type = "Pie Chart / Infographic"
                elif bh > bw:
                    chart_type = "Bar Chart / Flow Diagram"
                else:
                    chart_type = "Line Chart / Diagram"

                nearby_texts = []
                for elem in text_elements:
                    eb = elem["bbox"]
                    if (x - 50 <= eb[0] <= x + bw + 50) and (y - 50 <= eb[1] <= y + bh + 50):
                        nearby_texts.append(elem["text"])

                visual_elements.append({
                    "type": "chart",
                    "subtype": chart_type,
                    "bbox": [x, y, x + bw, y + bh],
                    "image_path": crop_path,
                    "nearby_text": nearby_texts,
                    "confidence": 0.85
                })
                chart_idx += 1

    return updated_elements, visual_elements

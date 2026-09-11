import os
import cv2
import json
import time
import numpy as np
import fitz  # PyMuPDF
from PIL import Image
from typing import List, Dict, Any, Tuple
from pathlib import Path

from app.config import DATA_DIR

def compute_box_intersection_ratio(box1: List[float], box2: List[float]) -> float:
    """Calculate intersection over area of box1."""
    x0 = max(box1[0], box2[0])
    y0 = max(box1[1], box2[1])
    x1 = min(box1[2], box2[2])
    y1 = min(box1[3], box2[3])

    if x1 <= x0 or y1 <= y0:
        return 0.0

    inter_area = (x1 - x0) * (y1 - y0)
    box1_area = (box1[2] - box1[0]) * (box1[3] - box1[1])
    if box1_area <= 0:
        return 0.0
    return inter_area / box1_area

class LocalOcrEngine:
    def __init__(self, languages: List[str] = ["en", "id"]):
        self.languages = languages
        self._paddleocr = None
        self._rapidocr = None
        self._easyocr_reader = None
        self._pytesseract_available = None

    def _get_paddleocr(self):
        if self._paddleocr is None:
            try:
                from paddleocr import PaddleOCR
                # Official PaddleOCR with det_limit_side_len=1600 for optimal speed and completeness
                self._paddleocr = PaddleOCR(
                    use_angle_cls=False,
                    lang="en",
                    det_limit_side_len=1600,
                    det_db_thresh=0.2,
                    det_db_box_thresh=0.3,
                    det_db_unclip_ratio=1.8,
                    show_log=False
                )
            except Exception:
                try:
                    from paddleocr import PaddleOCR
                    self._paddleocr = PaddleOCR(use_angle_cls=False, lang="en", show_log=False)
                except Exception:
                    self._paddleocr = False
        return self._paddleocr

    def _get_rapidocr(self):
        if self._rapidocr is None:
            try:
                from rapidocr_onnxruntime import RapidOCR
                self._rapidocr = RapidOCR(det_limit_side_len=1600)
            except Exception:
                try:
                    from rapidocr_onnxruntime import RapidOCR
                    self._rapidocr = RapidOCR()
                except Exception:
                    self._rapidocr = False
        return self._rapidocr

    def _get_pytesseract(self):
        if self._pytesseract_available is None:
            try:
                import pytesseract
                import shutil
                tess_cmd = shutil.which("tesseract")
                if not tess_cmd:
                    possible_paths = [
                        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
                        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
                        os.path.expanduser(r"~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe")
                    ]
                    for p in possible_paths:
                        if os.path.exists(p):
                            pytesseract.pytesseract.tesseract_cmd = p
                            tess_cmd = p
                            break
                
                if tess_cmd:
                    self._pytesseract_available = pytesseract
                else:
                    self._pytesseract_available = False
            except Exception:
                self._pytesseract_available = False
        return self._pytesseract_available

    def _get_easyocr(self):
        if self._easyocr_reader is None:
            try:
                import easyocr
                try:
                    self._easyocr_reader = easyocr.Reader(self.languages, gpu=False, download_enabled=False)
                except Exception:
                    self._easyocr_reader = easyocr.Reader(self.languages, gpu=False, download_enabled=True)
            except Exception:
                self._easyocr_reader = False
        return self._easyocr_reader

    def extract_page_ocr(
        self,
        page: fitz.Page,
        page_num: int,
        job_id: str = "default_job"
    ) -> Tuple[List[Dict[str, Any]], np.ndarray, Dict[str, Any]]:
        """
        Full-Page Rasterized & Hybrid Digital OCR with 72 DPI PDF Point Standard Bboxes.
        """
        t0 = time.time()

        # 1. Rasterize full page to 200 DPI image for OpenCV & Vision OCR
        pix = page.get_pixmap(dpi=200)
        img_data = np.frombuffer(pix.samples, dtype=np.uint8).reshape((pix.height, pix.width, pix.n))
        if pix.n == 4:
            img_bgr = cv2.cvtColor(img_data, cv2.COLOR_RGBA2BGR)
        else:
            img_bgr = cv2.cvtColor(img_data, cv2.COLOR_RGB2BGR)

        page_w_pt = max(1.0, float(page.rect.width))
        page_h_pt = max(1.0, float(page.rect.height))
        img_w_px = float(pix.width)
        img_h_px = float(pix.height)

        scale_to_pt_x = page_w_pt / img_w_px
        scale_to_pt_y = page_h_pt / img_h_px

        scale_to_px_x = img_w_px / page_w_pt
        scale_to_px_y = img_h_px / page_h_pt

        # 2. Extract PyMuPDF Native Digital Text Layer (Exact 72 DPI PDF Points)
        pdf_digital_elements = []
        try:
            page_text_dict = page.get_text("dict")
            if page_text_dict and "blocks" in page_text_dict:
                for b_idx, block in enumerate(page_text_dict["blocks"]):
                    if block.get("type") == 0:  # Text block
                        for line in block.get("lines", []):
                            line_text = "".join([span.get("text", "") for span in line.get("spans", [])]).strip()
                            if line_text:
                                bbox_pt = [round(c, 2) for c in line.get("bbox", [0, 0, 0, 0])]
                                bbox_px = [
                                    int(bbox_pt[0] * scale_to_px_x),
                                    int(bbox_pt[1] * scale_to_px_y),
                                    int(bbox_pt[2] * scale_to_px_x),
                                    int(bbox_pt[3] * scale_to_px_y)
                                ]
                                pdf_digital_elements.append({
                                    "text": line_text,
                                    "bbox": bbox_pt,
                                    "bbox_px": bbox_px,
                                    "confidence": 0.99,
                                    "type": "paragraph"
                                })
        except Exception as e:
            print(f"[LocalOcrEngine] PyMuPDF digital text warning: {e}")

        # 3. Vision OCR on full-page image (PaddleOCR / RapidOCR / EasyOCR / PyTesseract)
        vision_elements = []
        paddle = self._get_paddleocr()
        if paddle:
            try:
                p_res = paddle.ocr(img_bgr, cls=False)
                if p_res and p_res[0]:
                    for line in p_res[0]:
                        if line and len(line) >= 2:
                            bbox_pts, (text_str, conf) = line[0], line[1]
                            if text_str and text_str.strip():
                                x_coords = [p[0] for p in bbox_pts]
                                y_coords = [p[1] for p in bbox_pts]
                                px0, py0, px1, py1 = int(min(x_coords)), int(min(y_coords)), int(max(x_coords)), int(max(y_coords))
                                bbox_pt = [
                                    round(px0 * scale_to_pt_x, 2),
                                    round(py0 * scale_to_pt_y, 2),
                                    round(px1 * scale_to_pt_x, 2),
                                    round(py1 * scale_to_pt_y, 2)
                                ]
                                vision_elements.append({
                                    "text": text_str.strip(),
                                    "bbox": bbox_pt,
                                    "bbox_px": [px0, py0, px1, py1],
                                    "confidence": round(float(conf), 2),
                                    "type": "paragraph"
                                })
            except Exception as e:
                print(f"[LocalOcrEngine] PaddleOCR warning: {e}")

        # RapidOCR Fallback if PaddleOCR returned nothing
        if len(vision_elements) == 0:
            rapid = self._get_rapidocr()
            if rapid:
                try:
                    ocr_results, _ = rapid(img_bgr)
                    if ocr_results:
                        for item in ocr_results:
                            bbox_pts, text_str, conf = item[0], item[1], item[2]
                            if text_str and text_str.strip():
                                x_coords = [p[0] for p in bbox_pts]
                                y_coords = [p[1] for p in bbox_pts]
                                px0, py0, px1, py1 = int(min(x_coords)), int(min(y_coords)), int(max(x_coords)), int(max(y_coords))
                                bbox_pt = [
                                    round(px0 * scale_to_pt_x, 2),
                                    round(py0 * scale_to_pt_y, 2),
                                    round(px1 * scale_to_pt_x, 2),
                                    round(py1 * scale_to_pt_y, 2)
                                ]
                                vision_elements.append({
                                    "text": text_str.strip(),
                                    "bbox": bbox_pt,
                                    "bbox_px": [px0, py0, px1, py1],
                                    "confidence": round(float(conf), 2),
                                    "type": "paragraph"
                                })
                except Exception as e:
                    print(f"[LocalOcrEngine] RapidOCR warning: {e}")

        # 4. Hybrid Merge (Combine Digital + Vision with Deduplication)
        final_elements = []

        if pdf_digital_elements:
            final_elements.extend(pdf_digital_elements)
            # Add vision elements that were NOT caught by digital layer (e.g. diagrams, graphics, scanned text)
            for vis in vision_elements:
                v_box = vis["bbox"]
                is_duplicate = False
                for dig in pdf_digital_elements:
                    d_box = dig["bbox"]
                    if compute_box_intersection_ratio(v_box, d_box) > 0.4:
                        is_duplicate = True
                        break
                if not is_duplicate:
                    final_elements.append(vis)
        else:
            final_elements.extend(vision_elements)

        # Visual Content Fallback if page is completely blank textually
        if len(final_elements) == 0:
            gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
            thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 3))
            dilated = cv2.dilate(thresh, kernel, iterations=2)
            contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            for cnt in contours:
                x, y, bw, bh = cv2.boundingRect(cnt)
                if bw > 20 and bh > 10:
                    bbox_pt = [
                        round(x * scale_to_pt_x, 2),
                        round(y * scale_to_pt_y, 2),
                        round((x + bw) * scale_to_pt_x, 2),
                        round((y + bh) * scale_to_pt_y, 2)
                    ]
                    final_elements.append({
                        "text": f"[Visual Content Region {x},{y}]",
                        "bbox": bbox_pt,
                        "bbox_px": [x, y, x + bw, y + bh],
                        "confidence": 0.50,
                        "type": "paragraph"
                    })

        # 5. Natural Reading-Order Sorting (Top-to-Bottom, Left-to-Right by PDF Point Y & X)
        final_elements.sort(key=lambda e: (e["bbox"][1] // 15, e["bbox"][0]))

        if final_elements:
            top_elem = final_elements[0]
            if top_elem["bbox"][1] < page_h_pt * 0.25 and len(top_elem["text"]) < 100:
                top_elem["type"] = "title"

        t_elapsed = time.time() - t0

        # 6. Calculate Completeness & Precision Metrics
        confidences = [e.get("confidence", 1.0) for e in final_elements]
        avg_conf = float(np.mean(confidences)) if confidences else 1.0
        min_conf = float(np.min(confidences)) if confidences else 1.0
        total_chars = sum(len(e.get("text", "")) for e in final_elements)
        total_words = sum(len(e.get("text", "").split()) for e in final_elements)
        page_area = float(page_w_pt * page_h_pt)
        detected_area = sum((e["bbox"][2] - e["bbox"][0]) * (e["bbox"][3] - e["bbox"][1]) for e in final_elements)
        coverage_pct = round((detected_area / max(1.0, page_area)) * 100, 2)

        page_metrics = {
            "page": page_num,
            "detected_boxes_count": len(final_elements),
            "recognized_lines_count": len([e for e in final_elements if e.get("text")]),
            "avg_confidence": round(avg_conf, 2),
            "min_confidence": round(min_conf, 2),
            "total_chars": total_chars,
            "total_words": total_words,
            "page_coverage_pct": coverage_pct,
            "processing_time_sec": round(t_elapsed, 2)
        }

        # 7. Generate MANDATORY Debug Artifacts under data/debug/{job_id}/
        debug_dir = DATA_DIR / "debug" / job_id
        debug_dir.mkdir(parents=True, exist_ok=True)

        prefix = f"page-{page_num:03d}"
        
        cv2.imwrite(str(debug_dir / f"{prefix}-original.png"), img_bgr)
        cv2.imwrite(str(debug_dir / f"{prefix}-ocr-input.png"), img_bgr)

        # Bounding box visualization image (drawn on 200 DPI pixel canvas)
        img_vis = img_bgr.copy()
        for idx, elem in enumerate(final_elements, start=1):
            px_box = elem.get("bbox_px", [])
            if len(px_box) == 4:
                cv2.rectangle(img_vis, (px_box[0], px_box[1]), (px_box[2], px_box[3]), (0, 255, 0), 2)
                cv2.putText(
                    img_vis,
                    f"#{idx}",
                    (px_box[0], max(12, px_box[1] - 4)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.4,
                    (0, 0, 255),
                    1
                )
        cv2.imwrite(str(debug_dir / f"{prefix}-detection.png"), img_vis)

        # Debug JSON & TXT
        with open(str(debug_dir / f"{prefix}-raw.json"), "w", encoding="utf-8") as f:
            json.dump({
                "page": page_num,
                "metrics": page_metrics,
                "elements": final_elements
            }, f, indent=2)

        with open(str(debug_dir / f"{prefix}-final.txt"), "w", encoding="utf-8") as f:
            f.write("\n".join([e.get("text", "") for e in final_elements]))

        print(f"[OCR Completeness Page #{page_num}] Boxes: {page_metrics['detected_boxes_count']} | Words: {page_metrics['total_words']} | Coverage: {page_metrics['page_coverage_pct']}% | Time: {page_metrics['processing_time_sec']}s")

        return final_elements, img_bgr, page_metrics





import os
import cv2
import numpy as np
import fitz  # PyMuPDF
from PIL import Image
from typing import List, Dict, Any, Tuple
from pathlib import Path

class LocalOcrEngine:
    def __init__(self, languages: List[str] = ["en", "id"]):
        self.languages = languages
        self._easyocr_reader = None

    def _get_easyocr(self):
        if self._easyocr_reader is None:
            try:
                import easyocr
                # Disable download if offline model exists, or initialize local model
                self._easyocr_reader = easyocr.Reader(self.languages, gpu=False, download_enabled=False)
            except Exception as e:
                # If model weights are missing offline or easyocr fails, fallback gracefully to PyMuPDF vision/text extractor
                self._easyocr_reader = False
        return self._easyocr_reader

    def extract_page_ocr(self, page: fitz.Page, page_num: int) -> List[Dict[str, Any]]:
        """
        Extracts structured OCR elements from a PDF page completely locally.
        Returns list of dicts with keys: 'text', 'bbox', 'confidence', 'type'.
        """
        elements = []
        
        # 1. Try PyMuPDF text block extraction (Fastest & precise for digital/rendered text)
        text_page = page.get_text("blocks")
        pix = page.get_pixmap(dpi=150)
        img_data = np.frombuffer(pix.samples, dtype=np.uint8).reshape((pix.height, pix.width, pix.n))
        if pix.n == 4:
            img_bgr = cv2.cvtColor(img_data, cv2.COLOR_RGBA2BGR)
        else:
            img_bgr = cv2.cvtColor(img_data, cv2.COLOR_RGB2BGR)

        if text_page and len(text_page) > 0:
            for block in text_page:
                # block: (x0, y0, x1, y1, text, block_no, block_type)
                if len(block) >= 5 and block[4].strip():
                    bbox = [int(block[0]), int(block[1]), int(block[2]), int(block[3])]
                    text_str = block[4].strip()
                    
                    # Classify type by font size/position
                    elem_type = "paragraph"
                    if block[1] < page.rect.height * 0.25 and len(text_str.split("\n")[0]) < 80:
                        elem_type = "title"
                    elif "│" in text_str or "|" in text_str or "\t" in text_str:
                        elem_type = "table"

                    elements.append({
                        "text": text_str,
                        "bbox": bbox,
                        "confidence": 0.95,
                        "type": elem_type
                    })

        # 2. If PyMuPDF found little/no text (e.g. rasterized slide image), attempt local EasyOCR or OpenCV contour text block extraction
        if len(elements) == 0:
            reader = self._get_easyocr()
            if reader:
                try:
                    ocr_results = reader.readtext(img_bgr)
                    for (bbox_pts, text_str, conf) in ocr_results:
                        if text_str.strip():
                            x_coords = [p[0] for p in bbox_pts]
                            y_coords = [p[1] for p in bbox_pts]
                            bbox = [int(min(x_coords)), int(min(y_coords)), int(max(x_coords)), int(max(y_coords))]
                            elements.append({
                                "text": text_str.strip(),
                                "bbox": bbox,
                                "confidence": round(float(conf), 2),
                                "type": "paragraph"
                            })
                except Exception:
                    pass

        # 3. Fallback: If still empty, use OpenCV contour text region detection
        if len(elements) == 0:
            gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
            thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 3))
            dilated = cv2.dilate(thresh, kernel, iterations=2)
            contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            for cnt in contours:
                x, y, w, h = cv2.boundingRect(cnt)
                if w > 20 and h > 10:
                    elements.append({
                        "text": f"[Text Region {x},{y}]",
                        "bbox": [x, y, x + w, y + h],
                        "confidence": 0.70,
                        "type": "paragraph"
                    })

        return elements, img_bgr

import json
from pathlib import Path
from typing import List, Dict, Any, Tuple
import fitz  # PyMuPDF
from PIL import Image

from app.config import PROCESSED_DIR, EXPORT_DIR

def build_slide_pdf(
    slides: List[Dict[str, Any]],
    output_pdf_path: str,
    video_metadata: Dict[str, Any],
    processing_time_sec: float
) -> Tuple[str, Dict[str, Any]]:
    """
    Builds a clean presentation PDF where 1 slide = 1 PDF page.
    Generates accompanying metadata JSON file with timestamps.
    """
    output_pdf = Path(output_pdf_path)
    output_pdf.parent.mkdir(parents=True, exist_ok=True)

    import io

    doc = fitz.open()

    for slide in slides:
        img_path = slide["image_path"]
        if not Path(img_path).exists():
            continue

        with Image.open(img_path) as img:
            # Enforce max 1080p resolution cap (1920x1080)
            if img.width > 1920 or img.height > 1080:
                img.thumbnail((1920, 1080), Image.Resampling.LANCZOS)

            w, h = img.size

            if img.mode != "RGB":
                img = img.convert("RGB")

            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=85, optimize=True)
            img_bytes = buf.getvalue()

        # Create PDF page with matching dimensions (in points: 1 px ~= 0.75 pt)
        page_w = float(w) * 0.75
        page_h = float(h) * 0.75
        
        page = doc.new_page(width=page_w, height=page_h)
        rect = fitz.Rect(0, 0, page_w, page_h)
        page.insert_image(rect, stream=img_bytes)

    doc.save(str(output_pdf), garbage=4, deflate=True)
    doc.close()

    # Generate metadata JSON
    meta_json_path = output_pdf.with_suffix(".json")
    metadata = {
        "source_video": Path(video_metadata.get("source_video", "")).name,
        "source_fps": video_metadata.get("fps", 30.0),
        "total_frames": video_metadata.get("total_frames", 0),
        "detected_slides": len(slides),
        "output_pages": len(slides),
        "processing_time_seconds": round(processing_time_sec, 2),
        "slides": [
            {
                "slide": s["slide_id"],
                "timestamp": s["timestamp"],
                "source_frame": s["frame_idx"],
                "quality_score": s["quality_score"],
                "similarity_score": s["similarity_score"],
                "quad_rectified": s.get("quad_detected", False)
            }
            for s in slides
        ]
    }

    with open(meta_json_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    return str(output_pdf), metadata

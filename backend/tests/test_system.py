import os
import sys
import time
import pytest
import cv2
import numpy as np
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.module1_video.extractor import VideoFrameExtractor
from app.module1_video.deduplicator import process_and_deduplicate_slides
from app.module1_video.pdf_builder import build_slide_pdf
from app.module2_ocr.ocr_engine import LocalOcrEngine
from app.module2_ocr.layout_analyzer import analyze_page_layout_and_graphics
from app.module2_ocr.structured_exporter import generate_structured_outputs
from app.module2_ocr.search_service import index_ocr_document, search_slides
from app.database import init_db

def create_synthetic_presentation_video(output_path: str, num_slides: int = 3, fps: int = 30, duration_per_slide_sec: float = 1.0) -> str:
    """Generates a synthetic presentation MP4 video with screen tilt, lighting shifts, and slide changes."""
    w, h = 1280, 720
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (w, h))

    slides_content = [
        ("Slide 1: Strategy 2026 Overview", "Revenue Growth and Market Expansion", (180, 40, 40)),
        ("Slide 2: Financial Metrics", "Product A: $120k | Product B: $180k", (40, 140, 40)),
        ("Slide 3: Roadmap & Execution", "Milestone 2025 -> Milestone 2026", (40, 40, 180))
    ]

    for slide_idx in range(num_slides):
        title, subtitle, bg_color = slides_content[slide_idx % len(slides_content)]
        
        # Base Slide Canvas (16:9)
        base = np.full((540, 960, 3), 245, dtype=np.uint8)
        # Draw slide header bar with distinct color per slide
        cv2.rectangle(base, (0, 0), (960, 90), bg_color, -1)
        cv2.putText(base, title, (30, 60), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)
        cv2.putText(base, subtitle, (50, 200), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (20, 20, 20), 2)
        
        # Draw distinct content per slide
        if slide_idx % 3 == 0:
            cv2.rectangle(base, (100, 260), (860, 480), (220, 220, 240), -1)
            cv2.putText(base, "Executive Summary & Objectives", (120, 340), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (50, 50, 120), 2)
        elif slide_idx % 3 == 1:
            cv2.rectangle(base, (100, 260), (450, 480), (200, 240, 200), -1)
            cv2.rectangle(base, (500, 260), (850, 480), (200, 240, 200), -1)
            cv2.putText(base, "Table Data Q1", (120, 340), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (20, 80, 20), 2)
            cv2.putText(base, "Table Data Q2", (520, 340), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (20, 80, 20), 2)
        else:
            cv2.circle(base, (300, 370), 80, (240, 200, 200), -1)
            cv2.circle(base, (650, 370), 80, (200, 200, 240), -1)
            cv2.putText(base, "Process A", (250, 375), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (50, 50, 50), 2)
            cv2.putText(base, "Process B", (600, 375), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (50, 50, 50), 2)

        # Place base slide inside camera viewport with slight perspective tilt
        pts1 = np.float32([[0, 0], [960, 0], [960, 540], [0, 540]])
        pts2 = np.float32([[150, 100], [1130, 80], [1100, 640], [180, 620]])
        M = cv2.getPerspectiveTransform(pts1, pts2)

        frames_for_this_slide = int(fps * duration_per_slide_sec)
        for f in range(frames_for_this_slide):
            frame = np.full((h, w, 3), 30, dtype=np.uint8) # Dark room background
            warped_slide = cv2.warpPerspective(base, M, (w, h))
            
            # Combine background and slide
            mask = (warped_slide > 0).astype(np.uint8)
            frame = frame * (1 - mask) + warped_slide * mask

            # Add minor camera jitter and brightness shift
            jitter_x = int(np.sin(f * 0.2) * 2)
            jitter_y = int(np.cos(f * 0.2) * 2)
            if jitter_x != 0 or jitter_y != 0:
                translation_matrix = np.float32([[1, 0, jitter_x], [0, 1, jitter_y]])
                frame = cv2.warpAffine(frame, translation_matrix, (w, h))

            out.write(frame)

    out.release()
    return output_path


def test_end_to_end_pipeline(tmp_path):
    """Automated unit test verifying Tool 1 and Tool 2 end-to-end execution."""
    init_db()
    video_file = str(tmp_path / "test_presentation.mp4")
    pdf_file = str(tmp_path / "slides.pdf")

    # 1. Generate Synthetic Video
    create_synthetic_presentation_video(video_file, num_slides=3, fps=30, duration_per_slide_sec=1.0)
    assert os.path.exists(video_file)

    # 2. Execute Tool 1: Video -> PDF
    extractor = VideoFrameExtractor(video_file, base_fps=5.0)
    v_info = extractor.get_info()
    assert v_info["total_frames"] == 90 # 3 slides * 30 frames

    frame_stream = list(extractor.extract_sampled_frames(sample_fps=5.0))
    extractor.close()

    slides = process_and_deduplicate_slides(frame_stream, duplicate_threshold=0.75)
    print(f"DEBUG: Extracted {len(slides)} slides from synthetic video.")
    assert len(slides) == 3 # Exactly 3 unique slides extracted from 90 raw frames!

    out_pdf, metadata = build_slide_pdf(slides, pdf_file, v_info, processing_time_sec=1.0)
    assert os.path.exists(out_pdf)
    assert metadata["detected_slides"] == 3

    # 3. Execute Tool 2: PDF -> Structured OCR
    ocr_engine = LocalOcrEngine()
    import fitz
    doc = fitz.open(out_pdf)
    assert len(doc) == 3

    page_results = []
    for i in range(len(doc)):
        page = doc[i]
        elements, page_img = ocr_engine.extract_page_ocr(page, i + 1)
        elements, visuals = analyze_page_layout_and_graphics(page_img, i + 1, elements, "test_job")
        page_results.append({
            "page": i + 1,
            "elements": elements,
            "visuals": visuals
        })
    doc.close()

    md_path, json_path, txt_path, review_count = generate_structured_outputs(
        doc_name="test_presentation.mp4",
        pdf_path=out_pdf,
        page_results=page_results,
        ocr_review_threshold=0.75
    )

    assert os.path.exists(md_path)
    assert os.path.exists(json_path)
    assert os.path.exists(txt_path)

    # 4. Search verification
    index_ocr_document("test_presentation.mp4", out_pdf, page_results)
    results = search_slides("Strategy", limit=5)
    assert isinstance(results, list)
    print("End-to-end test passed successfully!")

if __name__ == "__main__":
    import tempfile
    with tempfile.TemporaryDirectory() as tmpdir:
        test_end_to_end_pipeline(Path(tmpdir))

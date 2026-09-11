import pytest
from pathlib import Path
import fitz  # PyMuPDF
import cv2
import numpy as np

from app.module2_ocr.deduplicator import (
    analyze_duplicate_slides,
    generate_unique_pdf,
    normalize_text_for_comparison,
    calculate_text_similarity
)

def create_sample_pdf(tmp_path: Path, pages_spec: list) -> str:
    """Helper to generate sample PDFs for testing deduplication."""
    pdf_path = str(tmp_path / "test_dedup.pdf")
    doc = fitz.open()

    for p_info in pages_spec:
        page = doc.new_page(width=595, height=842)
        y_offset = 100
        
        # Draw header if specified
        if "header" in p_info:
            page.insert_text((50, 40), p_info["header"], fontsize=10, color=(0.5, 0.5, 0.5))

        # Draw page number if specified
        if "page_num" in p_info:
            page.insert_text((500, 800), p_info["page_num"], fontsize=10, color=(0.5, 0.5, 0.5))

        # Draw main content lines
        for text in p_info.get("lines", []):
            page.insert_text((50, y_offset), text, fontsize=14, color=(0, 0, 0))
            y_offset += 30

        # Draw image if specified
        if p_info.get("draw_image"):
            # Create a simple red square image buffer
            img = np.zeros((100, 100, 3), dtype=np.uint8)
            img[:] = p_info.get("img_color", (0, 0, 255))
            _, img_bytes = cv2.imencode(".png", img)
            rect = fitz.Rect(50, y_offset, 250, y_offset + 150)
            page.insert_image(rect, stream=img_bytes.tobytes())

    doc.save(pdf_path)
    doc.close()
    return pdf_path


def test_exact_and_minor_ocr_duplicates(tmp_path):
    """Tests exact duplicate slides and minor OCR differences/whitespace."""
    spec = [
        {"lines": ["Executive Summary 2026", "Quarterly revenue increased by 25 percent across regions."]}, # Page 1
        {"lines": ["Executive Summary 2026", "Quarterly revenue increased by 25 percent across regions."]}, # Page 2: Exact duplicate
        {"lines": ["Executive Summary 2026", "Quarterly revenue increased by 25 percent across region."]},  # Page 3: Minor typo ('region' vs 'regions')
    ]
    pdf_path = create_sample_pdf(tmp_path, spec)
    res = analyze_duplicate_slides(pdf_path, similarity_threshold=0.85)

    assert res["original_page_count"] == 3
    assert res["unique_page_count"] == 1
    assert res["duplicate_page_count"] == 2
    assert res["unique_pages"] == [1]
    assert res["duplicate_pages"] == [2, 3]


def test_same_template_different_content(tmp_path):
    """Ensures slides sharing the same template/header but with substantially different content stay separate."""
    spec = [
        {"header": "ACME Corporation Annual Report", "lines": ["Financial Performance Q1", "Revenue reached 10M USD."]}, # Page 1
        {"header": "ACME Corporation Annual Report", "lines": ["Operational Risks Q2", "Supply chain bottleneck in Asian logistics."]}, # Page 2: Same header, different body
    ]
    pdf_path = create_sample_pdf(tmp_path, spec)
    res = analyze_duplicate_slides(pdf_path, similarity_threshold=0.80)

    assert res["original_page_count"] == 2
    assert res["unique_page_count"] == 2
    assert res["duplicate_page_count"] == 0
    assert res["unique_pages"] == [1, 2]


def test_multiple_groups_and_non_consecutive_duplicates(tmp_path):
    """Tests non-consecutive duplicate pages and multiple duplicate groups."""
    spec = [
        {"lines": ["Topic Alpha: Introduction to Deep Learning"]},              # Page 1 (Group 1 keep)
        {"lines": ["Topic Beta: Convolutional Neural Networks"]},               # Page 2 (Group 2 keep)
        {"lines": ["Topic Alpha: Introduction to Deep Learning"]},              # Page 3 (Duplicate of 1)
        {"lines": ["Topic Gamma: Recurrent Neural Networks"]},                  # Page 4 (Unique 3)
        {"lines": ["Topic Beta: Convolutional Neural Networks"]},               # Page 5 (Duplicate of 2)
        {"lines": ["Topic Alpha: Introduction to Deep Learning"]},              # Page 6 (Duplicate of 1)
    ]
    pdf_path = create_sample_pdf(tmp_path, spec)
    res = analyze_duplicate_slides(pdf_path, similarity_threshold=0.85)

    assert res["original_page_count"] == 6
    assert res["unique_page_count"] == 3
    assert res["duplicate_page_count"] == 3
    assert res["unique_pages"] == [1, 2, 4]
    assert res["duplicate_pages"] == [3, 5, 6]

    groups = res["duplicate_groups"]
    assert len(groups) == 2
    assert groups[0]["keep_page"] == 1
    assert groups[0]["duplicate_pages"] == [3, 6]
    assert groups[1]["keep_page"] == 2
    assert groups[1]["duplicate_pages"] == [5]


def test_header_and_page_numbers_ignored(tmp_path):
    """Tests ignoring repetitive headers/footers and page numbers causing identical slides to differ."""
    spec = [
        {"header": "CONFIDENTIAL INTERNAL PRESENTATION", "page_num": "Page 1 of 3", "lines": ["Key Takeaways", "Model accuracy reached 98 percent."]}, # Page 1
        {"header": "CONFIDENTIAL INTERNAL PRESENTATION", "page_num": "Page 2 of 3", "lines": ["Key Takeaways", "Model accuracy reached 98 percent."]}, # Page 2
        {"header": "CONFIDENTIAL INTERNAL PRESENTATION", "page_num": "Page 3 of 3", "lines": ["Key Takeaways", "Model accuracy reached 98 percent."]}, # Page 3
    ]
    pdf_path = create_sample_pdf(tmp_path, spec)
    res = analyze_duplicate_slides(pdf_path, similarity_threshold=0.85)

    assert res["original_page_count"] == 3
    assert res["unique_page_count"] == 1
    assert res["duplicate_pages"] == [2, 3]


def test_image_only_and_blank_pages(tmp_path):
    """Tests visual fallback for image-only and blank slides."""
    spec = [
        {"draw_image": True, "img_color": (0, 0, 255)}, # Page 1: Red box image
        {"draw_image": True, "img_color": (0, 0, 255)}, # Page 2: Identical Red box image
        {"draw_image": True, "img_color": (255, 0, 0)}, # Page 3: Blue box image (Different)
        {},                                             # Page 4: Blank page
        {},                                             # Page 5: Blank page (Duplicate of 4)
    ]
    pdf_path = create_sample_pdf(tmp_path, spec)
    res = analyze_duplicate_slides(pdf_path, similarity_threshold=0.85)

    assert res["original_page_count"] == 5
    assert res["unique_page_count"] == 3
    assert 2 in res["duplicate_pages"]
    assert 5 in res["duplicate_pages"]


def test_unique_pdf_generation_preserves_quality(tmp_path):
    """Verifies that generate_unique_pdf compiles vector PDF cleanly without quality loss."""
    spec = [
        {"lines": ["Slide One Content"]},
        {"lines": ["Slide One Content"]}, # Dup
        {"lines": ["Slide Two Content"]},
    ]
    pdf_path = create_sample_pdf(tmp_path, spec)
    res = analyze_duplicate_slides(pdf_path, similarity_threshold=0.85)

    out_unique_path = str(tmp_path / "out_unique.pdf")
    generate_unique_pdf(pdf_path, res["unique_pages"], out_unique_path)

    # Verify produced PDF
    doc = fitz.open(out_unique_path)
    assert len(doc) == 2
    assert "Slide One Content" in doc[0].get_text()
    assert "Slide Two Content" in doc[1].get_text()
    doc.close()

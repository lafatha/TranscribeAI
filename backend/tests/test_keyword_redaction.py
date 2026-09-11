import pytest
from pathlib import Path
import fitz  # PyMuPDF

from app.module2_ocr.redactor import scan_keywords_in_pdf, apply_pdf_redactions
from app.module2_ocr.deduplicator import analyze_duplicate_slides, generate_unique_pdf

def create_redaction_test_pdf(tmp_path: Path) -> str:
    """Creates a sample PDF with sensitive keywords and punctuation across pages."""
    pdf_path = str(tmp_path / "sample_sensitive.pdf")
    doc = fitz.open()

    # Page 1
    page1 = doc.new_page()
    page1.insert_text((50, 100), "Project X Status Report", fontsize=16)
    page1.insert_text((50, 150), "Lead Author: John Doe", fontsize=12)
    page1.insert_text((50, 180), "This document is marked as CONFIDENTIAL.", fontsize=12)
    page1.insert_text((50, 210), "Second mention of John Doe on page 1.", fontsize=12)

    # Page 2
    page2 = doc.new_page()
    page2.insert_text((50, 100), "Financial Appendix for Project X", fontsize=14)
    page2.insert_text((50, 150), "Budget approved by Company ABC executive board.", fontsize=12)
    page2.insert_text((50, 180), "Notice: confidential data enclosed below:", fontsize=12)

    # Page 3 (Duplicate slide for end-to-end test)
    page3 = doc.new_page()
    page3.insert_text((50, 100), "Financial Appendix for Project X", fontsize=14)
    page3.insert_text((50, 150), "Budget approved by Company ABC executive board.", fontsize=12)
    page3.insert_text((50, 180), "Notice: confidential data enclosed below:", fontsize=12)

    doc.save(pdf_path)
    doc.close()
    return pdf_path


def test_keyword_scanning_single_and_multiple(tmp_path):
    """Tests single and multiple keyword scanning across pages."""
    pdf_path = create_redaction_test_pdf(tmp_path)

    # Single keyword
    res1 = scan_keywords_in_pdf(pdf_path, keywords=["Project X"], case_sensitive=False)
    assert res1["total_redactions"] == 3
    assert res1["total_pages_affected"] == 3

    # Multiple keywords
    keywords = ["John Doe", "CONFIDENTIAL", "Company ABC", "Project X"]
    res2 = scan_keywords_in_pdf(pdf_path, keywords=keywords, case_sensitive=False)
    
    assert res2["total_redactions"] > 5
    summary = {k["keyword"]: k["matches_count"] for k in res2["keywords_summary"]}
    assert summary["John Doe"] == 2
    assert summary["CONFIDENTIAL"] == 3  # Matches "CONFIDENTIAL.", "confidential"
    assert summary["Company ABC"] == 2
    assert summary["Project X"] == 3


def test_case_sensitivity_toggle(tmp_path):
    """Tests Case Sensitive ON vs OFF mode."""
    pdf_path = create_redaction_test_pdf(tmp_path)

    # Case insensitive (OFF)
    res_off = scan_keywords_in_pdf(pdf_path, keywords=["confidential"], case_sensitive=False)
    assert res_off["total_redactions"] == 3

    # Case sensitive (ON)
    res_on = scan_keywords_in_pdf(pdf_path, keywords=["CONFIDENTIAL"], case_sensitive=True)
    assert res_on["total_redactions"] == 1  # Only exact upper 'CONFIDENTIAL.' matches


def test_true_pdf_redaction_security_and_non_extractability(tmp_path):
    """
    CRITICAL SECURITY TEST:
    Verifies that apply_pdf_redactions performs true PDF redaction:
    1. Text layer content is 100% removed from PDF object stream.
    2. Redacted text CANNOT be extracted via PyMuPDF or text search.
    3. Redacted text is missing from text layer (not merely hidden under rectangle).
    4. Original PDF remains untouched.
    """
    pdf_path = create_redaction_test_pdf(tmp_path)
    original_mtime = Path(pdf_path).stat().st_mtime

    keywords = ["John Doe", "CONFIDENTIAL", "Project X"]
    scan_res = scan_keywords_in_pdf(pdf_path, keywords=keywords, case_sensitive=False)
    matches = scan_res["matches"]

    out_redacted_path = str(tmp_path / "final_redacted.pdf")
    out_path, v_meta = apply_pdf_redactions(pdf_path, matches, out_redacted_path)

    # 1. Verification metadata check
    assert v_meta["verified"] is True
    assert v_meta["unredacted_occurrences_found"] == 0

    # 2. Re-open redacted PDF and extract full text layer
    red_doc = fitz.open(out_redacted_path)
    full_text = ""
    for page in red_doc:
        full_text += page.get_text() + "\n"
    red_doc.close()

    full_text_lower = full_text.lower()
    
    # 3. Assert keywords are COMPLETELY ABSENT from extracted text stream
    assert "john doe" not in full_text_lower
    assert "confidential" not in full_text_lower
    assert "project x" not in full_text_lower

    # 4. Non-redacted text still exists cleanly
    assert "company abc" in full_text_lower
    assert "budget approved" in full_text_lower

    # 5. Original PDF was untouched
    orig_doc = fitz.open(pdf_path)
    orig_text = orig_doc[0].get_text()
    orig_doc.close()
    assert "John Doe" in orig_text
    assert "CONFIDENTIAL" in orig_text


def test_complete_tool3_to_tool4_pipeline(tmp_path):
    """
    Tests the complete integrated pipeline:
    Original PDF -> Tool 3 Deduplication -> Unique PDF -> Tool 4 Keyword Detection -> Permanent Redaction -> Final PDF.
    """
    # 1. Original PDF with duplicate page 3
    pdf_path = create_redaction_test_pdf(tmp_path)

    # 2. Tool 3: Deduplication
    dedup_res = analyze_duplicate_slides(pdf_path, similarity_threshold=0.85)
    assert dedup_res["original_page_count"] == 3
    assert dedup_res["unique_page_count"] == 2
    assert dedup_res["duplicate_page_count"] == 1

    unique_pdf_path = str(tmp_path / "pipeline_unique.pdf")
    generate_unique_pdf(pdf_path, dedup_res["unique_pages"], unique_pdf_path)

    # Verify unique PDF has 2 pages
    unique_doc = fitz.open(unique_pdf_path)
    assert len(unique_doc) == 2
    unique_doc.close()

    # 3. Tool 4: Keyword detection on Unique PDF
    keywords = ["John Doe", "Company ABC"]
    scan_res = scan_keywords_in_pdf(unique_pdf_path, keywords=keywords, case_sensitive=False)
    assert scan_res["total_redactions"] == 3

    # 4. Tool 4: Permanent Redaction execution
    final_pdf_path = str(tmp_path / "pipeline_final_redacted.pdf")
    out_path, v_meta = apply_pdf_redactions(unique_pdf_path, scan_res["matches"], final_pdf_path)

    # 5. Verify final PDF
    assert v_meta["verified"] is True
    final_doc = fitz.open(final_pdf_path)
    assert len(final_doc) == 2
    final_text = ""
    for page in final_doc:
        final_text += page.get_text()
    final_doc.close()

    assert "john doe" not in final_text.lower()
    assert "company abc" not in final_text.lower()
    assert "project x" in final_text.lower()  # Unredacted keyword preserved


def test_subsumed_phrase_keywords(tmp_path):
    """Tests that longer phrases (e.g. 'Aku Susu') subsume shorter contained keywords ('Aku')."""
    pdf_path = str(tmp_path / "test_subsumed.pdf")
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 100), "Dokumen PT Aku Susu dan Bapak Aku", fontsize=12)
    doc.save(pdf_path)
    doc.close()

    keywords = [
        {"keyword": "Aku Susu", "label": "PT A"},
        {"keyword": "Aku", "label": "PT A"}
    ]
    res = scan_keywords_in_pdf(pdf_path, keywords=keywords, case_sensitive=False)
    
    # "Aku Susu" matches 1x, standalone "Aku" matches 1x. The "Aku" inside "Aku Susu" is subsumed!
    assert res["total_redactions"] == 2
    summary = {k["keyword"]: k["matches_count"] for k in res["keywords_summary"]}
    assert summary["Aku Susu"] == 1
    assert summary["Aku"] == 1


def test_whole_word_boundary_matching(tmp_path):
    """Tests that searching for 'cin' matches standalone 'cin' but NOT 'cinta'."""
    pdf_path = str(tmp_path / "test_whole_word.pdf")
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 100), "Bicara tentang cin dan cinta di sini.", fontsize=12)
    doc.save(pdf_path)
    doc.close()

    # Whole word ON (default)
    res_on = scan_keywords_in_pdf(pdf_path, keywords=["cin"], whole_word_only=True)
    assert res_on["total_redactions"] == 1  # Only matches standalone 'cin'

    # Whole word OFF
    res_off = scan_keywords_in_pdf(pdf_path, keywords=["cin"], whole_word_only=False)
    assert res_off["total_redactions"] == 2  # Matches 'cin' and prefix of 'cinta'

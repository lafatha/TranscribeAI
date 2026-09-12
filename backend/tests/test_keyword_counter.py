import pytest
from pathlib import Path
import fitz  # PyMuPDF
from app.module2_ocr.counter import analyze_pdf_keyword_counter

def create_counter_test_pdf(tmp_path: Path) -> str:
    """Creates a multi-page PDF with repeated words and phrases."""
    pdf_path = str(tmp_path / "counter_sample.pdf")
    doc = fitz.open()

    page1 = doc.new_page()
    page1.insert_text((50, 100), "jamilah aku tidak hey antek antek asheng", fontsize=14)
    page1.insert_text((50, 140), "aku tidak jamilah antek antek", fontsize=12)

    page2 = doc.new_page()
    page2.insert_text((50, 100), "hey asheng jamilah aku", fontsize=14)

    doc.save(pdf_path)
    doc.close()
    return pdf_path

def test_keyword_counter_basic(tmp_path):
    pdf_path = create_counter_test_pdf(tmp_path)
    res = analyze_pdf_keyword_counter(
        pdf_path=pdf_path,
        min_frequency=1,
        min_word_length=2,
        exclude_stopwords=False,
        include_phrases=False
    )

    assert res["total_words_scanned"] == 16
    assert "semicolon_formatted" in res
    
    # Verify semicolon output format (without numbers)
    semi = res["semicolon_formatted"]
    assert isinstance(semi, str)
    assert "jamilah" in semi
    assert "aku" in semi
    assert "tidak" in semi
    assert "hey" in semi
    assert "asheng" in semi
    # Check no numeric counts attached in semicolon string
    for word in semi.split(";"):
        assert not word.isdigit()

def test_keyword_counter_min_frequency(tmp_path):
    pdf_path = create_counter_test_pdf(tmp_path)
    res = analyze_pdf_keyword_counter(
        pdf_path=pdf_path,
        min_frequency=2,
        min_word_length=2,
        exclude_stopwords=False,
        include_phrases=False
    )
    # Words with count >= 2: jamilah (3), aku (3), tidak (2), hey (2), asheng (2)
    words = [k["word"] for k in res["keywords"]]
    assert "jamilah" in words
    assert "aku" in words
    assert "tidak" in words

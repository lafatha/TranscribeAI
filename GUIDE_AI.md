# AI Assistant Technical Execution Guide

This document is a technical reference for AI coding assistants (Claude, Gemini, GPT-4o, Codex, Antigravity, Cursor) working on this codebase.

---

## 🎯 Architecture & Data Flow Reference

### Tool 1: Video to Slide PDF Pipeline (`module1_video`)
1. **Video Ingestion**: `VideoFrameExtractor` in [`backend/app/module1_video/extractor.py`](file:///c:/Users/athal/gabriel/backend/app/module1_video/extractor.py) samples frames at base FPS (default 1.0–5.0 FPS).
2. **Keyframe Deduplication**: `process_and_deduplicate_slides` in [`backend/app/module1_video/deduplicator.py`](file:///c:/Users/athal/gabriel/backend/app/module1_video/deduplicator.py) computes SSIM, 64-bit dHash, and HSV color histogram differences.
3. **Perspective & PDF Compilation**: `build_slide_pdf` in [`backend/app/module1_video/pdf_builder.py`](file:///c:/Users/athal/gabriel/backend/app/module1_video/pdf_builder.py) detects presentation quad corners, applies 4-point perspective warp, and builds `slides.pdf`.

### Tool 2: PDF to Structured OCR Pipeline (`module2_ocr`)
1. **Hybrid Extraction**: `LocalOcrEngine.extract_page_ocr` in [`backend/app/module2_ocr/ocr_engine.py`](file:///c:/Users/athal/gabriel/backend/app/module2_ocr/ocr_engine.py) extracts native digital text layers via PyMuPDF (`page.get_text("dict")`) and vision text via PaddleOCR (`det_limit_side_len=1600`).
2. **Coordinate Normalization**: All bounding boxes `bbox` are normalized to 72 DPI PDF Points `[x0, y0, x1, y1]`. Pixel coordinates for 200 DPI images are stored in `bbox_px`.
3. **Layout & Graphics Segmentation**: `analyze_page_layout_and_graphics` in [`backend/app/module2_ocr/layout_analyzer.py`](file:///c:/Users/athal/gabriel/backend/app/module2_ocr/layout_analyzer.py) isolates tables and chart crops.
4. **Structured Exporters**: `generate_structured_outputs` in [`backend/app/module2_ocr/structured_exporter.py`](file:///c:/Users/athal/gabriel/backend/app/module2_ocr/structured_exporter.py) outputs Searchable PDF, Formatted PDF Report, Markdown, and JSON.
5. **Search Indexing**: `index_ocr_document` in [`backend/app/module2_ocr/search_service.py`](file:///c:/Users/athal/gabriel/backend/app/module2_ocr/search_service.py) indexes text blocks into SQLite FTS5 database.

---

## 💻 Quick Reference Commands

```bash
# Run backend server
cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# Run frontend server
cd frontend && npm run dev

# Run full backend test suite
python -m pytest backend/tests/

# Check frontend TypeScript types
cd frontend && npx tsc --noEmit
```

---

## 📜 System Guidelines Link
See [AGENTS.md](file:///c:/Users/athal/gabriel/AGENTS.md) for mandatory coding guidelines, coordinate standards, and UI rules.

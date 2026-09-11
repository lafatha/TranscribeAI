# AGENTS.md — System & Architectural Guidelines for AI Agents

> **IMPORTANT FOR ALL AI ASSISTANTS (Claude, Gemini, GPT, Codex, Cursor, Antigravity)**:
> This document defines the MANDATORY architecture, design standards, coordinate systems, and engineering rules for this repository (`gabriel`). Read and strictly adhere to all guidelines below before modifying or generating code.

---

## 🏛 1. Core Architecture Overview

This project is a 100% self-hosted, offline Document & Video Intelligence Engine consisting of two core modules:

```
                  ┌─────────────────────────────────────────────────────────┐
                  │                 Gabriel Architecture                    │
                  └────────────────────────────┬────────────────────────────┘
                                               │
               ┌───────────────────────────────┴───────────────────────────────┐
               ▼                                                               ▼
  Tool 1: Video → Slide PDF (`module1_video`)                    Tool 2: PDF → Structured OCR (`module2_ocr`)
  - Base sampling @ 5 FPS + Burst transition detection           - 72 DPI PDF Point Coordinate Standardization
  - SSIM + dHash + Color Hist deduplication                      - Hybrid Digital (PyMuPDF) + PaddleOCR Vision
  - Quality score (Laplacian, gradient, contrast)                 - Spatial IoU deduplication & completeness metrics
  - 4-point Perspective Quad Warp & PDF Compile                   - Searchable PDF, Markdown & JSON Exporters
```

* **Backend**: Python 3.14 + FastAPI + PyMuPDF + PaddleOCR / RapidOCR + OpenCV + SQLite (WAL mode & FTS5 search index).
* **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + Lucide React + HTML5 Canvas Bounding Box Visualizer.
* **Storage**: 100% local, air-gapped file system (`data/raw`, `data/processed`, `data/crops`, `data/debug`, `data/exports`).

---

## 🎯 2. CRITICAL ENGINEERING RULES

### Rule A: Coordinate System Standard (72 DPI PDF Points)
* **Standard**: ALL bounding boxes returned in `elements` arrays MUST be expressed in **72 DPI PDF Points**: `[x0, y0, x1, y1]`.
* **Rationale**: PyMuPDF page geometry and PDF viewers render natively at 72 points per inch. Normalizing all bounding boxes at extraction time eliminates DPI scaling drift (e.g. 150 vs 200 DPI mismatches) across exporters and UI overlays.
* **Pixel Coords (`bbox_px`)**: For OpenCV image operations (200 DPI), store pixel coordinates in `bbox_px: [px0, py0, px1, py1]` alongside `bbox`.
* **Searchable PDF**: In [`structured_exporter.py`](file:///c:/Users/athal/gabriel/backend/app/module2_ocr/structured_exporter.py), `fitz.Rect(x0, y0, x1, y1)` MUST be used directly without re-scaling!

### Rule B: OCR Extraction Completeness (Hybrid Extraction)
* **Digital Layer Extraction**: Always extract native digital text using PyMuPDF (`page.get_text("dict")`) first. Digital text provides 100% precision with exact PDF Point bounding boxes.
* **Vision OCR (PaddleOCR)**: Run PaddleOCR on the rasterized page image (200 DPI) with `det_limit_side_len=1600` for sub-second execution speed.
* **Spatial IoU Deduplication**: Merge PyMuPDF digital text and PaddleOCR vision text using intersection-over-area (`compute_box_intersection_ratio > 0.4`).
  * Text present in native digital PDF layers is preserved natively.
  * Text in scanned images, diagrams, infographics, or flattened slide graphics is captured by PaddleOCR.
  * Zero dropped text, zero duplicates.

### Rule C: UI Design Standards (ChatGPT Dark Minimalist)
* **No Emoticons / Emojis**: NEVER use emojis (`🚀`, `✨`, `⚡`, `📌`, etc.) in text or UI buttons. Use Lucide React icons (`Video`, `FileText`, `Plus`, `Search`, `Download`, `Eye`, `Check`) exclusively.
* **No Slop / Verbose Text**: Avoid verbose instructions like *"Click any slide card to open full-screen preview with keyboard navigation (← / →)"* or pulsing green dots (`animate-pulse`). Keep headers clean, e.g. `261 Slides` or `57 Pages`.
* **Direct History Session View**: Clicking any item in the `History` sidebar MUST immediately load that document session (`selectedJobId`) and render the **Session View (PDF Viewer & Extracted Results)**. NEVER default back to an empty upload dropzone when a history session is selected!
* **Aesthetics**: Dark minimal palette (`#0d0d10` canvas, `#131316` sidebar, `#17171a` panels).

---

## 📂 3. Repository Directory Layout

```
gabriel/
├── AGENTS.md                     # THIS FILE — Mandatory Guidelines for AI Assistants
├── README.md                     # System Overview & Quick Start
├── GUIDE_AI.md                   # Concise Technical Reference for AI Coding Assistants
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI Entrypoint & Queue Handlers
│   │   ├── config.py             # System Paths & Thresholds
│   │   ├── database.py           # SQLite Database & Migration Schema
│   │   ├── module1_video/        # Video to Slide PDF Conversion Engine
│   │   │   ├── extractor.py      # OpenCV Video Frame Extractor
│   │   │   ├── deduplicator.py   # SSIM + dHash + Color Hist Deduplicator
│   │   │   └── pdf_builder.py    # Perspective Warp & PDF Compiler
│   │   ├── module2_ocr/          # PDF to Structured OCR Engine
│   │   │   ├── ocr_engine.py     # LocalOcrEngine (PyMuPDF + PaddleOCR Hybrid)
│   │   │   ├── layout_analyzer.py# OpenCV Table & Chart Segmenter
│   │   │   ├── structured_exporter.py # Searchable PDF, Markdown & JSON Exporters
│   │   │   └── search_service.py # SQLite FTS5 Full-Text Search Engine
│   │   └── queue/                # SQLite Background Job Queue
│   └── tests/
│       ├── test_system.py        # End-to-End System Test Suite
│       ├── test_cancellation.py  # Job Cancellation Test
│       ├── test_security.py      # Path Traversal & Sanitization Test
│       ├── test_stress_memory.py# Memory Leak Stress Test
│       └── benchmark.py          # Frame Rate & SSIM Benchmark
└── frontend/
    └── src/
        ├── app/                  # Next.js App Router Entrypoint
        ├── components/
        │   ├── Sidebar.tsx       # ChatGPT-style History Sidebar
        │   ├── Tool1VideoToPdf.tsx # Video Session & Slide Inspector
        │   ├── Tool2PdfToOcr.tsx   # PDF OCR Session & Bbox Visualizer
        │   ├── PdfViewer.tsx     # Embedded Interactive PDF Previewer
        │   ├── LocalSearch.tsx   # Search UI Component
        │   └── BatchQueue.tsx    # Background Queue Inspector
        └── lib/
            └── api.ts            # REST API Client & TypeScript Interfaces
```

---

## 🛠 4. Development & Verification Commands

### Run Backend Tests (Pytest)
```bash
cd backend
python -m pytest tests/
```
*Expected Output*: `6 passed in ~6-7s`. All backend tests MUST pass before declaring success.

### Check Frontend TypeScript Compilation
```bash
cd frontend
npx tsc --noEmit
```
*Expected Output*: Exit code `0` with 0 errors.

### Launch Local Development Servers
```bash
# Terminal 1: Backend
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

---

## 📝 5. Data Schema References

### OCR Element Schema (`elements` array)
```json
{
  "text": "Executive Summary 2026",
  "bbox": [30.5, 45.2, 280.0, 72.8],     // 72 DPI PDF Points [x0, y0, x1, y1]
  "bbox_px": [85, 125, 777, 202],       // 200 DPI Pixels [px0, py0, px1, py1]
  "confidence": 0.98,
  "type": "title"                       // "title" | "paragraph"
}
```

### Page Metrics Schema (`metrics` object)
```json
{
  "page": 1,
  "detected_boxes_count": 18,
  "recognized_lines_count": 18,
  "avg_confidence": 0.96,
  "min_confidence": 0.88,
  "total_chars": 1240,
  "total_words": 185,
  "page_coverage_pct": 24.5,
  "processing_time_sec": 0.68
}
```

---

## 🛑 6. Anti-Patterns & Strict Prohibitions

1. **DO NOT** multiply bounding box coordinates by arbitrary scale factors (e.g. `* scale_w`) in exporters. Use 72 DPI PDF Points directly.
2. **DO NOT** use emojis or decorative unicode icons in text strings or UI components. Use `lucide-react` icons.
3. **DO NOT** clear active job results or show empty upload dropzones when a user clicks an item in the History sidebar.
4. **DO NOT** suppress error logs or pass failing tests by dummy returns. Fix root causes empirically.
5. **DO NOT** break existing API contracts or test suites. Always verify with `pytest` and `tsc --noEmit`.

<!-- Agent execution and context guidelines -->


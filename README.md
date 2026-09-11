# Transcribe AI — Offline Presentation Video & Document Intelligence Engine

A **100% self-hosted, air-gapped presentation processing & OCR system** designed to convert presentation screen recordings into clean slide PDFs (Tool 1) and extract structured, searchable data from presentation PDFs using high-precision PaddleOCR & PyMuPDF (Tool 2).

---

## Key Features & Architecture

### Tool 1 — Video → Clean Slide PDF (`module1_video`)
- **Smartphone Recording Handling**: Quad warp perspective correction for tilted screens, camera jitter filtering, and lighting change tolerance.
- **Adaptive Frame Sampling**: 5 FPS base sampling rate with dynamic transition burst detection.
- **Multi-Metric Deduplication**: Combines SSIM, 64-bit Perceptual Hash (dHash), and HSV Color Histograms (`DUPLICATE_THRESHOLD = 0.75`).
- **Quality-Based Keyframe Selection**: Ranks frames by Laplacian variance sharpness, Tenengrad gradient, exposure, and stability.
- **Clean PDF Compiler**: Outputs high-res `slides.pdf` with precise timestamp mappings (`00:00:34.733`).

### Tool 2 — PDF → Structured OCR (`module2_ocr`)
- **72 DPI PDF Point Coordinate Standardization**: All extracted element bounding boxes `[x0, y0, x1, y1]` are standardized to native 72 DPI PDF Points. Eliminates scaling drift and ensures 1:1 pixel-perfect text placement in Searchable PDFs and web overlays.
- **Hybrid Digital + Vision Extraction**: Combines PyMuPDF native digital text layer extraction (`page.get_text("dict")`) with PaddleOCR vision detection (`det_limit_side_len=1600`) via spatial IoU deduplication.
  - Native digital text layers are captured with 100% precision.
  - Scanned graphics, diagram labels, and flattened slide text are captured by PaddleOCR.
  - Sub-second processing latency per page on standard CPU.
- **Layout & Visual Crop Segmentation**: Isolates titles, paragraphs, tables, bar/line/pie charts, and diagrams.
- **Multi-Format Exporters**:
  - `searchable.pdf`: Searchable PDF with invisible selectable text layer overlay (`render_mode=3`).
  - `report.pdf`: Formatted PDF document report with titles and embedded table graphics.
  - `output.md`: AI-readable Markdown with table structures.
  - `output.json`: Structured page-by-page bounding box schema.
- **SQLite FTS5 Local Search**: Full-text search engine indexing presentation transcripts with instant snippet highlights.

---

## 💻 Tech Stack

* **Backend**: Python 3.14, FastAPI, PyMuPDF (fitz), PaddleOCR, RapidOCR, OpenCV, SQLite (WAL mode + FTS5).
* **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide React, HTML5 Canvas Visualizer.

---

## 🚀 Quick Start Guide

### 1. Launch Backend Server
```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 2. Launch Web UI
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Verification

### Run End-to-End Test Suite
```bash
python -m pytest backend/tests/
```
*Expected Output*: `6 passed in ~6.9s`.

### Verify Frontend TypeScript Types
```bash
cd frontend
npx tsc --noEmit
```

---

## 🤖 Instructions for AI Coding Assistants
Refer to [AGENTS.md](file:///c:/Users/athal/gabriel/AGENTS.md) for architectural guidelines, coordinate conventions, and UI design rules.

<!-- Technical documentation & architecture setup guidelines -->


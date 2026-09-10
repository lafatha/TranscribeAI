# Offline Presentation Video & Document Intelligence System

A **100% self-hosted, completely offline document processing system** designed to convert smartphone recordings of presentation screens into clean slide PDFs (Tool 1) and extract structured AI-readable Markdown and JSON data from presentation PDFs (Tool 2).

---

## 🌟 Key Architecture & Capabilities

### Tool 1 — Video → Clean Slide PDF (`module1_video`)
- **Smartphone Recording Handling**: Perspective distortion, camera movement, focus shifts, screen glare, motion blur.
- **Adaptive Frame Sampling**: 5 FPS base rate with dynamic burst sampling around detected transitions.
- **Multi-Metric Slide Change Detection**: Combines SSIM, 64-bit Perceptual Hash (dHash), HSV Color Histogram distance, and Canny Edge difference to differentiate camera jitter from true slide changes.
- **Deduplication Engine**: Configurable threshold `DUPLICATE_THRESHOLD` (0.70 to 0.90, default 0.75).
- **Best-Frame Quality Scoring**: Laplacian variance sharpness, Tenengrad gradient, exposure, contrast, and stability metrics.
- **4-Point Perspective Warp**: Detects presentation screen quad and rectifies keystone distortion, with safe margin fallback.
- **Clean PDF Compiler & Metadata**: Generates high-res `slides.pdf`, timestamp mapping (`00:00:34.733`), and metadata JSON.

### Tool 2 — PDF → Structured OCR (`module2_ocr`)
- **100% Offline OCR**: PyMuPDF fast text rendering + EasyOCR / Tesseract fallback for scanned slides.
- **Layout & Graphic Segmentation**: Detects titles, paragraphs, tables, bar/line/pie charts, diagrams, infographics.
- **Non-Hallucinating Exporter**:
  - `output.md`: AI-readable Markdown with table structure and visual references.
  - `output.json`: Detailed page-by-page bounding box schema.
  - `output.txt`: Clean text for search.
- **Quality Control**: Flags slides with mean confidence < `OCR_REVIEW_THRESHOLD` (0.75) as `[Needs Review]`.
- **Local Full-Text Search**: SQLite `FTS5` engine indexing all presentation transcripts with snippet highlights and slide image references.

---

## 🚀 Quick Start Guide

### 1. Start FastAPI Backend
```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 2. Start Next.js Enterprise Web UI
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Benchmarking

### Run Automated End-to-End Pipeline Test
```bash
python backend/tests/test_system.py
```

### Run Performance & Deduplication Benchmark
```bash
python backend/tests/benchmark.py
```

---

## 🔒 Air-Gapped Deployment
See [offline/README_OFFLINE.md](file:///c:/Users/athal/gabriel/offline/README_OFFLINE.md) for instructions on packaging offline wheels, Docker images, and deploying to disconnected environments.

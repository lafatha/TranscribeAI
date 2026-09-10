# AI Execution & Deployment Guide

This document is formatted as a direct, explicit instruction guide for AI coding assistants or developers to run, operate, and verify the project seamlessly.

---

## 🎯 System Intent & Architecture Overview

- **Engine Purpose**: Self-hosted, 100% offline document intelligence system consisting of two independent modules:
  - **Tool 1 (`module1_video`)**: Video → Clean Slide PDF Converter.
  - **Tool 2 (`module2_ocr`)**: PDF → Structured OCR & Visual Asset Cropper.
- **Backend Architecture**: Python FastAPI on `http://localhost:8000`, SQLite (WAL mode) database, OpenCV video decoder, PyMuPDF PDF compiler, and SQLite FTS5 search index.
- **Frontend Stack**: Next.js 14 (App Router) on `http://localhost:3000`, Tailwind CSS, Lucide icons.

---

## 🚀 Execution & Command Reference

### 1. Launch Backend Server
```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 2. Launch Web Frontend UI
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000`.

### 3. Run Automated System Test Suite
```bash
python -m pytest backend/tests/
```
Expected Output: `6 passed in ~5.8s`.

### 4. Run Performance & Deduplication Benchmark
```bash
python backend/tests/benchmark.py
```
Expected Output: Throughput `~390 FPS`, deduplication ratio `~90%`.

---

## 📂 Key File Locations

- **Backend Entrypoint**: [backend/app/main.py](file:///c:/Users/athal/gabriel/backend/app/main.py)
- **Video Processing Engine**: [backend/app/module1_video/deduplicator.py](file:///c:/Users/athal/gabriel/backend/app/module1_video/deduplicator.py)
- **Local OCR Engine**: [backend/app/module2_ocr/ocr_engine.py](file:///c:/Users/athal/gabriel/backend/app/module2_ocr/ocr_engine.py)
- **Frontend Dashboard**: [frontend/src/components/DashboardHome.tsx](file:///c:/Users/athal/gabriel/frontend/src/components/DashboardHome.tsx)
- **Tool 1 Component**: [frontend/src/components/Tool1VideoToPdf.tsx](file:///c:/Users/athal/gabriel/frontend/src/components/Tool1VideoToPdf.tsx)
- **Tool 2 Component**: [frontend/src/components/Tool2PdfToOcr.tsx](file:///c:/Users/athal/gabriel/frontend/src/components/Tool2PdfToOcr.tsx)
- **Offline Packager**: [offline/download_models.py](file:///c:/Users/athal/gabriel/offline/download_models.py)

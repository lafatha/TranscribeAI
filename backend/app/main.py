import time
import os
import fitz  # PyMuPDF
from pathlib import Path
from typing import Dict, Any, Tuple
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import DATA_DIR, UPLOAD_DIR, PROCESSED_DIR, EXPORT_DIR, CROPS_DIR, DEFAULT_DUPLICATE_THRESHOLD, DEFAULT_OCR_REVIEW_THRESHOLD
from app.database import init_db, save_job_slides, get_job
from app.models import JobType, JobStatus
from app.queue_manager import queue_manager

from app.module1_video.extractor import VideoFrameExtractor
from app.module1_video.deduplicator import process_and_deduplicate_slides
from app.module1_video.pdf_builder import build_slide_pdf

from app.module2_ocr.ocr_engine import LocalOcrEngine
from app.module2_ocr.layout_analyzer import analyze_page_layout_and_graphics
from app.module2_ocr.structured_exporter import generate_structured_outputs
from app.module2_ocr.search_service import index_ocr_document

from app.api.video_routes import router as video_router
from app.api.ocr_routes import router as ocr_router
from app.api.batch_routes import router as batch_router
from app.api.search_routes import router as search_router


# ----------------------------------------------------
# CANCELLATION CHECK HELPER
# ----------------------------------------------------
def is_job_cancelled(job_id: str) -> bool:
    job = get_job(job_id)
    return job is not None and job.get("status") == JobStatus.CANCELLED.value


# ----------------------------------------------------
# JOB HANDLER IMPLEMENTATIONS
# ----------------------------------------------------

def handle_video_to_pdf_job(
    job_id: str,
    file_path: str,
    params: Dict[str, Any],
    progress_callback
) -> Tuple[str, Dict[str, Any]]:
    """Tool 1: Video -> Clean Slide PDF processing handler."""
    t0 = time.time()
    progress_callback(0.05, "Opening presentation video stream...")

    dup_thresh = params.get("duplicate_threshold", DEFAULT_DUPLICATE_THRESHOLD)
    base_fps = params.get("sample_fps", 5.0)

    extractor = VideoFrameExtractor(file_path, base_fps=base_fps)
    v_info = extractor.get_info()
    progress_callback(0.15, f"Decoding video stream ({v_info['width']}x{v_info['height']}, {v_info['total_frames']} total frames)...")

    # Sample frames incrementally generator
    frame_stream = extractor.extract_sampled_frames(sample_fps=base_fps)
    
    slides = process_and_deduplicate_slides(
        frame_stream=frame_stream,
        total_frames_est=int(v_info["total_frames"] / max(1, v_info["fps"] / base_fps)),
        duplicate_threshold=dup_thresh,
        progress_callback=progress_callback,
        check_cancelled=lambda: is_job_cancelled(job_id)
    )

    extractor.close()

    if is_job_cancelled(job_id):
        raise InterruptedError("Job cancelled by user")

    # Save initial slide review state to DB
    save_job_slides(job_id, slides)

    progress_callback(0.85, f"Compiling PDF from {len(slides)} unique detected slides...")
    output_pdf_path = str(PROCESSED_DIR / f"{job_id}_slides.pdf")
    
    elapsed = time.time() - t0
    out_pdf, metadata = build_slide_pdf(slides, output_pdf_path, v_info, elapsed)

    progress_callback(1.0, f"Completed: {len(slides)} unique slides extracted in {round(elapsed, 1)}s.")
    return out_pdf, metadata


def handle_pdf_to_ocr_job(
    job_id: str,
    file_path: str,
    params: Dict[str, Any],
    progress_callback
) -> Tuple[str, Dict[str, Any]]:
    """Tool 2: PDF -> Structured OCR processing handler."""
    t0 = time.time()
    progress_callback(0.05, "Loading PDF document...")

    ocr_review_thresh = params.get("ocr_review_threshold", DEFAULT_OCR_REVIEW_THRESHOLD)
    ocr_engine = LocalOcrEngine()

    doc = fitz.open(file_path)
    total_pages = len(doc)
    doc_name = Path(file_path).name

    page_results = []

    for i in range(total_pages):
        if is_job_cancelled(job_id):
            doc.close()
            raise InterruptedError("Job cancelled by user during OCR")

        p_num = i + 1
        progress_callback(
            0.10 + 0.75 * ((i + 1) / total_pages),
            f"Processing Page {p_num}/{total_pages} (OCR & Layout Analysis)..."
        )

        page = doc[i]
        elements, page_img, page_metrics = ocr_engine.extract_page_ocr(page, p_num, job_id=job_id)
        elements, visuals = analyze_page_layout_and_graphics(page_img, p_num, elements, job_id)

        page_results.append({
            "page": p_num,
            "elements": elements,
            "visuals": visuals,
            "metrics": page_metrics
        })


    doc.close()

    if is_job_cancelled(job_id):
        raise InterruptedError("Job cancelled by user")

    progress_callback(0.90, "Exporting Searchable PDF, Formatted PDF Report & Markdown...")
    md_path, json_path, txt_path, searchable_pdf_path, pdf_report_path, review_count = generate_structured_outputs(
        doc_name=doc_name,
        pdf_path=file_path,
        page_results=page_results,
        ocr_review_threshold=ocr_review_thresh
    )

    progress_callback(0.95, "Indexing slides into local search database...")
    index_ocr_document(doc_name, file_path, page_results)

    meta = {
        "document_name": doc_name,
        "total_pages": total_pages,
        "markdown_path": md_path,
        "json_path": json_path,
        "txt_path": txt_path,
        "searchable_pdf_path": searchable_pdf_path,
        "pdf_report_path": pdf_report_path,
        "needs_review_count": review_count,
        "processing_time_seconds": round(time.time() - t0, 2),
        "pages": page_results
    }

    progress_callback(1.0, f"OCR completed: {total_pages} pages processed ({review_count} flagged for review).")
    return md_path, meta


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    queue_manager.register_handler(JobType.VIDEO_TO_PDF, handle_video_to_pdf_job)
    queue_manager.register_handler(JobType.PDF_TO_OCR, handle_pdf_to_ocr_job)
    queue_manager.start()
    yield
    queue_manager.stop()

app = FastAPI(
    title="Document Intelligence Engine (Video → Slide PDF & Structured OCR)",
    description="100% Offline, Self-Hosted Presentation Video to Slide PDF Converter and Local OCR Engine.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static media routes
app.mount("/data", StaticFiles(directory=str(DATA_DIR)), name="data")

# Register API Routers
app.include_router(video_router)
app.include_router(ocr_router)
app.include_router(batch_router)
app.include_router(search_router)

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "offline": True}

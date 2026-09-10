import os
import shutil
import time
from pathlib import Path
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse

from app.config import UPLOAD_DIR, PROCESSED_DIR, DEFAULT_DUPLICATE_THRESHOLD, DEFAULT_BASE_SAMPLE_FPS, MAX_VIDEO_SIZE_BYTES, sanitize_filename
from app.models import JobType, JobStatus
from app.queue_manager import queue_manager
from app.database import get_job, get_job_slides, save_job_slides, save_job
from app.module1_video.pdf_builder import build_slide_pdf

router = APIRouter(prefix="/api/video", tags=["Tool 1: Video to PDF"])

ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".mkv", ".avi"}

@router.post("/process")
async def process_video(
    file: UploadFile = File(...),
    duplicate_threshold: float = Form(DEFAULT_DUPLICATE_THRESHOLD),
    sample_fps: float = Form(DEFAULT_BASE_SAMPLE_FPS)
):
    """Enqueues Tool 1 (Video to Slide PDF) processing job with security sanitization."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Invalid file upload: Missing filename")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format: {ext}. Allowed formats: MP4, MOV, MKV, AVI"
        )

    # Validate duplicate threshold bounds
    if not (0.50 <= duplicate_threshold <= 0.98):
        raise HTTPException(status_code=400, detail="duplicate_threshold must be between 0.50 and 0.98")

    # Secure filename
    safe_name = sanitize_filename(file.filename)
    video_path = UPLOAD_DIR / safe_name

    # Save file and enforce size limits
    total_size = 0
    with open(video_path, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):
            total_size += len(chunk)
            if total_size > MAX_VIDEO_SIZE_BYTES:
                buffer.close()
                if video_path.exists():
                    os.remove(video_path)
                raise HTTPException(status_code=413, detail="Video file exceeds 2 GB size limit")
            buffer.write(chunk)

    if total_size == 0:
        if video_path.exists():
            os.remove(video_path)
        raise HTTPException(status_code=400, detail="Uploaded file is empty (0 bytes)")

    job_id = queue_manager.add_job(
        job_type=JobType.VIDEO_TO_PDF,
        file_path=str(video_path),
        params={
            "duplicate_threshold": duplicate_threshold,
            "sample_fps": sample_fps,
            "original_filename": Path(file.filename).name,
            "sanitized_filename": safe_name
        }
    )

    return {"job_id": job_id, "status": JobStatus.QUEUED.value, "message": "Video queued for processing"}

@router.get("/slides/{job_id}")
async def get_slides_for_review(job_id: str):
    """Retrieves detected slide candidates for user review in UI."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    slides = get_job_slides(job_id)
    return {
        "job_id": job_id,
        "status": job["status"],
        "progress": job["progress"],
        "message": job["message"],
        "metadata": job.get("metadata_json"),
        "output_pdf": job.get("output_path"),
        "slides": slides
    }

@router.post("/slides/{job_id}/update")
async def update_slide_selection(job_id: str, slides: List[Dict[str, Any]]):
    """Updates selected/deleted slide states from Slide Inspector UI."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    save_job_slides(job_id, slides)
    return {"status": "success", "message": "Slide selection updated"}

@router.post("/slides/{job_id}/rebuild")
async def rebuild_pdf_from_slides(job_id: str):
    """Re-compiles PDF using currently selected slides."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    all_slides = get_job_slides(job_id)
    selected = [s for s in all_slides if s.get("is_selected", 1) == 1]

    if not selected:
        raise HTTPException(status_code=400, detail="No slides selected for PDF")

    pdf_out = PROCESSED_DIR / f"{job_id}_slides.pdf"
    video_meta = job.get("metadata_json") or {}

    t0 = time.time()
    out_path, meta = build_slide_pdf(selected, str(pdf_out), video_meta, time.time() - t0)

    job["output_path"] = out_path
    if not job.get("metadata_json"):
        job["metadata_json"] = {}
    job["metadata_json"].update(meta)
    save_job(job)

    return {"output_pdf": out_path, "metadata": meta}

import os
import shutil
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse

from app.config import UPLOAD_DIR, DEFAULT_OCR_REVIEW_THRESHOLD, MAX_PDF_SIZE_BYTES, sanitize_filename
from app.models import JobType, JobStatus
from app.queue_manager import queue_manager
from app.database import get_job

router = APIRouter(prefix="/api/ocr", tags=["Tool 2: PDF to Structured OCR"])

@router.post("/process")
async def process_pdf_ocr(
    file: UploadFile = File(...),
    ocr_review_threshold: float = Form(DEFAULT_OCR_REVIEW_THRESHOLD)
):
    """Enqueues Tool 2 (PDF to Structured OCR) job with security sanitization."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Must be a valid PDF file (.pdf)")

    if not (0.50 <= ocr_review_threshold <= 0.98):
        raise HTTPException(status_code=400, detail="ocr_review_threshold must be between 0.50 and 0.98")

    safe_name = sanitize_filename(file.filename)
    pdf_path = UPLOAD_DIR / safe_name

    total_size = 0
    with open(pdf_path, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):
            total_size += len(chunk)
            if total_size > MAX_PDF_SIZE_BYTES:
                buffer.close()
                if pdf_path.exists():
                    os.remove(pdf_path)
                raise HTTPException(status_code=413, detail="PDF file exceeds 200 MB size limit")
            buffer.write(chunk)

    if total_size == 0:
        if pdf_path.exists():
            os.remove(pdf_path)
        raise HTTPException(status_code=400, detail="Uploaded PDF file is empty (0 bytes)")

    job_id = queue_manager.add_job(
        job_type=JobType.PDF_TO_OCR,
        file_path=str(pdf_path),
        params={
            "ocr_review_threshold": ocr_review_threshold,
            "original_filename": Path(file.filename).name,
            "sanitized_filename": safe_name
        }
    )

    return {"job_id": job_id, "status": JobStatus.QUEUED.value, "message": "PDF queued for OCR processing"}

@router.get("/result/{job_id}")
async def get_ocr_results(job_id: str):
    """Retrieves structured OCR results, page layout data, and export paths."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    meta = job.get("metadata_json") or {}
    return {
        "job_id": job_id,
        "status": job["status"],
        "progress": job["progress"],
        "message": job["message"],
        "file_path": job["file_path"],
        "markdown_path": meta.get("markdown_path"),
        "json_path": meta.get("json_path"),
        "txt_path": meta.get("txt_path"),
        "searchable_pdf_path": meta.get("searchable_pdf_path"),
        "pdf_report_path": meta.get("pdf_report_path"),
        "needs_review_count": meta.get("needs_review_count", 0),
        "total_pages": meta.get("total_pages", 0),
        "pages": meta.get("pages", [])
    }

@router.get("/export/{job_id}/{fmt}")
async def export_ocr_file(job_id: str, fmt: str, inline: bool = False):
    """Downloads or views exported structured file (.md, .json, .txt, .pdf searchable, .pdf report, original)."""
    job = get_job(job_id)
    if not job or job["status"] != JobStatus.COMPLETED.value:
        raise HTTPException(status_code=404, detail="Job not ready or failed")

    meta = job.get("metadata_json") or {}
    
    if fmt == "markdown" or fmt == "md":
        target = meta.get("markdown_path")
        media_type = "text/markdown"
    elif fmt == "json":
        target = meta.get("json_path")
        media_type = "application/json"
    elif fmt == "txt":
        target = meta.get("txt_path")
        media_type = "text/plain"
    elif fmt == "pdf" or fmt == "searchable":
        target = meta.get("searchable_pdf_path")
        media_type = "application/pdf"
    elif fmt == "report":
        target = meta.get("pdf_report_path")
        media_type = "application/pdf"
    elif fmt == "original":
        target = job.get("file_path")
        media_type = "application/pdf"
    else:
        raise HTTPException(status_code=400, detail="Invalid format type. Allowed: md, json, txt, pdf, report, original")

    if not target or not Path(target).exists():
        raise HTTPException(status_code=404, detail="Export file not found")

    disp = "inline" if inline else "attachment"
    return FileResponse(
        path=target,
        media_type=media_type,
        filename=Path(target).name,
        content_disposition_type=disp
    )


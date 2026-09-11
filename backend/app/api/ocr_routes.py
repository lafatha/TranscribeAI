import os
import json
from pathlib import Path
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse

from app.config import UPLOAD_DIR, PROCESSED_DIR, DEFAULT_OCR_REVIEW_THRESHOLD, MAX_PDF_SIZE_BYTES, sanitize_filename
from app.models import JobType, JobStatus
from app.queue_manager import queue_manager
from app.database import get_job, update_job_metadata
from app.module2_ocr.deduplicator import analyze_duplicate_slides, generate_unique_pdf
from app.module2_ocr.redactor import scan_keywords_in_pdf, apply_pdf_redactions

router = APIRouter(prefix="/api/ocr", tags=["Tool 2: PDF to Structured OCR & Tool 3/4 Pipeline"])

class DetectDuplicatesRequest(BaseModel):
    similarity_threshold: Optional[float] = 0.85

class GenerateUniquePdfRequest(BaseModel):
    unique_pages: List[int]

class ScanRedactionsRequest(BaseModel):
    keywords: List[str]
    case_sensitive: Optional[bool] = False
    use_unique_pdf: Optional[bool] = True

class ApplyRedactionsRequest(BaseModel):
    matches: List[Dict[str, Any]]
    use_unique_pdf: Optional[bool] = True

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
        "unique_pdf_path": meta.get("unique_pdf_path"),
        "redacted_pdf_path": meta.get("redacted_pdf_path"),
        "duplicate_analysis": meta.get("duplicate_analysis"),
        "redaction_verification": meta.get("redaction_verification"),
        "needs_review_count": meta.get("needs_review_count", 0),
        "total_pages": meta.get("total_pages", 0),
        "pages": meta.get("pages", [])
    }

# ----------------------------------------------------
# TOOL 3: DUPLICATE SLIDE DETECTION & REMOVAL ROUTES
# ----------------------------------------------------
@router.post("/direct-detect-duplicates")
async def direct_detect_duplicates(
    file: UploadFile = File(...),
    similarity_threshold: float = Form(0.85)
):
    """Fast Tool 3 direct PDF upload duplicate detector (uses native PDF text layer, NO vision OCR queue required!)."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Must be a valid PDF file (.pdf)")

    safe_name = sanitize_filename(file.filename)
    pdf_path = UPLOAD_DIR / safe_name

    with open(pdf_path, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):
            buffer.write(chunk)

    result = analyze_duplicate_slides(
        pdf_path=str(pdf_path),
        page_results=None,
        similarity_threshold=similarity_threshold
    )

    job_id = f"direct_{safe_name.replace('.', '_')}"
    out_unique_path = str(PROCESSED_DIR / f"{job_id}_unique.pdf")
    generate_unique_pdf(str(pdf_path), result["unique_pages"], out_unique_path)

    return {
        "job_id": job_id,
        "file_path": str(pdf_path),
        "filename": safe_name,
        "unique_pdf_path": out_unique_path,
        "duplicate_analysis": result
    }


@router.post("/{job_id}/detect-duplicates")
async def detect_duplicates(job_id: str, body: Optional[DetectDuplicatesRequest] = None):
    """Tool 3: Analyzes document pages and detects duplicate slides."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    pdf_path = job.get("file_path")
    if not pdf_path or not Path(pdf_path).exists():
        raise HTTPException(status_code=404, detail="Source PDF file not found")

    meta = job.get("metadata_json") or {}
    page_results = meta.get("pages", [])
    thresh = body.similarity_threshold if body and body.similarity_threshold else 0.85

    result = analyze_duplicate_slides(
        pdf_path=pdf_path,
        page_results=page_results,
        similarity_threshold=thresh
    )

    update_job_metadata(job_id, {"duplicate_analysis": result})
    return {"job_id": job_id, "duplicate_analysis": result}


@router.post("/{job_id}/generate-unique-pdf")
async def build_unique_pdf(job_id: str, req: GenerateUniquePdfRequest):
    """Tool 3: Generates a clean PDF containing only selected unique slides."""
    job = get_job(job_id)
    pdf_path = job.get("file_path") if job else None

    if not pdf_path or not Path(pdf_path).exists():
        # Fallback to direct path search if job_id was direct
        possible_direct = UPLOAD_DIR / f"{job_id.replace('direct_', '').replace('_pdf', '.pdf')}"
        if possible_direct.exists():
            pdf_path = str(possible_direct)
        else:
            raise HTTPException(status_code=404, detail="Source PDF file not found")

    output_unique_path = str(PROCESSED_DIR / f"{job_id}_unique.pdf")
    generate_unique_pdf(pdf_path, req.unique_pages, output_unique_path)

    if job:
        update_job_metadata(job_id, {
            "unique_pdf_path": output_unique_path,
            "selected_unique_pages": req.unique_pages
        })

    return {
        "job_id": job_id,
        "unique_pdf_path": output_unique_path,
        "unique_pages_count": len(req.unique_pages)
    }

# ----------------------------------------------------
# TOOL 4: KEYWORD PDF REDACTION / CENSORING ROUTES
# ----------------------------------------------------
@router.post("/direct-scan-redactions")
async def direct_scan_redactions(
    file: Optional[UploadFile] = File(None),
    file_path: Optional[str] = Form(None),
    keywords_json: str = Form("[]"),
    case_sensitive: bool = Form(False),
    whole_word_only: bool = Form(True)
):
    """Fast Tool 4 direct PDF keyword scanner (uses PyMuPDF text search, NO vision OCR queue required!)."""
    target_pdf = None
    if file and file.filename:
        safe_name = sanitize_filename(file.filename)
        pdf_path = UPLOAD_DIR / safe_name
        with open(pdf_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):
                buffer.write(chunk)
        target_pdf = str(pdf_path)
    elif file_path and Path(file_path).exists():
        target_pdf = file_path

    if not target_pdf:
        raise HTTPException(status_code=400, detail="Must provide a valid PDF file or file_path")

    try:
        keywords = json.loads(keywords_json)
    except Exception:
        keywords = [k.strip() for k in keywords_json.split(",") if k.strip()]

    scan_result = scan_keywords_in_pdf(
        pdf_path=target_pdf,
        keywords=keywords,
        case_sensitive=case_sensitive,
        whole_word_only=whole_word_only
    )

    return {
        "target_pdf": target_pdf,
        "filename": Path(target_pdf).name,
        "scan_result": scan_result
    }


@router.post("/direct-apply-redactions")
async def direct_apply_redactions(
    file_path: str = Form(...),
    matches_json: str = Form(...)
):
    """Fast Tool 4 direct PDF true redactor (uses PyMuPDF add_redact_annot & apply_redactions)."""
    if not Path(file_path).exists():
        raise HTTPException(status_code=404, detail="Target PDF file not found")

    try:
        matches = json.loads(matches_json)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid matches_json format")

    stem = Path(file_path).stem
    out_redacted_path = str(PROCESSED_DIR / f"{stem}_redacted.pdf")
    out_path, verification_meta = apply_pdf_redactions(
        pdf_path=file_path,
        matches_to_redact=matches,
        output_pdf_path=out_redacted_path
    )

    return {
        "redacted_pdf_path": out_path,
        "verification": verification_meta
    }
@router.post("/{job_id}/scan-redactions")
async def scan_redactions(job_id: str, req: ScanRedactionsRequest):
    """Tool 4: Scans PDF for keyword matches before performing permanent redaction."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    meta = job.get("metadata_json") or {}
    target_pdf = meta.get("unique_pdf_path") if req.use_unique_pdf and meta.get("unique_pdf_path") else job.get("file_path")
    if not target_pdf or not Path(target_pdf).exists():
        target_pdf = job.get("file_path")

    if not target_pdf or not Path(target_pdf).exists():
        raise HTTPException(status_code=404, detail="Target PDF file for redaction scan not found")

    scan_result = scan_keywords_in_pdf(
        pdf_path=target_pdf,
        keywords=req.keywords,
        case_sensitive=req.case_sensitive or False
    )

    return {"job_id": job_id, "target_pdf": target_pdf, "scan_result": scan_result}


@router.post("/{job_id}/apply-redactions")
async def apply_redactions(job_id: str, req: ApplyRedactionsRequest):
    """Tool 4: Executes TRUE PDF redaction and programmatically verifies text content removal."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    meta = job.get("metadata_json") or {}
    target_pdf = meta.get("unique_pdf_path") if req.use_unique_pdf and meta.get("unique_pdf_path") else job.get("file_path")
    if not target_pdf or not Path(target_pdf).exists():
        target_pdf = job.get("file_path")

    if not target_pdf or not Path(target_pdf).exists():
        raise HTTPException(status_code=404, detail="Target PDF file for redaction application not found")

    output_redacted_path = str(PROCESSED_DIR / f"{job_id}_redacted.pdf")
    out_path, verification_meta = apply_pdf_redactions(
        pdf_path=target_pdf,
        matches_to_redact=req.matches,
        output_pdf_path=output_redacted_path
    )

    update_job_metadata(job_id, {
        "redacted_pdf_path": out_path,
        "redaction_verification": verification_meta
    })

    return {
        "job_id": job_id,
        "redacted_pdf_path": out_path,
        "verification": verification_meta
    }

@router.get("/export/{job_id}/{fmt}")
async def export_ocr_file(job_id: str, fmt: str, inline: bool = False):
    """Downloads or views exported structured file (.md, .json, .txt, .pdf searchable, .pdf report, unique, redacted, original)."""
    job = get_job(job_id)
    meta = (job.get("metadata_json") or {}) if job else {}
    
    target = None
    media_type = "application/pdf"

    if fmt in ("markdown", "md"):
        target = meta.get("markdown_path")
        media_type = "text/markdown"
    elif fmt == "json":
        target = meta.get("json_path")
        media_type = "application/json"
    elif fmt == "txt":
        target = meta.get("txt_path")
        media_type = "text/plain"
    elif fmt in ("pdf", "searchable"):
        target = meta.get("searchable_pdf_path")
        media_type = "application/pdf"
    elif fmt == "report":
        target = meta.get("pdf_report_path")
        media_type = "application/pdf"
    elif fmt == "unique":
        target = meta.get("unique_pdf_path") or str(PROCESSED_DIR / f"{job_id}_unique.pdf")
        media_type = "application/pdf"
    elif fmt == "redacted":
        target = meta.get("redacted_pdf_path") or str(PROCESSED_DIR / f"{job_id}_redacted.pdf")
        media_type = "application/pdf"
    elif fmt == "original":
        target = job.get("file_path") if job else None
        media_type = "application/pdf"
    else:
        raise HTTPException(status_code=400, detail="Invalid format type. Allowed: md, json, txt, pdf, report, unique, redacted, original")

    if not target or not Path(target).exists():
        raise HTTPException(status_code=404, detail="Export file not found")

    disp = "inline" if inline else "attachment"
    return FileResponse(
        path=target,
        media_type=media_type,
        filename=Path(target).name,
        content_disposition_type=disp
    )


@router.get("/download-file")
async def download_file_by_path(file_path: str):
    """Safely streams output files (PDFs, reports, exports) by path."""
    path = Path(file_path).resolve()
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(
        path=str(path),
        media_type="application/pdf",
        filename=path.name,
        content_disposition_type="attachment"
    )



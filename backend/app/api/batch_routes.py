from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any

from app.database import get_all_jobs, get_job, save_job
from app.models import JobStatus
from app.queue_manager import queue_manager

router = APIRouter(prefix="/api/batch", tags=["Batch Queue"])

@router.get("/jobs")
async def list_batch_jobs():
    """Lists all batch jobs across Tool 1 and Tool 2."""
    jobs = get_all_jobs()
    return {"total": len(jobs), "jobs": jobs}

@router.post("/jobs/{job_id}/cancel")
async def cancel_job(job_id: str):
    """Cancels a queued or processing job."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job["status"] = JobStatus.CANCELLED.value
    job["message"] = "Job cancelled by user"
    save_job(job)
    return {"status": "success", "message": "Job cancelled"}

@router.post("/jobs/{job_id}/retry")
async def retry_job(job_id: str):
    """Re-enqueues a failed or cancelled job."""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job["status"] = JobStatus.QUEUED.value
    job["progress"] = 0.0
    job["message"] = "Re-queued by user"
    save_job(job)
    queue_manager.task_queue.put(job_id)

    return {"status": "success", "message": "Job re-queued"}

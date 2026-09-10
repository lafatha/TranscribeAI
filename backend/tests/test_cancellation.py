import time
import pytest
from pathlib import Path
from app.database import init_db, save_job, get_job
from app.models import JobStatus, JobType
from app.queue_manager import queue_manager
from app.main import is_job_cancelled

def test_job_cancellation_detection(tmp_path):
    init_db()
    job_id = "test_cancel_123"
    
    # Save job in processing state
    job = {
        "id": job_id,
        "job_type": JobType.VIDEO_TO_PDF.value,
        "status": JobStatus.PROCESSING.value,
        "file_path": str(tmp_path / "test.mp4"),
        "progress": 0.30,
        "message": "Processing frames..."
    }
    save_job(job)

    assert not is_job_cancelled(job_id)

    # Cancel job
    job["status"] = JobStatus.CANCELLED.value
    save_job(job)

    assert is_job_cancelled(job_id)

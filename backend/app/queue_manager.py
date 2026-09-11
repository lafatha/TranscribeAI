import threading
import queue
import time
import uuid
import traceback
from datetime import datetime
from typing import Dict, Any, Callable, Optional

from app.database import save_job, get_job, get_all_jobs
from app.models import JobStatus, JobType

class QueueManager:
    def __init__(self):
        self.task_queue = queue.Queue()
        self.handlers: Dict[JobType, Callable] = {}
        self.worker_thread = None
        self.running = False
        self._lock = threading.Lock()

    def register_handler(self, job_type: JobType, handler_func: Callable):
        self.handlers[job_type] = handler_func

    def start(self):
        with self._lock:
            if not self.running:
                self.running = True
                self.worker_thread = threading.Thread(target=self._worker_loop, daemon=True)
                self.worker_thread.start()
                self._restore_queued_jobs()

    def stop(self):
        self.running = False

    def _restore_queued_jobs(self):
        """Restore any jobs marked QUEUED or PROCESSING upon restart."""
        jobs = get_all_jobs()
        for j in jobs:
            if j["status"] in [JobStatus.QUEUED.value, JobStatus.PROCESSING.value]:
                j["status"] = JobStatus.QUEUED.value
                j["message"] = "Re-queued on system restart"
                save_job(j)
                self.task_queue.put(j["id"])

    def add_job(self, job_type: JobType, file_path: str, params: Optional[Dict[str, Any]] = None) -> str:
        job_id = str(uuid.uuid4())
        job_dict = {
            "id": job_id,
            "job_type": job_type.value,
            "status": JobStatus.QUEUED.value,
            "file_path": file_path,
            "progress": 0.0,
            "message": "Job queued",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "metadata_json": params or {}
        }
        save_job(job_dict)
        self.task_queue.put(job_id)
        return job_id

    def update_progress(self, job_id: str, progress: float, message: str = "", extra_meta: Optional[Dict[str, Any]] = None):
        job = get_job(job_id)
        if job:
            job["progress"] = min(1.0, max(0.0, progress))
            if message:
                job["message"] = message
            if extra_meta:
                meta = job.get("metadata_json") or {}
                meta.update(extra_meta)
                job["metadata_json"] = meta
            save_job(job)

    def _worker_loop(self):
        while self.running:
            try:
                job_id = self.task_queue.get(timeout=1.0)
            except queue.Empty:
                continue

            job = get_job(job_id)
            if not job or job["status"] == JobStatus.CANCELLED.value:
                self.task_queue.task_done()
                continue

            job["status"] = JobStatus.PROCESSING.value
            job["message"] = "Processing started"
            save_job(job)

            job_type = JobType(job["job_type"])
            handler = self.handlers.get(job_type)

            if not handler:
                job["status"] = JobStatus.FAILED.value
                job["message"] = f"No handler registered for job type {job_type}"
                save_job(job)
                self.task_queue.task_done()
                continue

            try:
                # Call job handler function
                result_output, meta = handler(
                    job_id=job_id,
                    file_path=job["file_path"],
                    params=job.get("metadata_json") or {},
                    progress_callback=lambda p, m="", e=None: self.update_progress(job_id, p, m, e)
                )
                job = get_job(job_id) # Refresh
                if job["status"] != JobStatus.CANCELLED.value:
                    job["status"] = JobStatus.COMPLETED.value
                    job["progress"] = 1.0
                    job["message"] = "Processing completed successfully"
                    job["output_path"] = result_output
                    if meta:
                        existing = job.get("metadata_json") or {}
                        existing.update(meta)
                        job["metadata_json"] = existing
                    save_job(job)
            except Exception as e:
                err_msg = f"Processing error: {str(e)}\n{traceback.format_exc()}"
                print(err_msg)
                job["status"] = JobStatus.FAILED.value
                job["message"] = f"Failed: {str(e)}"
                save_job(job)

            self.task_queue.task_done()

# Global Queue Instance
queue_manager = QueueManager()

# Queue execution worker thread pool manager


import os
import re
import uuid
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
PROCESSED_DIR = DATA_DIR / "processed"
EXPORT_DIR = DATA_DIR / "exports"
CROPS_DIR = DATA_DIR / "crops"
MODELS_DIR = DATA_DIR / "models"
DB_PATH = DATA_DIR / "system.db"

# Ensure directories exist
for path in [DATA_DIR, UPLOAD_DIR, PROCESSED_DIR, EXPORT_DIR, CROPS_DIR, MODELS_DIR]:
    path.mkdir(parents=True, exist_ok=True)

# Security & Upload Limits
MAX_VIDEO_SIZE_BYTES = 2 * 1024 * 1024 * 1024  # 2 GB
MAX_PDF_SIZE_BYTES = 200 * 1024 * 1024         # 200 MB

# Default Algorithm Settings
DEFAULT_DUPLICATE_THRESHOLD = 0.75
DEFAULT_OCR_REVIEW_THRESHOLD = 0.75
DEFAULT_BASE_SAMPLE_FPS = 1.0
DEFAULT_BURST_SAMPLE_FPS = 30.0

# Server settings
HOST = "0.0.0.0"
PORT = 8000

def sanitize_filename(filename: str) -> str:
    """
    Sanitizes upload filenames to prevent Path Traversal attacks.
    Strips directory separators, restricts to safe characters, and prepends UUID.
    """
    if not filename:
        return f"{uuid.uuid4().hex[:8]}_file.bin"
        
    # Extract basename only
    base_name = Path(filename).name
    # Strip dangerous characters
    safe_name = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', base_name)
    # Prevent leading dots / hidden files
    safe_name = safe_name.lstrip('.')
    if not safe_name:
        safe_name = "upload.file"
        
    return f"{uuid.uuid4().hex[:8]}_{safe_name}"

# Configuration environment defaults initialized


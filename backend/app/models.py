from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class JobType(str, Enum):
    VIDEO_TO_PDF = "video_to_pdf"
    PDF_TO_OCR = "pdf_to_ocr"

class JobStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class JobCreate(BaseModel):
    job_type: JobType
    file_path: str
    duplicate_threshold: Optional[float] = 0.75
    sample_fps: Optional[float] = 5.0
    ocr_review_threshold: Optional[float] = 0.75

class JobResponse(BaseModel):
    id: str
    job_type: JobType
    status: JobStatus
    file_path: str
    progress: float = 0.0
    message: str = ""
    created_at: str
    updated_at: str
    output_path: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None

class CandidateFrame(BaseModel):
    slide_id: int
    frame_idx: int
    timestamp: str
    timestamp_sec: float
    quality_score: float
    sharpness: float
    similarity_score: float
    image_path: str
    is_selected: bool = True
    quad_detected: bool = False

class SlideMetadata(BaseModel):
    source_video: str
    source_fps: float
    total_frames: int
    detected_slides: int
    output_pages: int
    processing_time_seconds: float
    slides: List[CandidateFrame]

class OcrElementType(str, Enum):
    TITLE = "title"
    HEADING = "heading"
    PARAGRAPH = "paragraph"
    TABLE = "table"
    CHART = "chart"
    DIAGRAM = "diagram"
    IMAGE = "image"
    UNKNOWN = "unknown"

class OcrElement(BaseModel):
    type: OcrElementType
    text: str
    bbox: List[int]  # [x1, y1, x2, y2]
    confidence: float
    image_path: Optional[str] = None
    nearby_text: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None

class OcrPageResult(BaseModel):
    page: int
    elements: List[OcrElement]
    text: str
    status: str  # "OK" or "Needs Review"
    mean_confidence: float
    visual_count: int

class OcrDocumentResult(BaseModel):
    document_name: str
    pdf_path: str
    total_pages: int
    pages: List[OcrPageResult]
    markdown_path: str
    json_path: str
    txt_path: str
    needs_review_count: int

class SearchQuery(BaseModel):
    query: str
    limit: Optional[int] = 20

class SearchResultItem(BaseModel):
    document_name: str
    pdf_path: str
    slide_number: int
    snippet: str
    full_text: str
    confidence: float
    image_path: Optional[str] = None

export const API_BASE = "http://localhost:8000";

export interface SlideCandidate {
  slide_id: number;
  frame_idx: number;
  timestamp: string;
  timestamp_sec: number;
  quality_score: number;
  sharpness: number;
  similarity_score: number;
  image_path: string;
  is_selected: boolean;
  quad_detected: boolean;
}

export interface JobSlideResponse {
  job_id: string;
  status: string;
  progress: number;
  message: string;
  metadata?: any;
  output_pdf?: string;
  slides: SlideCandidate[];
}

export interface OcrPageElement {
  type: string;
  text: string;
  bbox: number[];
  confidence: number;
  image_path?: string;
  nearby_text?: string[];
}

export interface OcrPageMetrics {
  page: number;
  detected_boxes_count: number;
  recognized_lines_count: number;
  avg_confidence: number;
  min_confidence: number;
  total_chars: number;
  total_words: number;
  page_coverage_pct: number;
  processing_time_sec: number;
}

export interface OcrPage {
  page: number;
  elements: OcrPageElement[];
  visuals: any[];
  metrics?: OcrPageMetrics;
}


export interface OcrJobResponse {
  job_id: string;
  status: string;
  progress: number;
  message: string;
  file_path: string;
  markdown_path?: string;
  json_path?: string;
  txt_path?: string;
  needs_review_count: number;
  total_pages: number;
  pages: OcrPage[];
}

export interface BatchJob {
  id: string;
  job_type: string;
  status: string;
  file_path: string;
  progress: number;
  message: string;
  output_path?: string;
  metadata_json?: any;
  created_at: string;
  updated_at: string;
}

export interface SearchResultItem {
  document_name: string;
  pdf_path: string;
  slide_number: number;
  snippet: string;
  full_text: string;
  image_path?: string;
}

// API Functions
export async function uploadVideo(file: File, duplicateThreshold: number, sampleFps: number) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("duplicate_threshold", duplicateThreshold.toString());
  formData.append("sample_fps", sampleFps.toString());

  const res = await fetch(`${API_BASE}/api/video/process`, {
    method: "POST",
    body: formData,
  });
  return res.json();
}

export async function fetchVideoJobSlides(jobId: string): Promise<JobSlideResponse> {
  const res = await fetch(`${API_BASE}/api/video/slides/${jobId}`);
  return res.json();
}

export async function updateSlideSelection(jobId: string, slides: SlideCandidate[]) {
  const res = await fetch(`${API_BASE}/api/video/slides/${jobId}/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(slides),
  });
  return res.json();
}

export async function rebuildPdf(jobId: string) {
  const res = await fetch(`${API_BASE}/api/video/slides/${jobId}/rebuild`, {
    method: "POST",
  });
  return res.json();
}

export async function uploadPdfOcr(file: File, ocrReviewThreshold: number) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("ocr_review_threshold", ocrReviewThreshold.toString());

  const res = await fetch(`${API_BASE}/api/ocr/process`, {
    method: "POST",
    body: formData,
  });
  return res.json();
}

export async function fetchOcrResult(jobId: string): Promise<OcrJobResponse> {
  const res = await fetch(`${API_BASE}/api/ocr/result/${jobId}`);
  return res.json();
}

export async function fetchBatchJobs(): Promise<{ total: number; jobs: BatchJob[] }> {
  const res = await fetch(`${API_BASE}/api/batch/jobs`);
  return res.json();
}

export async function cancelBatchJob(jobId: string) {
  const res = await fetch(`${API_BASE}/api/batch/jobs/${jobId}/cancel`, { method: "POST" });
  return res.json();
}

export async function retryBatchJob(jobId: string) {
  const res = await fetch(`${API_BASE}/api/batch/jobs/${jobId}/retry`, { method: "POST" });
  return res.json();
}

export async function performSearch(query: string) {
  const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);
  return res.json();
}

export function getOcrExportUrl(jobId: string, fmt: "pdf" | "report" | "md" | "json" | "txt" | "original", inline: boolean = false): string {
  return `${API_BASE}/api/ocr/export/${jobId}/${fmt}?inline=${inline}`;
}

export function getVideoPdfUrl(jobId: string, inline: boolean = false): string {
  return `${API_BASE}/api/video/export/${jobId}?inline=${inline}`;
}


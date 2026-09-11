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


export interface DuplicateGroup {
  keep_page: number;
  duplicate_pages: number[];
}

export interface DuplicateAnalysis {
  original_page_count: number;
  unique_page_count: number;
  duplicate_page_count: number;
  duplicate_groups: DuplicateGroup[];
  unique_pages: number[];
  duplicate_pages: number[];
}

export interface RedactionKeywordSummary {
  keyword: string;
  matches_count: number;
  pages_count: number;
  page_numbers: number[];
}

export interface RedactionMatch {
  match_id: string;
  keyword: string;
  label?: string;
  page: number;
  bbox: number[];
  snippet: string;
}

export interface RedactionScanResult {
  total_redactions: number;
  total_pages_affected: number;
  keywords_summary: RedactionKeywordSummary[];
  matches: RedactionMatch[];
}

export interface RedactionVerification {
  verified: boolean;
  total_redactions_applied: number;
  redacted_keywords: string[];
  unredacted_occurrences_found: number;
  unredacted_details?: any[];
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
  searchable_pdf_path?: string;
  pdf_report_path?: string;
  unique_pdf_path?: string;
  redacted_pdf_path?: string;
  duplicate_analysis?: DuplicateAnalysis;
  redaction_verification?: RedactionVerification;
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

// Helper for handling JSON API responses safely
async function handleJsonResponse(res: Response) {
  const data = await res.json().catch(() => ({ detail: `HTTP error ${res.status}` }));
  if (!res.ok) {
    throw new Error(data.detail || data.message || `Server error (${res.status})`);
  }
  return data;
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
  return handleJsonResponse(res);
}

export async function fetchVideoJobSlides(jobId: string): Promise<JobSlideResponse> {
  const res = await fetch(`${API_BASE}/api/video/slides/${jobId}`);
  return handleJsonResponse(res);
}

export async function updateSlideSelection(jobId: string, slides: SlideCandidate[]) {
  const res = await fetch(`${API_BASE}/api/video/slides/${jobId}/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(slides),
  });
  return handleJsonResponse(res);
}

export async function rebuildPdf(jobId: string) {
  const res = await fetch(`${API_BASE}/api/video/slides/${jobId}/rebuild`, {
    method: "POST",
  });
  return handleJsonResponse(res);
}

export async function uploadPdfOcr(file: File, ocrReviewThreshold: number) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("ocr_review_threshold", ocrReviewThreshold.toString());

  const res = await fetch(`${API_BASE}/api/ocr/process`, {
    method: "POST",
    body: formData,
  });
  return handleJsonResponse(res);
}

export async function fetchOcrResult(jobId: string): Promise<OcrJobResponse> {
  const res = await fetch(`${API_BASE}/api/ocr/result/${jobId}`);
  return handleJsonResponse(res);
}

export async function detectDuplicates(jobId: string, similarityThreshold: number = 0.85): Promise<{ job_id: string; duplicate_analysis: DuplicateAnalysis }> {
  const res = await fetch(`${API_BASE}/api/ocr/${jobId}/detect-duplicates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ similarity_threshold: similarityThreshold }),
  });
  return handleJsonResponse(res);
}

export async function directDetectDuplicates(file: File, similarityThreshold: number = 0.85): Promise<{ job_id: string; file_path: string; filename: string; unique_pdf_path?: string; duplicate_analysis: DuplicateAnalysis }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("similarity_threshold", similarityThreshold.toString());

  const res = await fetch(`${API_BASE}/api/ocr/direct-detect-duplicates`, {
    method: "POST",
    body: formData,
  });
  return handleJsonResponse(res);
}

export async function generateUniquePdf(jobId: string, uniquePages: number[]): Promise<{ job_id: string; unique_pdf_path: string; unique_pages_count: number }> {
  const res = await fetch(`${API_BASE}/api/ocr/${jobId}/generate-unique-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ unique_pages: uniquePages }),
  });
  return handleJsonResponse(res);
}

export async function scanRedactions(jobId: string, keywords: string[], caseSensitive: boolean = false, useUniquePdf: boolean = true): Promise<{ job_id: string; target_pdf: string; scan_result: RedactionScanResult }> {
  const res = await fetch(`${API_BASE}/api/ocr/${jobId}/scan-redactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keywords, case_sensitive: caseSensitive, use_unique_pdf: useUniquePdf }),
  });
  return handleJsonResponse(res);
}

export async function directScanRedactions(file: File | null, filePath: string | null, keywords: string[], caseSensitive: boolean = false, wholeWordOnly: boolean = true): Promise<{ target_pdf: string; filename: string; scan_result: RedactionScanResult }> {
  const formData = new FormData();
  if (file) formData.append("file", file);
  if (filePath) formData.append("file_path", filePath);
  formData.append("keywords_json", JSON.stringify(keywords));
  formData.append("case_sensitive", caseSensitive.toString());
  formData.append("whole_word_only", wholeWordOnly.toString());

  const res = await fetch(`${API_BASE}/api/ocr/direct-scan-redactions`, {
    method: "POST",
    body: formData,
  });
  return handleJsonResponse(res);
}

export async function applyRedactions(jobId: string, matches: RedactionMatch[], useUniquePdf: boolean = true): Promise<{ job_id: string; redacted_pdf_path: string; verification: RedactionVerification }> {
  const res = await fetch(`${API_BASE}/api/ocr/${jobId}/apply-redactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ matches, use_unique_pdf: useUniquePdf }),
  });
  return handleJsonResponse(res);
}

export async function directApplyRedactions(filePath: string, matches: RedactionMatch[]): Promise<{ redacted_pdf_path: string; verification: RedactionVerification }> {
  const formData = new FormData();
  formData.append("file_path", filePath);
  formData.append("matches_json", JSON.stringify(matches));

  const res = await fetch(`${API_BASE}/api/ocr/direct-apply-redactions`, {
    method: "POST",
    body: formData,
  });
  return handleJsonResponse(res);
}

export async function fetchBatchJobs(): Promise<{ total: number; jobs: BatchJob[] }> {
  const res = await fetch(`${API_BASE}/api/batch/jobs`);
  return handleJsonResponse(res);
}

export async function cancelBatchJob(jobId: string) {
  const res = await fetch(`${API_BASE}/api/batch/jobs/${jobId}/cancel`, { method: "POST" });
  return handleJsonResponse(res);
}

export async function retryBatchJob(jobId: string) {
  const res = await fetch(`${API_BASE}/api/batch/jobs/${jobId}/retry`, { method: "POST" });
  return handleJsonResponse(res);
}

export async function performSearch(query: string) {
  const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);
  return handleJsonResponse(res);
}

export function getOcrExportUrl(jobId: string, fmt: "pdf" | "report" | "unique" | "redacted" | "md" | "json" | "txt" | "original", inline: boolean = false): string {
  return `${API_BASE}/api/ocr/export/${jobId}/${fmt}?inline=${inline}`;
}

export function getDirectDownloadUrl(filePath: string): string {
  return `${API_BASE}/api/ocr/download-file?file_path=${encodeURIComponent(filePath)}`;
}

export function getVideoPdfUrl(jobId: string, inline: boolean = false): string {
  return `${API_BASE}/api/video/export/${jobId}?inline=${inline}`;
}


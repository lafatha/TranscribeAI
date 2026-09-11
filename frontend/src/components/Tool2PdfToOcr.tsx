"use client";

import React, { useState, useEffect } from "react";
import { 
  Upload, 
  FileText, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Eye, 
  Image as ImageIcon, 
  Copy, 
  FileCode, 
  Layers, 
  Plus, 
  Check 
} from "lucide-react";
import { 
  uploadPdfOcr, 
  fetchOcrResult, 
  OcrJobResponse, 
  API_BASE, 
  getOcrExportUrl 
} from "../lib/api";
import { PdfViewer } from "./PdfViewer";

interface Tool2Props {
  selectedJobId?: string | null;
}

const LOCAL_STORAGE_KEY = "doc_intel_active_ocr_job";

export const Tool2PdfToOcr: React.FC<Tool2Props> = ({ selectedJobId }) => {
  const [file, setFile] = useState<File | null>(null);
  const [ocrReviewThreshold, setOcrReviewThreshold] = useState<number>(0.75);
  
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("idle");
  const [progress, setProgress] = useState<number>(0);
  const [message, setMessage] = useState<string>("");
  const [result, setResult] = useState<OcrJobResponse | null>(null);
  const [selectedPageIdx, setSelectedPageIdx] = useState<number>(0);
  const [selectedElementIdx, setSelectedElementIdx] = useState<number | null>(null);

  const [viewMode, setViewMode] = useState<"overview" | "text" | "visuals" | "pdf_viewer" | "json">("overview");

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadOcrJob = async (targetJobId: string) => {
    setIsProcessing(true);
    try {
      const res = await fetchOcrResult(targetJobId);
      setStatus(res.status);
      setProgress(res.progress);
      setMessage(res.message);
      setResult(res);
      
      if (res.status === "completed" || res.status === "failed" || res.status === "cancelled") {
        setIsProcessing(false);
      }
    } catch (err: any) {
      console.error("Error loading OCR job:", err);
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (selectedJobId) {
      setJobId(selectedJobId);
      loadOcrJob(selectedJobId);
    } else {
      const savedJobId = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedJobId) {
        setJobId(savedJobId);
        loadOcrJob(savedJobId);
      }
    }
  }, [selectedJobId]);

  useEffect(() => {
    if (!jobId || status === "completed" || status === "failed" || status === "cancelled") {
      if (status === "completed" || status === "failed" || status === "cancelled") {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        setIsProcessing(false);
      }
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetchOcrResult(jobId);
        setStatus(res.status);
        setProgress(res.progress);
        setMessage(res.message);
        setResult(res);

        if (res.status === "completed") {
          setIsProcessing(false);
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        } else if (res.status === "failed") {
          setIsProcessing(false);
          setErrorMessage(res.message || "OCR processing failed");
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
      } catch (err) {
        console.error("Error polling OCR job:", err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [jobId, status]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleStartOcr = async () => {
    if (!file || isProcessing) return;
    setErrorMessage(null);
    setIsProcessing(true);
    setStatus("processing");
    setProgress(0.05);
    setMessage("Uploading presentation PDF...");

    try {
      const res = await uploadPdfOcr(file, ocrReviewThreshold);
      if (res.detail) {
        throw new Error(res.detail);
      }
      setJobId(res.job_id);
      localStorage.setItem(LOCAL_STORAGE_KEY, res.job_id);
    } catch (err: any) {
      console.error(err);
      setStatus("failed");
      setErrorMessage(err.message || "OCR upload failed");
      setIsProcessing(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (!result?.pages) return;
    const mdText = result.pages
      .map((p) => `## Slide ${p.page}\n` + p.elements.map((e) => e.text).join("\n"))
      .join("\n\n---\n\n");
    navigator.clipboard.writeText(mdText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activePage = result?.pages ? result.pages[selectedPageIdx] : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-[#1c1c20] border border-[#33333d] text-slate-200 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-slate-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-xs text-slate-400 hover:text-white font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {/* Upload Dropzone */}
      {!result && (
        <div className="bg-[#17171a] border border-[#24242a] p-6 rounded-2xl space-y-6">
          <div className="border border-dashed border-[#33333d] hover:border-slate-500 rounded-xl p-8 text-center transition-all bg-[#141416] relative">
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-[#222228] flex items-center justify-center text-white border border-[#2e2e36]">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">
                  {file ? file.name : "Drop presentation PDF here"}
                </p>
                <p className="text-xs text-slate-500 mt-1">Supports presentation PDF files up to 200 MB</p>
              </div>
              {file && (
                <span className="text-xs font-medium px-2.5 py-0.5 bg-[#25252b] border border-[#303038] text-slate-300 rounded-md">
                  {(file.size / (1024 * 1024)).toFixed(1)} MB
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleStartOcr}
            disabled={!file || isProcessing}
            className="w-full py-3 px-5 rounded-xl font-medium text-xs text-white bg-[#222228] hover:bg-[#2c2c36] disabled:opacity-50 disabled:cursor-not-allowed border border-[#33333d] transition-all flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-white" />
                <span>Extracting Information... ({Math.round(progress * 100)}%)</span>
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 text-white" />
                <span>Extract Information from PDF (OCR)</span>
              </>
            )}
          </button>

          {status !== "idle" && status !== "completed" && (
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs text-slate-300 font-medium">
                <span>{message}</span>
                <span className="font-mono text-white font-bold">{Math.round(progress * 100)}%</span>
              </div>
              <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-slate-300 transition-all duration-300 rounded-full"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* OCR Results Inspector */}
      {result && result.pages && result.pages.length > 0 && (
        <div className="bg-[#17171a] p-6 rounded-2xl border border-[#24242a] space-y-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-[#24242a] pb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-white" />
                Structured OCR Results ({result.total_pages} Pages)
              </h3>
              <button
                onClick={() => {
                  setResult(null);
                  setJobId(null);
                  setStatus("idle");
                  setFile(null);
                }}
                className="px-3 py-1 bg-[#222228] hover:bg-[#2e2e38] text-slate-300 text-xs font-medium rounded-xl border border-[#2e2e36] flex items-center gap-1 transition-all shrink-0"
              >
                <Plus className="h-3.5 w-3.5 text-white" />
                <span>Upload New</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-[#131316] p-1 rounded-xl border border-[#24242a] gap-1">
                <button
                  onClick={() => setViewMode("overview")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === "overview" ? "bg-[#2c2c36] text-white border border-[#444450]" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setViewMode("pdf_viewer")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    viewMode === "pdf_viewer" ? "bg-[#2c2c36] text-white border border-[#444450]" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  PDF Viewer
                </button>
                <button
                  onClick={() => setViewMode("text")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    viewMode === "text" ? "bg-[#2c2c36] text-white border border-[#444450]" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Text Content
                </button>
                <button
                  onClick={() => setViewMode("visuals")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    viewMode === "visuals" ? "bg-[#2c2c36] text-white border border-[#444450]" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  Visuals
                </button>
                <button
                  onClick={() => setViewMode("json")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    viewMode === "json" ? "bg-[#2c2c36] text-white border border-[#444450]" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <FileCode className="h-3.5 w-3.5" />
                  JSON
                </button>
              </div>

              {jobId && (
                <div className="flex items-center gap-2">
                  <a
                    href={getOcrExportUrl(jobId, "pdf", false)}
                    download
                    className="px-3 py-1.5 bg-[#222228] hover:bg-[#2c2c36] text-white text-xs font-bold rounded-xl border border-[#33333d] flex items-center gap-1.5 transition-all"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Searchable PDF
                  </a>
                  <a
                    href={getOcrExportUrl(jobId, "md", false)}
                    download
                    className="px-3 py-1.5 bg-[#222228] hover:bg-[#2c2c34] text-slate-300 text-xs font-semibold rounded-xl border border-[#2c2c34] flex items-center gap-1.5 transition-all"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Markdown
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pages ({result.pages.length})</h4>
              <div className="max-h-[480px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {result.pages.map((page, idx) => (
                  <button
                    key={page.page}
                    onClick={() => setSelectedPageIdx(idx)}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      selectedPageIdx === idx
                        ? "bg-[#222228] border-[#383844] text-white font-medium"
                        : "bg-[#131316] border-[#222228] text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <Layers className="h-3.5 w-3.5 text-slate-300" />
                      <span>Slide #{page.page}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-3 space-y-4">
              {viewMode === "pdf_viewer" && jobId && (
                <PdfViewer
                  jobId={jobId}
                  sourceType="ocr"
                  availableFormats={["pdf", "report", "original"]}
                  title="Document PDF Viewer"
                />
              )}

              {activePage && (viewMode === "overview" || viewMode === "text") && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-[#131316] p-4 rounded-xl border border-[#222228] space-y-3">
                    <div className="flex justify-between items-center text-xs text-slate-400 border-b border-[#222228] pb-2">
                      <span className="font-semibold text-slate-200">Bounding Box Visualizer</span>
                      <span className="font-mono text-[10px]">Page {activePage.page}</span>
                    </div>
                    <div className="bg-[#0b0b0d] rounded-lg overflow-hidden border border-[#222228] aspect-[3/4] flex items-center justify-center">
                      <img
                        src={`${API_BASE}/data/debug/${jobId}/page-${String(activePage.page).padStart(3, '0')}-detection.png`}
                        alt={`Page ${activePage.page}`}
                        className="object-contain w-full h-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `${API_BASE}/data/debug/${jobId}/page-${String(activePage.page).padStart(3, '0')}-original.png`;
                        }}
                      />
                    </div>
                  </div>

                  <div className="bg-[#131316] p-4 rounded-xl border border-[#222228] space-y-3 flex flex-col">
                    <div className="flex justify-between items-center text-xs text-slate-400 border-b border-[#222228] pb-2">
                      <span className="font-semibold text-slate-200">Extracted Page Text</span>
                      <button onClick={handleCopyMarkdown} className="text-[11px] text-slate-300 hover:text-white hover:underline">
                        {copied ? "Copied!" : "Copy Text"}
                      </button>
                    </div>
                    <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1 flex-1 custom-scrollbar">
                      {activePage.elements.map((elem, i) => (
                        <p key={i} className="text-xs text-slate-200 bg-[#1c1c22] p-2.5 rounded-lg border border-[#2b2b34]">
                          {elem.text}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activePage && viewMode === "visuals" && (
                <div className="bg-[#131316] p-4 rounded-xl border border-[#222228] space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Visual Crops & Charts</h4>
                  {activePage.visuals && activePage.visuals.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {activePage.visuals.map((v, i) => {
                        const rel = v.image_path.split("data")[1] || v.image_path;
                        return (
                          <div key={i} className="bg-[#0b0b0d] p-3 rounded-lg border border-[#222228]">
                            <img src={`${API_BASE}/data${rel.replace(/\\/g, "/")}`} alt={v.type} className="object-contain h-32 w-full" />
                            <p className="text-[10px] text-slate-400 mt-2 font-mono uppercase">{v.type}</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic py-6 text-center">No graphic crops detected on this page</p>
                  )}
                </div>
              )}

              {activePage && viewMode === "json" && (
                <pre className="bg-[#0b0b0d] p-4 rounded-xl font-mono text-xs text-slate-300 overflow-x-auto max-h-[440px] border border-[#222228]">
                  {JSON.stringify(activePage, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

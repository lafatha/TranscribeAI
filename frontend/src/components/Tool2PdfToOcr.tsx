"use client";

import React, { useState, useEffect } from "react";
import { Upload, FileText, Download, AlertTriangle, CheckCircle, RefreshCw, Eye, Image as ImageIcon, Copy, FileCode, Layers, Sliders, ChevronDown, ChevronUp, Check, ArrowRight, Plus } from "lucide-react";
import { uploadPdfOcr, fetchOcrResult, OcrJobResponse, API_BASE, getOcrExportUrl } from "../lib/api";
import { PdfViewer } from "./PdfViewer";

interface Tool2Props {
  selectedJobId?: string | null;
}

const LOCAL_STORAGE_KEY = "doc_intel_active_ocr_job";

export const Tool2PdfToOcr: React.FC<Tool2Props> = ({ selectedJobId }) => {
  const [file, setFile] = useState<File | null>(null);
  const [ocrReviewThreshold, setOcrReviewThreshold] = useState<number>(0.75);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  
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

  // Restore active job from props or localStorage
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

  // Poll OCR job status
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

  // Helper step calculator
  const getActiveStep = () => {
    if (status === "idle") return 1;
    if (progress < 0.25) return 2;
    if (progress < 0.85) return 3;
    if (progress < 1.0) return 4;
    return 5;
  };

  const activeStep = getActiveStep();
  const activePage = result?.pages ? result.pages[selectedPageIdx] : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Workflow Step Progress Bar */}
      <div className="bg-[#17171a] p-3 rounded-xl border border-[#24242a]">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center text-xs">
          <div className={`p-2 rounded-lg border transition-all ${activeStep === 1 ? "bg-[#24242a] border-[#383842] text-white font-medium" : activeStep > 1 ? "bg-[#1c1c20] border-[#24242a] text-emerald-400" : "bg-[#17171a] border-transparent text-slate-500"}`}>
            <span>1. Unggah PDF</span>
          </div>
          <div className={`p-2 rounded-lg border transition-all ${activeStep === 2 ? "bg-[#24242a] border-[#383842] text-white font-medium" : activeStep > 2 ? "bg-[#1c1c20] border-[#24242a] text-emerald-400" : "bg-[#17171a] border-transparent text-slate-500"}`}>
            <span>2. Baca Halaman</span>
          </div>
          <div className={`p-2 rounded-lg border transition-all ${activeStep === 3 ? "bg-[#24242a] border-[#383842] text-white font-medium" : activeStep > 3 ? "bg-[#1c1c20] border-[#24242a] text-emerald-400" : "bg-[#17171a] border-transparent text-slate-500"}`}>
            <span>3. Ekstrak Teks</span>
          </div>
          <div className={`p-2 rounded-lg border transition-all ${activeStep === 4 ? "bg-[#24242a] border-[#383842] text-white font-medium" : activeStep > 4 ? "bg-[#1c1c20] border-[#24242a] text-emerald-400" : "bg-[#17171a] border-transparent text-slate-500"}`}>
            <span>4. Analisis Grafik</span>
          </div>
          <div className={`p-2 rounded-lg border transition-all ${activeStep === 5 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-medium" : "bg-[#17171a] border-transparent text-slate-500"}`}>
            <span>5. Selesai</span>
          </div>
        </div>
      </div>

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-xs text-rose-400 hover:text-rose-200 font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {/* Upload Section (Shown only when no active result session is loaded) */}
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
              <div className="h-12 w-12 rounded-xl bg-[#222228] flex items-center justify-center text-slate-300 border border-[#2e2e36]">
                <FileText className="h-6 w-6" />
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

          {/* Pre-processing Summary Card */}
          {file && !isProcessing && status === "idle" && (
            <div className="bg-[#141416] p-4 rounded-xl border border-[#26262c] space-y-2 text-xs text-slate-300">
              <h4 className="font-medium text-white text-xs">Informasi Pemrosesan:</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="flex items-start gap-2 bg-[#1c1c20] p-2.5 rounded-lg border border-[#26262c]">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Ekstraksi teks & judul oleh OCR</span>
                </div>
                <div className="flex items-start gap-2 bg-[#1c1c20] p-2.5 rounded-lg border border-[#26262c]">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Isolasi tabel & grafik</span>
                </div>
                <div className="flex items-start gap-2 bg-[#1c1c20] p-2.5 rounded-lg border border-[#26262c]">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Output Markdown & JSON</span>
                </div>
              </div>
            </div>
          )}

          {/* Start OCR Action Button */}
          <button
            onClick={handleStartOcr}
            disabled={!file || isProcessing}
            className="w-full py-3 px-5 rounded-xl font-medium text-xs text-white bg-[#24242a] hover:bg-[#2d2d34] disabled:opacity-50 disabled:cursor-not-allowed border border-[#33333d] transition-all flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Mengekstrak Informasi... ({Math.round(progress * 100)}%)</span>
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 text-slate-300" />
                <span>Ekstrak Informasi dari PDF</span>
              </>
            )}
          </button>

          {/* Progress Bar */}
          {status !== "idle" && status !== "completed" && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-300 font-medium">
                <span>{message}</span>
                <span className="font-mono text-cyan-400 font-bold">{Math.round(progress * 100)}%</span>
              </div>
              <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-indigo-400 to-indigo-500 transition-all duration-300 rounded-full"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loaded Session Header */}
      {result && (
        <div className="bg-[#17171a] p-4 rounded-2xl border border-[#24242a] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2 truncate">
                <span className="truncate">{result.file_path ? result.file_path.split(/[\/\\]/).pop() : "OCR Document"}</span>
                <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  {result.total_pages} Pages • OCR Session
                </span>
              </h2>
            </div>
          </div>

          <button
            onClick={() => {
              setResult(null);
              setJobId(null);
              setStatus("idle");
              setFile(null);
            }}
            className="px-3.5 py-1.5 bg-[#222228] hover:bg-[#2e2e38] text-slate-300 text-xs font-medium rounded-xl border border-[#2e2e36] flex items-center gap-1.5 transition-all shrink-0"
          >
            <Plus className="h-4 w-4 text-cyan-400" />
            <span>Upload New PDF</span>
          </button>
        </div>
      )}


      {/* OCR Results Inspector */}
      {result && result.pages && result.pages.length > 0 && (

        <div className="glass-panel p-6 rounded-3xl space-y-6">
          {/* Result Header & Friendly View Tabs */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-cyan-400" />
                {result.total_pages} Pages
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
              <div className="flex flex-wrap items-center bg-slate-950 p-1 rounded-2xl border border-slate-800 gap-1">
                <button
                  onClick={() => setViewMode("overview")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    viewMode === "overview" ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setViewMode("pdf_viewer")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                    viewMode === "pdf_viewer" ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  PDF Viewer
                </button>
                <button
                  onClick={() => setViewMode("text")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                    viewMode === "text" ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Text Content
                </button>
                <button
                  onClick={() => setViewMode("visuals")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                    viewMode === "visuals" ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  Visuals & Charts
                </button>
                <button
                  onClick={() => setViewMode("json")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                    viewMode === "json" ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <FileCode className="h-3.5 w-3.5" />
                  JSON Data
                </button>
              </div>

              {jobId && (
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={getOcrExportUrl(jobId, "pdf", false)}
                    download
                    className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all whitespace-nowrap"
                  >
                    <Download className="h-4 w-4" />
                    Searchable PDF
                  </a>

                  <a
                    href={getOcrExportUrl(jobId, "report", false)}
                    download
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all whitespace-nowrap"
                  >
                    <FileText className="h-4 w-4 text-cyan-400" />
                    PDF Report
                  </a>

                  <a
                    href={getOcrExportUrl(jobId, "md", false)}
                    download
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all whitespace-nowrap"
                  >
                    <Download className="h-4 w-4 text-slate-400" />
                    Markdown
                  </a>
                </div>
              )}
            </div>
          </div>


          {/* Main Content Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar Page Selector */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pages ({result.pages.length})</h4>
              <div className="max-h-[500px] overflow-y-auto space-y-2 pr-2">
                {result.pages.map((page, idx) => (
                  <button
                    key={page.page}
                    onClick={() => setSelectedPageIdx(idx)}
                    className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                      selectedPageIdx === idx
                        ? "bg-cyan-950/60 border-cyan-500/60 text-white"
                        : "bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-cyan-400" />
                      <span className="text-xs font-bold">Slide #{page.page}</span>
                    </div>

                    {page.visuals && page.visuals.length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {page.visuals.length} Visuals
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Display Box */}
            <div className="lg:col-span-3 space-y-4 min-h-[450px]">

              {viewMode === "pdf_viewer" && jobId && (
                <PdfViewer
                  jobId={jobId}
                  sourceType="ocr"
                  availableFormats={["pdf", "report", "original"]}
                  title={`Document PDF Viewer - ${result.file_path ? result.file_path.split("/").pop()?.split("\\").pop() : "OCR Document"}`}
                />
              )}

              {/* Page Completeness Diagnostics Bar */}
              {activePage && (
                <div className="bg-[#121318] p-3 rounded-2xl border border-slate-800/80 flex flex-wrap items-center justify-between text-xs gap-3">
                  <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-bold">
                      Page #{activePage.page} Diagnostics
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                      Boxes: <strong className="text-white font-bold">{activePage.metrics?.detected_boxes_count || activePage.elements.length}</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                      Words: <strong className="text-white font-bold">{activePage.metrics?.total_words || 0}</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                      Avg Conf: <strong className="text-emerald-400 font-bold">{Math.round((activePage.metrics?.avg_confidence || 0.95) * 100)}%</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                      Coverage: <strong className="text-indigo-300 font-bold">{activePage.metrics?.page_coverage_pct || 0}%</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                      Time: <strong className="text-amber-300 font-bold">{activePage.metrics?.processing_time_sec || 0}s</strong>
                    </span>
                  </div>

                  <button
                    onClick={handleCopyMarkdown}
                    className="px-3.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl flex items-center gap-1.5 transition-all"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? "Copied!" : "Copy Markdown"}
                  </button>
                </div>
              )}

              {activePage && (viewMode === "overview" || viewMode === "text") && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Side: Document Page Canvas Preview with Drawn Bounding Box Visualization */}
                  <div className="bg-[#121318] p-4 rounded-2xl border border-slate-800 space-y-3 shadow-xl">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2 text-xs">
                      <span className="font-bold text-slate-300 flex items-center gap-1.5">
                        <Eye className="h-4 w-4 text-cyan-400" />
                        PaddleOCR Bounding Box Detection Preview
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">200 DPI Full-Page</span>
                    </div>

                    <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800 aspect-[3/4] relative flex items-center justify-center">
                      <img
                        src={`${API_BASE}/data/debug/${jobId}/page-${String(activePage.page).padStart(3, '0')}-detection.png`}
                        alt={`Page ${activePage.page} Bounding Boxes`}
                        className="object-contain w-full h-full"
                        onError={(e) => {
                          // Fallback to original preview image if debug detection image hasn't loaded
                          (e.target as HTMLImageElement).src = `${API_BASE}/data/debug/${jobId}/page-${String(activePage.page).padStart(3, '0')}-original.png`;
                        }}
                      />
                    </div>
                  </div>

                  {/* Right Side: Interactive Text Reader */}
                  <div className="bg-[#121318] p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl font-sans flex flex-col">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Extracted Text Content</span>
                      </div>
                      <span className="text-xs font-mono text-slate-500">{activePage.elements.length} text elements</span>
                    </div>

                    <div className="space-y-3 text-slate-200 leading-relaxed max-h-[520px] overflow-y-auto pr-2 flex-1">
                      {activePage.elements.map((elem, i) => {
                        if (elem.type === "title") {
                          return (
                            <h3
                              key={i}
                              onMouseEnter={() => setSelectedElementIdx(i)}
                              onMouseLeave={() => setSelectedElementIdx(null)}
                              className={`text-base font-bold text-white tracking-tight pt-2 pb-1 border-b transition-all ${
                                selectedElementIdx === i ? "border-cyan-400 text-cyan-300 pl-2" : "border-slate-800/50"
                              }`}
                            >
                              {elem.text}
                            </h3>
                          );
                        }
                        return (
                          <p
                            key={i}
                            onMouseEnter={() => setSelectedElementIdx(i)}
                            onMouseLeave={() => setSelectedElementIdx(null)}
                            className={`text-xs text-slate-200 leading-relaxed font-normal p-3 rounded-xl border transition-all cursor-pointer ${
                              selectedElementIdx === i
                                ? "bg-cyan-950/60 border-cyan-500 text-white shadow-md shadow-cyan-950/40"
                                : "bg-slate-950/40 border-slate-800/40 hover:border-slate-700/60"
                            }`}
                          >
                            {elem.text}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}


              {activePage && viewMode === "visuals" && (
                <div className="space-y-4">
                  <div className="border-b border-slate-800 pb-3">
                    <h4 className="text-base font-bold text-white">Extracted Charts, Tables & Graphic Crops</h4>
                  </div>

                  {activePage.visuals && activePage.visuals.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {activePage.visuals.map((vis, i) => {
                        const relPath = vis.image_path.split("data")[1] || vis.image_path;
                        const visUrl = `${API_BASE}/data${relPath.replace(/\\/g, "/")}`;

                        return (
                          <div key={i} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                            <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
                              <img src={visUrl} alt={vis.type} className="object-contain w-full h-full" loading="lazy" />
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-cyan-400 uppercase">{vis.type}</span>
                              <span className="text-slate-400 font-mono text-[11px]">Conf: {Math.round(vis.confidence * 100)}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic py-8 text-center">No isolated visual crops detected on this slide page.</p>
                  )}
                </div>
              )}

              {activePage && viewMode === "json" && (
                <div className="space-y-4">
                  <div className="border-b border-slate-800 pb-3">
                    <h4 className="text-base font-bold text-white">Raw Bounding Box & Element Schema</h4>
                  </div>

                  <pre className="bg-slate-950 p-5 rounded-2xl font-mono text-xs text-emerald-400 overflow-x-auto max-h-[420px] border border-slate-800">
                    {JSON.stringify(activePage, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

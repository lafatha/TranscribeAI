"use client";

import React, { useState, useEffect } from "react";
import { Upload, FileText, Download, AlertTriangle, CheckCircle, RefreshCw, Eye, Image as ImageIcon, Copy, FileCode, Layers, Sliders, ChevronDown, ChevronUp, Check, ArrowRight } from "lucide-react";
import { uploadPdfOcr, fetchOcrResult, OcrJobResponse, API_BASE } from "../lib/api";

const LOCAL_STORAGE_KEY = "doc_intel_active_ocr_job";

export const Tool2PdfToOcr: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [ocrReviewThreshold, setOcrReviewThreshold] = useState<number>(0.75);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("idle");
  const [progress, setProgress] = useState<number>(0);
  const [message, setMessage] = useState<string>("");
  const [result, setResult] = useState<OcrJobResponse | null>(null);
  const [selectedPageIdx, setSelectedPageIdx] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"overview" | "text" | "visuals" | "json">("overview");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Restore active job from localStorage
  useEffect(() => {
    const savedJobId = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedJobId) {
      setJobId(savedJobId);
      setIsProcessing(true);
    }
  }, []);

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
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Tool Header */}
      <div className="bg-[#17171a] p-6 rounded-2xl border border-[#24242a] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-2">
            <FileText className="h-3.5 w-3.5" />
            WORKFLOW 2 — PDF TO STRUCTURED OCR
          </div>
          <h2 className="text-xl font-bold text-white">Ekstraksi Teks, Tabel & Grafik Terstruktur dari PDF</h2>
          <p className="text-slate-400 text-xs mt-1">
            Menjalankan engine OCR lokal 100% offline untuk mengekstrak judul, paragraf, tabel, dan grafik tanpa halusinasi.
          </p>
        </div>
      </div>

      {/* Workflow Step Progress Bar */}
      <div className="bg-[#17171a] p-3 rounded-2xl border border-[#24242a]">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center text-xs">
          <div className={`p-2 rounded-xl border transition-all ${activeStep === 1 ? "bg-cyan-500/10 border-cyan-500/30 text-white font-semibold" : activeStep > 1 ? "bg-[#1c1c20] border-[#28282e] text-emerald-400" : "bg-[#17171a] border-[#222228] text-slate-500"}`}>
            <span>1. Unggah PDF</span>
          </div>
          <div className={`p-2 rounded-xl border transition-all ${activeStep === 2 ? "bg-cyan-500/10 border-cyan-500/30 text-white font-semibold" : activeStep > 2 ? "bg-[#1c1c20] border-[#28282e] text-emerald-400" : "bg-[#17171a] border-[#222228] text-slate-500"}`}>
            <span>2. Baca Halaman</span>
          </div>
          <div className={`p-2 rounded-xl border transition-all ${activeStep === 3 ? "bg-cyan-500/10 border-cyan-500/30 text-white font-semibold" : activeStep > 3 ? "bg-[#1c1c20] border-[#28282e] text-emerald-400" : "bg-[#17171a] border-[#222228] text-slate-500"}`}>
            <span>3. Ekstrak Teks</span>
          </div>
          <div className={`p-2 rounded-xl border transition-all ${activeStep === 4 ? "bg-cyan-500/10 border-cyan-500/30 text-white font-semibold" : activeStep > 4 ? "bg-[#1c1c20] border-[#28282e] text-emerald-400" : "bg-[#17171a] border-[#222228] text-slate-500"}`}>
            <span>4. Analisis Grafik</span>
          </div>
          <div className={`p-2 rounded-xl border transition-all ${activeStep === 5 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-semibold" : "bg-[#17171a] border-[#222228] text-slate-500"}`}>
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

      {/* Main Upload Section */}
      <div className="bg-[#17171a] border border-[#24242a] p-6 rounded-2xl space-y-6">
        <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/50 rounded-2xl p-10 text-center transition-all bg-slate-900/40 relative">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center gap-3">
            <div className="h-16 w-16 rounded-2xl bg-cyan-600/20 flex items-center justify-center text-cyan-400">
              <FileText className="h-8 w-8" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-200">
                {file ? file.name : "Drop your presentation PDF here"}
              </p>
              <p className="text-xs text-slate-400 mt-1">Supports presentation PDF files up to 200 MB</p>
            </div>
            {file && (
              <span className="text-xs font-semibold px-3 py-1 bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 rounded-lg">
                {(file.size / (1024 * 1024)).toFixed(1)} MB
              </span>
            )}
          </div>
        </div>

        {/* Pre-processing Summary Card */}
        {file && !isProcessing && status === "idle" && (
          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3 text-xs text-slate-300">
            <h4 className="font-bold text-white text-sm">What will happen next:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex items-start gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Text content & headings will be extracted by local OCR</span>
              </div>
              <div className="flex items-start gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Tables & charts isolated into graphic crop references</span>
              </div>
              <div className="flex items-start gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Non-hallucinated Markdown & JSON outputs generated</span>
              </div>
            </div>
          </div>
        )}

        {/* Start OCR Action Button */}
        <button
          onClick={handleStartOcr}
          disabled={!file || isProcessing}
          className="w-full py-4 px-6 rounded-2xl font-bold text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-cyan-600/30 transition-all flex items-center justify-center gap-2 text-base"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Extracting Information... ({Math.round(progress * 100)}%)</span>
            </>
          ) : (
            <>
              <FileText className="h-5 w-5" />
              <span>Extract Information from PDF</span>
            </>
          )}
        </button>

        {/* Progress Bar */}
        {status !== "idle" && (
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

        {/* Collapsible Advanced Settings (Progressive Disclosure) */}
        <div className="pt-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            <Sliders className="h-4 w-4 text-cyan-400" />
            <span>⚙ Advanced Settings</span>
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showAdvanced && (
            <div className="mt-4 p-5 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs">
              <div className="max-w-md">
                <div className="flex justify-between items-center font-semibold text-slate-200 mb-1">
                  <label>Quality Review Threshold</label>
                  <span className="font-mono text-amber-400">{(ocrReviewThreshold * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.60"
                  max="0.90"
                  step="0.05"
                  value={ocrReviewThreshold}
                  onChange={(e) => setOcrReviewThreshold(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <p className="text-slate-400 text-[11px] mt-1">
                  Slides with OCR confidence score below <span className="text-amber-300 font-mono">{(ocrReviewThreshold * 100).toFixed(0)}%</span> are flagged as requiring manual review.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* OCR Results Inspector */}
      {result && result.pages && result.pages.length > 0 && (
        <div className="glass-panel p-8 rounded-3xl space-y-6">
          {/* Result Header & Friendly View Tabs */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FileCode className="h-5 w-5 text-cyan-400" />
                Extracted Document Results ({result.total_pages} Pages)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {result.needs_review_count > 0 ? (
                  <span className="text-amber-400 font-semibold flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {result.needs_review_count} page(s) flagged for manual review
                  </span>
                ) : (
                  <span className="text-emerald-400 font-semibold">✓ High confidence extraction across all pages</span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 space-x-1">
                <button
                  onClick={() => setViewMode("overview")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    viewMode === "overview" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setViewMode("text")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    viewMode === "text" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Text Content
                </button>
                <button
                  onClick={() => setViewMode("visuals")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    viewMode === "visuals" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Visuals & Charts
                </button>
                <button
                  onClick={() => setViewMode("json")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    viewMode === "json" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Raw Data (JSON)
                </button>
              </div>

              {jobId && (
                <a
                  href={`${API_BASE}/api/ocr/export/${jobId}/md`}
                  download
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2 transition-all"
                >
                  <Download className="h-4 w-4 text-cyan-400" />
                  Download Markdown
                </a>
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
            <div className="lg:col-span-3 glass-card p-6 rounded-2xl border border-slate-800 space-y-4 min-h-[450px]">
              {activePage && (viewMode === "overview" || viewMode === "text") && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="text-base font-bold text-white">Slide #{activePage.page} Content Summary</h4>
                    <button
                      onClick={handleCopyMarkdown}
                      className="px-3.5 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl flex items-center gap-1.5 transition-all"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copied ? "Copied!" : "Copy Markdown"}
                    </button>
                  </div>

                  <div className="bg-slate-950 p-5 rounded-2xl font-mono text-xs text-slate-300 space-y-4 border border-slate-800">
                    <p className="text-indigo-400 font-bold text-sm">## Slide {activePage.page}</p>
                    {activePage.elements.map((elem, i) => (
                      <div key={i} className="pl-3 border-l-2 border-slate-800 space-y-1">
                        <span className="text-slate-500 uppercase text-[10px] block font-sans font-bold">{elem.type}</span>
                        <p className="text-slate-200 leading-relaxed">{elem.text}</p>
                      </div>
                    ))}
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

"use client";

import React, { useState, useEffect } from "react";
import { Upload, Video, Play, Download, Trash2, CheckCircle, RefreshCw, Sliders, ArrowRight, Clock, AlertTriangle, Sparkles, ChevronLeft, ChevronRight, Eye, ChevronDown, ChevronUp, Layers, Check } from "lucide-react";
import { uploadVideo, fetchVideoJobSlides, updateSlideSelection, rebuildPdf, SlideCandidate, API_BASE } from "../lib/api";
import { SlideReviewModal } from "./SlideReviewModal";

interface Tool1Props {
  onSendToOcr?: (pdfUrl: string) => void;
}

const LOCAL_STORAGE_KEY = "doc_intel_active_video_job";
const SLIDES_PER_PAGE = 12;

export const Tool1VideoToPdf: React.FC<Tool1Props> = ({ onSendToOcr }) => {
  const [file, setFile] = useState<File | null>(null);
  const [duplicateThreshold, setDuplicateThreshold] = useState<number>(0.75);
  const [sampleFps, setSampleFps] = useState<number>(5.0);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("idle");
  const [progress, setProgress] = useState<number>(0);
  const [message, setMessage] = useState<string>("");
  const [slides, setSlides] = useState<SlideCandidate[]>([]);
  const [outputPdf, setOutputPdf] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal Review state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalSlideIdx, setModalSlideIdx] = useState<number>(0);

  // Restore active job from localStorage
  useEffect(() => {
    const savedJobId = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedJobId) {
      setJobId(savedJobId);
      setIsProcessing(true);
    }
  }, []);

  // Poll job status until complete
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
        const res = await fetchVideoJobSlides(jobId);
        setStatus(res.status);
        setProgress(res.progress);
        setMessage(res.message);
        if (res.slides && res.slides.length > 0) {
          setSlides(res.slides);
        }
        if (res.output_pdf) {
          setOutputPdf(res.output_pdf);
        }
        if (res.metadata) {
          setMetadata(res.metadata);
        }

        if (res.status === "completed") {
          setIsProcessing(false);
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        } else if (res.status === "failed") {
          setIsProcessing(false);
          setErrorMessage(res.message || "Video processing failed");
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
      } catch (err) {
        console.error("Error polling video job:", err);
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

  const handleStartProcessing = async () => {
    if (!file || isProcessing) return;
    setErrorMessage(null);
    setIsProcessing(true);
    setStatus("processing");
    setProgress(0.05);
    setMessage("Uploading video presentation...");

    try {
      const res = await uploadVideo(file, duplicateThreshold, sampleFps);
      if (res.detail) {
        throw new Error(res.detail);
      }
      setJobId(res.job_id);
      localStorage.setItem(LOCAL_STORAGE_KEY, res.job_id);
    } catch (err: any) {
      console.error(err);
      setStatus("failed");
      setErrorMessage(err.message || "Upload failed");
      setIsProcessing(false);
    }
  };

  const handleToggleSlide = async (slideId: number) => {
    const updated = slides.map((s) =>
      s.slide_id === slideId ? { ...s, is_selected: !s.is_selected } : s
    );
    setSlides(updated);
    if (jobId) {
      await updateSlideSelection(jobId, updated);
    }
  };

  const handleDeleteSlide = async (slideId: number) => {
    const updated = slides.filter((s) => s.slide_id !== slideId);
    setSlides(updated);
    if (jobId) {
      await updateSlideSelection(jobId, updated);
    }
  };

  const handleRebuildPdf = async () => {
    if (!jobId) return;
    try {
      setMessage("Rebuilding PDF from selected slides...");
      const res = await rebuildPdf(jobId);
      setOutputPdf(res.output_pdf);
      setMetadata(res.metadata);
      setMessage("PDF rebuilt successfully!");
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Failed to rebuild PDF");
    }
  };

  const openSlideModal = (idx: number) => {
    setModalSlideIdx(idx);
    setModalOpen(true);
  };

  // Helper step calculator
  const getActiveStep = () => {
    if (status === "idle") return 1;
    if (progress < 0.20) return 2;
    if (progress < 0.85) return 3;
    if (progress < 1.0) return 4;
    return 5;
  };

  const activeStep = getActiveStep();

  // Pagination
  const totalPages = Math.ceil(slides.length / SLIDES_PER_PAGE);
  const displayedSlides = slides.slice(
    (currentPage - 1) * SLIDES_PER_PAGE,
    currentPage * SLIDES_PER_PAGE
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Tool Header */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
            <Video className="h-3.5 w-3.5" />
            WORKFLOW 1 — VIDEO TO SLIDE PDF
          </div>
          <h2 className="text-2xl font-bold text-white">Convert Recorded Presentation into Clean Slide PDF</h2>
          <p className="text-slate-400 text-sm mt-1">
            Detects presentation slides, eliminates duplicate frames, rectifies screen perspective tilt, and generates 1 slide per PDF page.
          </p>
        </div>
      </div>

      {/* Workflow Step Indicator Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800/80">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center text-xs">
          <div className={`p-2.5 rounded-xl border transition-all ${activeStep === 1 ? "bg-indigo-600/20 border-indigo-500 text-white font-bold" : activeStep > 1 ? "bg-slate-900 border-slate-800 text-emerald-400" : "bg-slate-950/40 border-slate-900 text-slate-500"}`}>
            <span>1. Upload Video</span>
          </div>
          <div className={`p-2.5 rounded-xl border transition-all ${activeStep === 2 ? "bg-indigo-600/20 border-indigo-500 text-white font-bold" : activeStep > 2 ? "bg-slate-900 border-slate-800 text-emerald-400" : "bg-slate-950/40 border-slate-900 text-slate-500"}`}>
            <span>2. Analyze Video</span>
          </div>
          <div className={`p-2.5 rounded-xl border transition-all ${activeStep === 3 ? "bg-indigo-600/20 border-indigo-500 text-white font-bold" : activeStep > 3 ? "bg-slate-900 border-slate-800 text-emerald-400" : "bg-slate-950/40 border-slate-900 text-slate-500"}`}>
            <span>3. Detect Slides</span>
          </div>
          <div className={`p-2.5 rounded-xl border transition-all ${activeStep === 4 ? "bg-indigo-600/20 border-indigo-500 text-white font-bold" : activeStep > 4 ? "bg-slate-900 border-slate-800 text-emerald-400" : "bg-slate-950/40 border-slate-900 text-slate-500"}`}>
            <span>4. Build PDF</span>
          </div>
          <div className={`p-2.5 rounded-xl border transition-all ${activeStep === 5 ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold" : "bg-slate-950/40 border-slate-900 text-slate-500"}`}>
            <span>5. Complete</span>
          </div>
        </div>
      </div>

      {/* Error Banner */}
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

      {/* Main Upload & Controls Section */}
      <div className="glass-panel p-8 rounded-3xl space-y-6">
        <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500/50 rounded-2xl p-10 text-center transition-all bg-slate-900/40 relative">
          <input
            type="file"
            accept="video/mp4,video/mov,video/mkv,video/avi"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center gap-3">
            <div className="h-16 w-16 rounded-2xl bg-indigo-600/20 flex items-center justify-center text-indigo-400">
              <Video className="h-8 w-8" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-200">
                {file ? file.name : "Drop your recorded presentation video here"}
              </p>
              <p className="text-xs text-slate-400 mt-1">Supports MP4, MOV, MKV, AVI (Smartphone recordings up to 2 GB)</p>
            </div>
            {file && (
              <span className="text-xs font-semibold px-3 py-1 bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 rounded-lg">
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
                <span>Camera angle & screen tilt will be rectified automatically</span>
              </div>
              <div className="flex items-start gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Duplicate frames removed while picking the sharpest slide</span>
              </div>
              <div className="flex items-start gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Clean PDF generated with timestamp mapping</span>
              </div>
            </div>
          </div>
        )}

        {/* Start Processing Action */}
        <button
          onClick={handleStartProcessing}
          disabled={!file || isProcessing}
          className="w-full py-4 px-6 rounded-2xl font-bold text-white bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 text-base"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Processing Presentation... ({Math.round(progress * 100)}%)</span>
            </>
          ) : (
            <>
              <Play className="h-5 w-5 fill-current" />
              <span>Convert to Clean Slide PDF</span>
            </>
          )}
        </button>

        {/* Progress Bar */}
        {status !== "idle" && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-300 font-medium">
              <span>{message}</span>
              <span className="font-mono text-indigo-400 font-bold">{Math.round(progress * 100)}%</span>
            </div>
            <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-cyan-400 transition-all duration-300 rounded-full"
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
            <Sliders className="h-4 w-4 text-indigo-400" />
            <span>⚙ Advanced Engine Settings</span>
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showAdvanced && (
            <div className="mt-4 p-5 bg-slate-900/90 rounded-2xl border border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div>
                <div className="flex justify-between items-center font-semibold text-slate-200 mb-1">
                  <label>Duplicate Sensitivity</label>
                  <span className="font-mono text-indigo-400">{(duplicateThreshold * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.70"
                  max="0.90"
                  step="0.05"
                  value={duplicateThreshold}
                  onChange={(e) => setDuplicateThreshold(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <p className="text-slate-400 text-[11px] mt-1">Controls how aggressively similar frames are merged into one slide.</p>
              </div>

              <div>
                <div className="flex justify-between items-center font-semibold text-slate-200 mb-1">
                  <label>Base Frame Sample Rate</label>
                  <span className="font-mono text-indigo-400">{sampleFps} FPS</span>
                </div>
                <select
                  value={sampleFps}
                  onChange={(e) => setSampleFps(parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-xl p-2 focus:border-indigo-500"
                >
                  <option value={5.0}>5 FPS (Default - Balanced)</option>
                  <option value={10.0}>10 FPS (High Detail)</option>
                  <option value={15.0}>15 FPS (Rapid Slides)</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Completion Summary & Slide Inspector */}
      {slides.length > 0 && (
        <div className="glass-panel p-8 rounded-3xl space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="text-xl font-bold text-white">
                  Slide Review ({slides.filter((s) => s.is_selected).length} / {slides.length} Unique Slides Selected)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Click any slide card to open full-screen preview with keyboard navigation (← / →).
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRebuildPdf}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-2 transition-all"
              >
                <RefreshCw className="h-4 w-4 text-indigo-400" />
                Rebuild PDF
              </button>

              {outputPdf && (
                <a
                  href={`${API_BASE}/data/processed/${jobId}_slides.pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </a>
              )}

              {outputPdf && onSendToOcr && (
                <button
                  onClick={() => onSendToOcr(`${API_BASE}/data/processed/${jobId}_slides.pdf`)}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
                >
                  <span>Extract Text in Tool 2</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Grid of Slide Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayedSlides.map((slide, pageRelativeIdx) => {
              const globalIdx = (currentPage - 1) * SLIDES_PER_PAGE + pageRelativeIdx;
              const relImgPath = slide.image_path.split("data")[1] || slide.image_path;
              const imgUrl = `${API_BASE}/data${relImgPath.replace(/\\/g, "/")}`;

              return (
                <div
                  key={slide.slide_id}
                  className={`glass-card rounded-2xl overflow-hidden border p-3 flex flex-col justify-between space-y-3 transition-all ${
                    slide.is_selected ? "border-indigo-500/40 bg-slate-900/60" : "border-slate-800 opacity-40"
                  }`}
                >
                  <div
                    onClick={() => openSlideModal(globalIdx)}
                    className="relative group rounded-xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center cursor-pointer"
                  >
                    <img src={imgUrl} alt={`Slide ${slide.slide_id}`} loading="lazy" className="object-contain w-full h-full" />
                    
                    <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-indigo-300 font-bold border border-slate-800">
                      Slide #{slide.slide_id}
                    </div>

                    <div className="absolute inset-0 bg-indigo-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-xs font-semibold text-white">
                      <Eye className="h-4 w-4" />
                      <span>Preview</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-slate-400">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-slate-300 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-indigo-400" />
                        {slide.timestamp}
                      </span>
                      <span className="font-mono text-emerald-400 font-semibold">{Math.round(slide.quality_score * 100)}% Quality</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => handleToggleSlide(slide.slide_id)}
                      className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        slide.is_selected
                          ? "bg-indigo-600/20 border border-indigo-500/30 text-indigo-300"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      {slide.is_selected ? "Included" : "Excluded"}
                    </button>

                    <button
                      onClick={() => handleDeleteSlide(slide.slide_id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                      title="Delete Slide"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-800/80 text-xs">
              <span className="text-slate-400">
                Page <strong className="text-white">{currentPage}</strong> of <strong className="text-white">{totalPages}</strong> ({slides.length} total slides)
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 flex items-center gap-1 hover:bg-slate-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 flex items-center gap-1 hover:bg-slate-800"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Slide Inspection Modal */}
      <SlideReviewModal
        isOpen={modalOpen}
        slides={slides}
        currentSlideIdx={modalSlideIdx}
        onClose={() => setModalOpen(false)}
        onSelectSlideIdx={(idx) => setModalSlideIdx(idx)}
        onToggleSlide={handleToggleSlide}
        onDeleteSlide={handleDeleteSlide}
      />
    </div>
  );
};

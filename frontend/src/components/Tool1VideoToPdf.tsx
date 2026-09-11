"use client";

import React, { useState, useEffect } from "react";
import { Upload, Video, Play, Download, Trash2, CheckCircle, RefreshCw, Sliders, ArrowRight, Clock, AlertTriangle, Sparkles, ChevronLeft, ChevronRight, Eye, ChevronDown, ChevronUp, Layers, Check, FileText, Plus } from "lucide-react";
import { uploadVideo, fetchVideoJobSlides, updateSlideSelection, rebuildPdf, SlideCandidate, API_BASE, getVideoPdfUrl } from "../lib/api";
import { SlideReviewModal } from "./SlideReviewModal";
import { PdfViewer } from "./PdfViewer";


interface Tool1Props {
  onSendToOcr?: (pdfUrl: string) => void;
  selectedJobId?: string | null;
}

const LOCAL_STORAGE_KEY = "doc_intel_active_video_job";
const SLIDES_PER_PAGE = 12;

export const Tool1VideoToPdf: React.FC<Tool1Props> = ({ onSendToOcr, selectedJobId }) => {
  const [file, setFile] = useState<File | null>(null);
  const [duplicateThreshold, setDuplicateThreshold] = useState<number>(0.75);
  const [sampleFps, setSampleFps] = useState<number>(1.0);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [showPdfViewer, setShowPdfViewer] = useState<boolean>(false);
  
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

  const loadVideoJob = async (targetJobId: string) => {
    setIsProcessing(true);
    try {
      const res = await fetchVideoJobSlides(targetJobId);
      setStatus(res.status);
      setProgress(res.progress);
      setMessage(res.message);
      if (res.slides) setSlides(res.slides);
      if (res.output_pdf) setOutputPdf(res.output_pdf);
      if (res.metadata) setMetadata(res.metadata);
      
      if (res.status === "completed" || res.status === "failed" || res.status === "cancelled") {
        setIsProcessing(false);
      }
    } catch (err: any) {
      console.error("Error loading video job:", err);
      setIsProcessing(false);
    }
  };

  // Restore active job from props or localStorage
  useEffect(() => {
    if (selectedJobId) {
      setJobId(selectedJobId);
      loadVideoJob(selectedJobId);
    } else {
      const savedJobId = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedJobId) {
        setJobId(savedJobId);
        loadVideoJob(savedJobId);
      }
    }
  }, [selectedJobId]);

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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Workflow Step Indicator Bar */}
      <div className="bg-[#17171a] p-3 rounded-xl border border-[#24242a]">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center text-xs">
          <div className={`p-2 rounded-lg border transition-all ${activeStep === 1 ? "bg-[#24242a] border-[#383842] text-white font-medium" : activeStep > 1 ? "bg-[#1c1c20] border-[#24242a] text-slate-300" : "bg-[#17171a] border-transparent text-slate-500"}`}>
            <span>1. Unggah Video</span>
          </div>
          <div className={`p-2 rounded-lg border transition-all ${activeStep === 2 ? "bg-[#24242a] border-[#383842] text-white font-medium" : activeStep > 2 ? "bg-[#1c1c20] border-[#24242a] text-slate-300" : "bg-[#17171a] border-transparent text-slate-500"}`}>
            <span>2. Analisis Video</span>
          </div>
          <div className={`p-2 rounded-lg border transition-all ${activeStep === 3 ? "bg-[#24242a] border-[#383842] text-white font-medium" : activeStep > 3 ? "bg-[#1c1c20] border-[#24242a] text-slate-300" : "bg-[#17171a] border-transparent text-slate-500"}`}>
            <span>3. Deteksi Slide</span>
          </div>
          <div className={`p-2 rounded-lg border transition-all ${activeStep === 4 ? "bg-[#24242a] border-[#383842] text-white font-medium" : activeStep > 4 ? "bg-[#1c1c20] border-[#24242a] text-slate-300" : "bg-[#17171a] border-transparent text-slate-500"}`}>
            <span>4. Buat PDF</span>
          </div>
          <div className={`p-2 rounded-lg border transition-all ${activeStep === 5 ? "bg-[#222228] border-[#383844] text-white font-medium" : "bg-[#17171a] border-transparent text-slate-500"}`}>
            <span>5. Selesai</span>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-[#222228] border border-[#383844] text-slate-200 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-white shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-xs text-slate-400 hover:text-white font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {/* Upload Section (Shown only when no active video result session is loaded) */}
      {slides.length === 0 && !outputPdf && (
        <div className="bg-[#17171a] border border-[#24242a] p-6 rounded-2xl space-y-6">
          <div className="border border-dashed border-[#33333d] hover:border-slate-500 rounded-xl p-8 text-center transition-all bg-[#141416] relative">
            <input
              type="file"
              accept="video/mp4,video/mov,video/mkv,video/avi"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-[#222228] flex items-center justify-center text-white border border-[#2e2e36]">
                <Video className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">
                  {file ? file.name : "Drop recorded presentation video here"}
                </p>
                <p className="text-xs text-slate-500 mt-1">Supports MP4, MOV, MKV, AVI (Smartphone recordings up to 2 GB)</p>
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
                  <Check className="h-4 w-4 text-white shrink-0 mt-0.5" />
                  <span>Koreksi posisi miring otomatis</span>
                </div>
                <div className="flex items-start gap-2 bg-[#1c1c20] p-2.5 rounded-lg border border-[#26262c]">
                  <Check className="h-4 w-4 text-white shrink-0 mt-0.5" />
                  <span>Deteksi & hapus duplikat</span>
                </div>
                <div className="flex items-start gap-2 bg-[#1c1c20] p-2.5 rounded-lg border border-[#26262c]">
                  <Check className="h-4 w-4 text-white shrink-0 mt-0.5" />
                  <span>Buat PDF slide bersih</span>
                </div>
              </div>
            </div>
          )}

          {/* Start Processing Action */}
          <button
            onClick={handleStartProcessing}
            disabled={!file || isProcessing}
            className="w-full py-3 px-5 rounded-xl font-medium text-xs text-white bg-[#222228] hover:bg-[#2c2c36] disabled:opacity-50 disabled:cursor-not-allowed border border-[#33333d] transition-all flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-white" />
                <span>Memproses Video... ({Math.round(progress * 100)}%)</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current text-white" />
                <span>Proses Video & Ekstrak Slide</span>
              </>
            )}
          </button>

          {/* Progress Bar */}
          {status !== "idle" && status !== "completed" && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-300 font-medium">
                <span>{message}</span>
                <span className="font-mono text-white font-bold">{Math.round(progress * 100)}%</span>
              </div>
              <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-slate-300 transition-all duration-300 rounded-full"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loaded Video Session Header */}
      {(slides.length > 0 || outputPdf) && (
        <div className="bg-[#17171a] p-4 rounded-2xl border border-[#24242a] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-[#222228] border border-[#33333d] flex items-center justify-center text-white shrink-0">
              <Video className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2 truncate">
                <span className="truncate">{metadata?.document_name || "Video Presentation Session"}</span>
                <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-[#222228] text-slate-200 border border-[#33333d] shrink-0">
                  {slides.length} Slides Extracted
                </span>
              </h2>
            </div>
          </div>

          <button
            onClick={() => {
              setSlides([]);
              setOutputPdf(null);
              setJobId(null);
              setStatus("idle");
              setFile(null);
            }}
            className="px-3.5 py-1.5 bg-[#222228] hover:bg-[#2e2e38] text-slate-300 text-xs font-medium rounded-xl border border-[#2e2e36] flex items-center gap-1.5 transition-all shrink-0"
          >
            <Plus className="h-4 w-4 text-white" />
            <span>Process Another Video</span>
          </button>
        </div>
      )}

      {/* Completion Summary & Slide Inspector */}
      {slides.length > 0 && (
        <div className="bg-[#17171a] border border-[#24242a] p-8 rounded-3xl space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#24242a] pb-4">
            <div>
              <h3 className="text-lg font-bold text-white">
                {slides.length} Slides
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRebuildPdf}
                className="px-4 py-2 bg-[#222228] hover:bg-[#2c2c36] text-slate-200 text-xs font-semibold rounded-xl border border-[#33333d] flex items-center gap-2 transition-all"
              >
                <RefreshCw className="h-4 w-4 text-white" />
                Rebuild PDF
              </button>

              {outputPdf && jobId && (
                <button
                  onClick={() => setShowPdfViewer(!showPdfViewer)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border ${
                    showPdfViewer
                      ? "bg-[#2c2c36] border-[#444450] text-white"
                      : "bg-[#222228] hover:bg-[#2c2c36] border-[#33333d] text-slate-200"
                  }`}
                >
                  <FileText className="h-4 w-4 text-white" />
                  {showPdfViewer ? "Hide PDF Viewer" : "View PDF"}
                </button>
              )}

              {outputPdf && jobId && (
                <a
                  href={getVideoPdfUrl(jobId, false)}
                  download
                  className="px-4 py-2 bg-white hover:bg-slate-200 text-black text-xs font-bold rounded-xl border border-white flex items-center gap-2 transition-all"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </a>
              )}

              {outputPdf && onSendToOcr && jobId && (
                <button
                  onClick={() => onSendToOcr(getVideoPdfUrl(jobId, false))}
                  className="px-4 py-2 bg-[#222228] hover:bg-[#2c2c36] text-white text-xs font-bold rounded-xl border border-[#33333d] flex items-center gap-2 transition-all"
                >
                  <span>Extract Text in Tool 2</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Embedded PDF Viewer Panel */}
          {showPdfViewer && jobId && (
            <div className="pt-2">
              <PdfViewer
                jobId={jobId}
                sourceType="video"
                title="Compiled Slide PDF Viewer"
              />
            </div>
          )}


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

"use client";

import React, { useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Clock, Trash2, CheckCircle, Sparkles, ShieldCheck } from "lucide-react";
import { SlideCandidate, API_BASE } from "../lib/api";

interface SlideReviewModalProps {
  isOpen: boolean;
  slides: SlideCandidate[];
  currentSlideIdx: number;
  onClose: () => void;
  onSelectSlideIdx: (idx: number) => void;
  onToggleSlide: (slideId: number) => void;
  onDeleteSlide: (slideId: number) => void;
}

export const SlideReviewModal: React.FC<SlideReviewModalProps> = ({
  isOpen,
  slides,
  currentSlideIdx,
  onClose,
  onSelectSlideIdx,
  onToggleSlide,
  onDeleteSlide,
}) => {
  if (!isOpen || slides.length === 0) return null;

  const activeSlide = slides[currentSlideIdx] || slides[0];

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onSelectSlideIdx(Math.max(0, currentSlideIdx - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onSelectSlideIdx(Math.min(slides.length - 1, currentSlideIdx + 1));
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Delete") {
        e.preventDefault();
        if (activeSlide) {
          onDeleteSlide(activeSlide.slide_id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentSlideIdx, slides, activeSlide, onSelectSlideIdx, onClose, onDeleteSlide]);

  const relImgPath = activeSlide.image_path.split("data")[1] || activeSlide.image_path;
  const activeImgUrl = `${API_BASE}/data${relImgPath.replace(/\\/g, "/")}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 md:p-6">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-indigo-600/20 text-indigo-300 border border-indigo-500/30">
              Slide #{activeSlide.slide_id}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Timestamp: {activeSlide.timestamp} (Frame #{activeSlide.frame_idx})
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500 hidden sm:inline">
              Shortcuts: <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">←</kbd> <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">→</kbd> <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">Esc</kbd>
            </span>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-4 gap-0">
          {/* Main Large Preview Area */}
          <div className="lg:col-span-3 p-6 bg-slate-950 flex flex-col justify-between items-center relative overflow-hidden">
            <div className="relative w-full h-full max-h-[60vh] flex items-center justify-center">
              <img
                src={activeImgUrl}
                alt={`Slide ${activeSlide.slide_id}`}
                className="max-h-full max-w-full object-contain rounded-xl shadow-xl border border-slate-800/80"
              />
            </div>

            {/* Previous / Next Overlay Controls */}
            <button
              onClick={() => onSelectSlideIdx(Math.max(0, currentSlideIdx - 1))}
              disabled={currentSlideIdx === 0}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-slate-900/80 border border-slate-800 hover:bg-slate-800 text-white rounded-2xl disabled:opacity-30 transition-all backdrop-blur-md"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={() => onSelectSlideIdx(Math.min(slides.length - 1, currentSlideIdx + 1))}
              disabled={currentSlideIdx === slides.length - 1}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-slate-900/80 border border-slate-800 hover:bg-slate-800 text-white rounded-2xl disabled:opacity-30 transition-all backdrop-blur-md"
            >
              <ChevronRight className="h-6 w-6" />
            </button>

            {/* Bottom Actions Bar */}
            <div className="w-full pt-4 border-t border-slate-900 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-4 font-mono">
                <span>Quality: <strong className="text-emerald-400">{Math.round(activeSlide.quality_score * 100)}%</strong></span>
                <span>Sharpness: <strong className="text-indigo-400">{activeSlide.sharpness}</strong></span>
                {activeSlide.quad_detected && <span className="text-emerald-400 flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Rectified</span>}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleSlide(activeSlide.slide_id)}
                  className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                    activeSlide.is_selected
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  <CheckCircle className="h-4 w-4" />
                  {activeSlide.is_selected ? "Included in PDF" : "Excluded"}
                </button>

                <button
                  onClick={() => onDeleteSlide(activeSlide.slide_id)}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                  title="Delete Slide"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Thumbnail Navigation Sidebar */}
          <div className="p-4 bg-slate-900/90 border-l border-slate-800 overflow-y-auto space-y-3 max-h-[65vh] lg:max-h-full">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">All Slides ({slides.length})</h4>
            <div className="space-y-2">
              {slides.map((s, idx) => {
                const sImgRel = s.image_path.split("data")[1] || s.image_path;
                const sUrl = `${API_BASE}/data${sImgRel.replace(/\\/g, "/")}`;

                return (
                  <button
                    key={s.slide_id}
                    onClick={() => onSelectSlideIdx(idx)}
                    className={`w-full p-2 rounded-xl border text-left transition-all flex items-center gap-3 ${
                      currentSlideIdx === idx
                        ? "bg-indigo-950/60 border-indigo-500/60 text-white"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    } ${!s.is_selected ? "opacity-40" : ""}`}
                  >
                    <div className="w-16 aspect-video bg-slate-950 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                      <img src={sUrl} alt={`Slide ${s.slide_id}`} className="object-contain w-full h-full" />
                    </div>
                    <div className="text-[11px] font-mono leading-tight">
                      <p className="font-bold text-white">Slide #{s.slide_id}</p>
                      <p className="text-slate-500 mt-0.5">{s.timestamp}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

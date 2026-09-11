"use client";

import React, { useState } from "react";
import { Download, ExternalLink, Maximize2, Minimize2, ZoomIn, ZoomOut, FileText, CheckCircle2, ShieldCheck } from "lucide-react";
import { getOcrExportUrl, getVideoPdfUrl } from "../lib/api";

interface PdfViewerProps {
  jobId: string;
  sourceType: "ocr" | "video";
  availableFormats?: Array<"pdf" | "report" | "original">;
  title?: string;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  jobId,
  sourceType,
  availableFormats = ["pdf", "report", "original"],
  title = "Document PDF Viewer"
}) => {
  const [selectedFormat, setSelectedFormat] = useState<"pdf" | "report" | "original">(
    availableFormats[0] || "pdf"
  );
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [pdfError, setPdfError] = useState<boolean>(false);

  // Compute stream URL & download URL
  const pdfStreamUrl =
    sourceType === "ocr"
      ? getOcrExportUrl(jobId, selectedFormat, true)
      : getVideoPdfUrl(jobId, true);

  const pdfDownloadUrl =
    sourceType === "ocr"
      ? getOcrExportUrl(jobId, selectedFormat, false)
      : getVideoPdfUrl(jobId, false);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(200, prev + 15));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(60, prev - 15));
  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  return (
    <div
      className={`glass-card rounded-2xl border border-slate-800 transition-all ${
        isFullscreen
          ? "fixed inset-4 z-50 bg-[#0f0f13] flex flex-col p-4 shadow-2xl"
          : "p-4 space-y-4"
      }`}
    >
      {/* Header bar & controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              {title}
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                Interactive Viewer
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Prinjau dan unduh dokumen PDF beresolusi tinggi langsung di peramban
            </p>
          </div>
        </div>

        {/* Format Selector & Viewer Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          {sourceType === "ocr" && availableFormats.length > 1 && (
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 space-x-1">
              {availableFormats.includes("pdf") && (
                <button
                  onClick={() => {
                    setSelectedFormat("pdf");
                    setPdfError(false);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    selectedFormat === "pdf"
                      ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Searchable PDF (Dengan Lapisan Teks Invisible)"
                >
                  Searchable PDF
                </button>
              )}
              {availableFormats.includes("report") && (
                <button
                  onClick={() => {
                    setSelectedFormat("report");
                    setPdfError(false);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    selectedFormat === "report"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Formatted PDF Report (Teks Rapih & Gambar)"
                >
                  Laporan PDF
                </button>
              )}
              {availableFormats.includes("original") && (
                <button
                  onClick={() => {
                    setSelectedFormat("original");
                    setPdfError(false);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    selectedFormat === "original"
                      ? "bg-slate-800 text-slate-200"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Original PDF Uploaded"
                >
                  Asli
                </button>
              )}
            </div>
          )}

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-[11px] font-mono text-cyan-400 px-1 font-bold">
              {zoomLevel}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>

            <div className="h-4 w-[1px] bg-slate-800 mx-1" />

            <button
              onClick={toggleFullscreen}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4 text-amber-400" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>

            <a
              href={pdfStreamUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Buka Tab Baru"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          {/* Download Action Button */}
          <a
            href={pdfDownloadUrl}
            download
            className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
          >
            <Download className="h-4 w-4" />
            <span>Download</span>
          </a>
        </div>
      </div>

      {/* PDF View Container */}
      <div
        className={`bg-slate-950 rounded-xl overflow-hidden border border-slate-800 relative flex items-center justify-center ${
          isFullscreen ? "flex-1 w-full" : "h-[620px]"
        }`}
      >
        {!pdfError ? (
          <iframe
            src={`${pdfStreamUrl}#zoom=${zoomLevel}`}
            className="w-full h-full border-none transition-transform duration-200"
            title={title}
            onError={() => setPdfError(true)}
          />
        ) : (
          <div className="p-8 text-center space-y-4 max-w-md">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h5 className="text-sm font-bold text-white">
                Prinjau Peramban Tidak Tersedia
              </h5>
              <p className="text-xs text-slate-400 mt-1">
                Peramban Anda tidak dapat memuat pratinjau PDF langsung di dalam frame. Anda dapat membuka atau mengunduh berkas secara langsung.
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <a
                href={pdfStreamUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4 text-cyan-400" />
                Buka di Tab Baru
              </a>
              <a
                href={pdfDownloadUrl}
                download
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Unduh PDF
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

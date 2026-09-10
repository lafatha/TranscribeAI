"use client";

import React, { useState, useEffect } from "react";
import { 
  Video, 
  FileText, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  RefreshCw, 
  Search,
  Upload,
  Sparkles,
  SlidersHorizontal,
  ChevronRight
} from "lucide-react";
import { fetchBatchJobs, BatchJob } from "../lib/api";

interface DashboardHomeProps {
  onSelectWorkflow: (workflow: "video" | "ocr" | "search") => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({ onSelectWorkflow }) => {
  const [recentJobs, setRecentJobs] = useState<BatchJob[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadRecent = async () => {
      try {
        const data = await fetchBatchJobs();
        setRecentJobs(data.jobs.slice(0, 5) || []);
      } catch (err) {
        console.error(err);
      }
    };
    loadRecent();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSelectWorkflow("search");
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-10">
      {/* Central Welcome Header (Claude/Perplexity Style) */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl md:text-4xl font-normal text-[#ececee] tracking-tight">
          Apa yang ingin Anda proses?
        </h1>
      </div>

      {/* Central Interactive Search / Action Bar */}
      <div className="bg-[#1c1c20] border border-[#28282e] rounded-2xl p-3 shadow-xl space-y-3">
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kata kunci di slide atau pilih alur kerja di bawah..."
            className="w-full bg-transparent text-sm text-[#ececee] placeholder-slate-500 focus:outline-none px-3 py-2"
          />
        </form>

        {/* Action Pills Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#26262c] px-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectWorkflow("video")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#24242a] hover:bg-[#2b2b32] border border-[#303038] text-xs font-medium text-slate-200 transition-colors"
            >
              <Video className="h-3.5 w-3.5 text-indigo-400" />
              <span>Video → PDF</span>
            </button>

            <button
              onClick={() => onSelectWorkflow("ocr")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#24242a] hover:bg-[#2b2b32] border border-[#303038] text-xs font-medium text-slate-200 transition-colors"
            >
              <FileText className="h-3.5 w-3.5 text-cyan-400" />
              <span>PDF → OCR</span>
            </button>

            <button
              onClick={() => onSelectWorkflow("search")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#24242a] hover:bg-[#2b2b32] border border-[#303038] text-xs font-medium text-slate-200 transition-colors"
            >
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <span>Cari Dokumen</span>
            </button>
          </div>

        </div>
      </div>

      {/* Structured Workflow Card List (Inspired by Claude Setup Card) */}
      <div className="bg-[#17171a] border border-[#24242a] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between text-xs font-medium text-slate-400 border-b border-[#24242a] pb-3">
          <span>Pilihan Alur Kerja Engine</span>
          <span className="text-slate-500">2 Workflow Aktif</span>
        </div>

        <div className="space-y-2">
          {/* Item 1: Video to PDF */}
          <div
            onClick={() => onSelectWorkflow("video")}
            className="group cursor-pointer flex items-center justify-between p-3.5 rounded-xl bg-[#1c1c20] hover:bg-[#222228] border border-[#26262c] hover:border-[#383842] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Video className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors">
                  1. Rekaman Video Layar → Slide PDF Bersih
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Hapus frame duplikat otomatis dan atur sudut rekaman HP secara otomatis.
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
          </div>

          {/* Item 2: PDF to OCR */}
          <div
            onClick={() => onSelectWorkflow("ocr")}
            className="group cursor-pointer flex items-center justify-between p-3.5 rounded-xl bg-[#1c1c20] hover:bg-[#222228] border border-[#26262c] hover:border-[#383842] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors">
                  2. Document PDF → Ekstraksi Teks, Tabel & Grafik (OCR)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Ekstrak judul, teks, tabel, dan diagram menjadi data terstruktur Markdown / JSON.
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </div>

      {/* Recent Processing Activity Section */}
      <div className="bg-[#17171a] border border-[#24242a] rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#24242a]">
          <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            Riwayat Pemrosesan Dokumen
          </h3>
          <button
            onClick={() => onSelectWorkflow("search")}
            className="text-[11px] text-slate-400 hover:text-slate-200 font-medium transition-colors"
          >
            Lihat Semua
          </button>
        </div>

        {recentJobs.length > 0 ? (
          <div className="space-y-1">
            {recentJobs.map((job) => {
              const filename = job.file_path.split(/[\/\\]/).pop();
              const isCompleted = job.status === "completed";
              const isProcessing = job.status === "processing";

              return (
                <div
                  key={job.id}
                  onClick={() => onSelectWorkflow(job.job_type === "video_to_pdf" ? "video" : "ocr")}
                  className="cursor-pointer flex items-center justify-between p-2.5 rounded-lg hover:bg-[#1f1f24] transition-colors text-xs text-slate-300"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="font-mono text-slate-200 truncate">{filename}</span>
                    <span className="text-[10px] text-slate-500 uppercase px-1.5 py-0.5 rounded bg-[#222228] border border-[#2c2c34]">
                      {job.job_type === "video_to_pdf" ? "Video → PDF" : "PDF → OCR"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3" />
                        Selesai
                      </span>
                    )}
                    {isProcessing && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 animate-pulse">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Processing ({Math.round(job.progress * 100)}%)
                      </span>
                    )}
                    {!isCompleted && !isProcessing && (
                      <span className="text-[10px] text-slate-500">
                        {job.status}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-500 italic">
            Belum ada dokumen yang diproses.
          </div>
        )}
      </div>
    </div>
  );
};

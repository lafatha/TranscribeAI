"use client";

import React, { useState, useEffect } from "react";
import { Video, FileText, ArrowRight, ShieldCheck, Clock, CheckCircle2, AlertCircle, RefreshCw, Sparkles, Layers } from "lucide-react";
import { fetchBatchJobs, BatchJob, API_BASE } from "../lib/api";

interface DashboardHomeProps {
  onSelectWorkflow: (workflow: "video" | "ocr" | "search") => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({ onSelectWorkflow }) => {
  const [recentJobs, setRecentJobs] = useState<BatchJob[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadRecent = async () => {
      try {
        const data = await fetchBatchJobs();
        setRecentJobs(data.jobs.slice(0, 5) || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadRecent();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Minimalist Grid Header */}
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Workflows</h1>
          <p className="text-xs text-slate-400">Pilih alur kerja untuk memproses dokumen presentasi</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>100% Offline & Private</span>
        </div>
      </div>

      {/* Two Core Workflow Cards - Minimalist Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Workflow 1: Video to PDF */}
        <div className="group relative rounded-2xl border border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/80 hover:border-indigo-500/40 transition-all p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                <Video className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-medium tracking-wider text-indigo-400 uppercase bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">Alur 1</span>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">Video → Slide PDF</h2>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                Ekstrak rekaman layar video menjadi dokumen PDF slide bersih tanpa slide duplikat.
              </p>
            </div>

            <ul className="space-y-1.5 text-xs text-slate-400 pt-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Deteksi & hapus slide duplikat otomatis</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Koreksi posisi miring & pemotongan bingkai</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => onSelectWorkflow("video")}
            className="w-full py-2.5 px-4 rounded-xl font-medium text-xs text-white bg-indigo-600/90 hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <span>Mulai Konversi Video</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Workflow 2: PDF to OCR */}
        <div className="group relative rounded-2xl border border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/80 hover:border-cyan-500/40 transition-all p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                <FileText className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-medium tracking-wider text-cyan-400 uppercase bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">Alur 2</span>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">PDF → Ekstraksi OCR</h2>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                Ekstrak teks, tabel, dan grafik dari PDF slide menjadi data terstruktur Markdown & JSON.
              </p>
            </div>

            <ul className="space-y-1.5 text-xs text-slate-400 pt-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>OCR 100% lokal tanpa API pihak ketiga</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Deteksi tabel & grafik akurat</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => onSelectWorkflow("ocr")}
            className="w-full py-2.5 px-4 rounded-xl font-medium text-xs text-white bg-cyan-600/90 hover:bg-cyan-500 transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <span>Mulai Ekstraksi OCR</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Recent Activity - Minimalist Table */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-400" />
            Aktivitas Terakhir
          </h3>
          <button
            onClick={() => onSelectWorkflow("search")}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
          >
            <span>Cari semua dokumen</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {recentJobs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-800/40">
                <tr>
                  <th className="py-2 px-3 font-medium">Dokumen</th>
                  <th className="py-2 px-3 font-medium">Alur Kerja</th>
                  <th className="py-2 px-3 font-medium">Status</th>
                  <th className="py-2 px-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {recentJobs.map((job) => {
                  const filename = job.file_path.split(/[\/\\]/).pop();
                  const isCompleted = job.status === "completed";
                  const isProcessing = job.status === "processing";

                  return (
                    <tr key={job.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-white font-mono text-xs">{filename}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-400 text-xs">
                        {job.job_type === "video_to_pdf" ? "Video → PDF" : "PDF → OCR"}
                      </td>
                      <td className="py-2.5 px-3">
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" />
                            Selesai
                          </span>
                        )}
                        {isProcessing && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse">
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Memproses ({Math.round(job.progress * 100)}%)
                          </span>
                        )}
                        {!isCompleted && !isProcessing && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
                            {job.status}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => onSelectWorkflow(job.job_type === "video_to_pdf" ? "video" : "ocr")}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                        >
                          Lihat Hasil
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-500">
            Belum ada dokumen yang diproses. Unggah video atau PDF untuk memulai.
          </div>
        )}
      </div>
    </div>
  );
};

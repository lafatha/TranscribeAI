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
    <div className="space-y-10 max-w-6xl mx-auto">
      {/* Hero Welcome Banner */}
      <div className="glass-panel p-8 md:p-10 rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900/90 via-slate-900/40 to-slate-950/80 space-y-4 text-center md:text-left relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>100% Offline • Air-Gapped • Confidential Document Processing</span>
        </div>
        
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
          Turn Recorded Presentations & PDFs into Structured Intelligence
        </h1>
        <p className="text-slate-400 text-base max-w-2xl">
          Convert smartphone screen recordings into deduplicated slide PDFs, extract tables and charts, and query your presentations locally.
        </p>
      </div>

      {/* Two Core Workflow Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Workflow 1: Video to PDF */}
        <div className="glass-panel p-8 rounded-3xl border border-slate-800 hover:border-indigo-500/50 transition-all group flex flex-col justify-between space-y-6 relative">
          <div className="space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <Video className="h-7 w-7" />
            </div>

            <div>
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Workflow 1</span>
              <h2 className="text-2xl font-bold text-white mt-1">Video → Clean Slide PDF</h2>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                Upload a video recording of a presentation screen. The engine removes duplicate frames, rectifies camera perspective tilt, and generates a clean PDF.
              </p>
            </div>

            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Automatic duplicate slide removal & transition detection</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Perspective transformation & best frame selection</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Timestamp mapping for every slide</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => onSelectWorkflow("video")}
            className="w-full py-4 px-6 rounded-2xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 text-sm"
          >
            <span>Convert Video to PDF</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Workflow 2: PDF to OCR */}
        <div className="glass-panel p-8 rounded-3xl border border-slate-800 hover:border-cyan-500/50 transition-all group flex flex-col justify-between space-y-6 relative">
          <div className="space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
              <FileText className="h-7 w-7" />
            </div>

            <div>
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Workflow 2</span>
              <h2 className="text-2xl font-bold text-white mt-1">PDF → Structured OCR</h2>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                Upload a presentation PDF. The local OCR engine extracts titles, text paragraphs, table structures, and bar/line chart crops without hallucination.
              </p>
            </div>

            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>100% Local OCR (English & Indonesian support)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Chart & table cropping with non-hallucinated Markdown</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Page-by-page JSON schema & quality review flags</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => onSelectWorkflow("ocr")}
            className="w-full py-4 px-6 rounded-2xl font-bold text-white bg-cyan-600 hover:bg-cyan-500 shadow-lg shadow-cyan-600/30 transition-all flex items-center justify-center gap-2 text-sm"
          >
            <span>Extract Text from PDF</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Recent Processing Activity Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-400" />
            Recent Processing Activity
          </h3>
          <button
            onClick={() => onSelectWorkflow("search")}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
          >
            <span>Search all documents</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {recentJobs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4">Workflow</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentJobs.map((job) => {
                  const filename = job.file_path.split(/[\/\\]/).pop();
                  const isCompleted = job.status === "completed";
                  const isProcessing = job.status === "processing";

                  return (
                    <tr key={job.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-white font-mono">{filename}</td>
                      <td className="py-3 px-4 font-mono text-indigo-300">
                        {job.job_type === "video_to_pdf" ? "Video → PDF" : "PDF → OCR"}
                      </td>
                      <td className="py-3 px-4">
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="h-3 w-3" />
                            Completed
                          </span>
                        )}
                        {isProcessing && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 animate-pulse">
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Processing ({Math.round(job.progress * 100)}%)
                          </span>
                        )}
                        {!isCompleted && !isProcessing && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                            {job.status}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => onSelectWorkflow(job.job_type === "video_to_pdf" ? "video" : "ocr")}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                        >
                          View Results
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-500">
            No presentation files processed yet. Upload a video or PDF to get started!
          </div>
        )}
      </div>
    </div>
  );
};

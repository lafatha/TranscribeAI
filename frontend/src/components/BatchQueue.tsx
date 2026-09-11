"use client";

import React, { useState, useEffect } from "react";
import { ListTodo, RefreshCw, XCircle, CheckCircle2, Clock, AlertCircle, Play } from "lucide-react";
import { fetchBatchJobs, cancelBatchJob, retryBatchJob, BatchJob } from "../lib/api";

import { NavTab } from "./Sidebar";

interface BatchQueueProps {
  onSelectJob?: (tab: NavTab, jobId: string) => void;
}

export const BatchQueue: React.FC<BatchQueueProps> = ({ onSelectJob }) => {
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadJobs = async () => {
    try {
      const res = await fetchBatchJobs();
      setJobs(res.jobs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleCancel = async (jobId: string) => {
    await cancelBatchJob(jobId);
    loadJobs();
  };

  const handleRetry = async (jobId: string) => {
    await retryBatchJob(jobId);
    loadJobs();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Banner */}
      <div className="bg-[#151518] p-6 rounded-2xl border border-[#24242a] flex items-center justify-between shadow-lg">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#202026] text-slate-300 text-xs font-medium mb-2 border border-[#2b2b34]">
            <ListTodo className="h-3.5 w-3.5 text-cyan-400" />
            ANTREAN BATCH DOKUMEN
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Pengelola Job Latar Belakang</h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Daftar tugas pemrosesan video & OCR tersimpan secara permanen di SQLite.
          </p>
        </div>

        <button
          onClick={loadJobs}
          className="p-2.5 bg-[#202026] hover:bg-[#282830] text-slate-300 rounded-xl border border-[#2b2b34] transition-all shadow-sm"
          title="Refresh Queue"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Jobs List */}
      <div className="space-y-2.5">
        {jobs.length > 0 ? (
          jobs.map((job) => {
            const isCompleted = job.status === "completed";
            const isFailed = job.status === "failed";
            const isProcessing = job.status === "processing";
            const isQueued = job.status === "queued";
            const isVideo = job.job_type === "video_to_pdf";

            return (
              <div
                key={job.id}
                className="bg-[#151518] p-4 rounded-2xl border border-[#24242a] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-[#383842] transition-all shadow-md"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-semibold text-white text-xs font-mono truncate max-w-[280px]">
                      {job.file_path.split(/[\/\\]/).pop()}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      isVideo ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20" : "bg-cyan-500/10 text-cyan-300 border-cyan-500/20"
                    }`}>
                      {job.job_type.toUpperCase()}
                    </span>

                    {/* Status Badge */}
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3" />
                        Selesai
                      </span>
                    )}
                    {isProcessing && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 animate-pulse">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Memproses ({Math.round(job.progress * 100)}%)
                      </span>
                    )}
                    {isQueued && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Clock className="h-3 w-3" />
                        Dalam Antrean
                      </span>
                    )}
                    {isFailed && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <AlertCircle className="h-3 w-3" />
                        Gagal
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 font-mono">{job.message}</p>
                </div>

                {/* Action Controls */}
                <div className="flex items-center gap-2">
                  {isCompleted && onSelectJob && (
                    <button
                      onClick={() => onSelectJob(isVideo ? "video" : "ocr", job.id)}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-cyan-600/20"
                    >
                      <span>Lihat Hasil</span>
                    </button>
                  )}

                  {(isFailed || job.status === "cancelled") && (
                    <button
                      onClick={() => handleRetry(job.id)}
                      className="px-3 py-1.5 bg-[#202026] hover:bg-[#282830] text-xs font-medium text-indigo-300 rounded-xl border border-[#2b2b34] flex items-center gap-1"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      Coba Lagi
                    </button>
                  )}

                  {(isQueued || isProcessing) && (
                    <button
                      onClick={() => handleCancel(job.id)}
                      className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-medium text-rose-400 rounded-xl border border-rose-500/20 flex items-center gap-1"
                    >
                      <XCircle className="h-3 w-3" />
                      Batalkan
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-[#151518] border border-[#24242a] p-10 text-center text-slate-500 rounded-2xl text-xs">
            Belum ada job pemrosesan di antrean.
          </div>
        )}
      </div>
    </div>
  );
};

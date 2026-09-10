"use client";

import React, { useState, useEffect } from "react";
import { ListTodo, RefreshCw, XCircle, CheckCircle2, Clock, AlertCircle, Play } from "lucide-react";
import { fetchBatchJobs, cancelBatchJob, retryBatchJob, BatchJob } from "../lib/api";

export const BatchQueue: React.FC = () => {
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
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold mb-2">
            <ListTodo className="h-3.5 w-3.5 text-indigo-400" />
            PERSISTENT BATCH QUEUE
          </div>
          <h2 className="text-2xl font-bold text-white">Background Job Manager</h2>
          <p className="text-slate-400 text-sm mt-1">
            Jobs are persisted in SQLite and survive application restarts.
          </p>
        </div>

        <button
          onClick={loadJobs}
          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Jobs List */}
      <div className="space-y-3">
        {jobs.length > 0 ? (
          jobs.map((job) => {
            const isCompleted = job.status === "completed";
            const isFailed = job.status === "failed";
            const isProcessing = job.status === "processing";
            const isQueued = job.status === "queued";

            return (
              <div
                key={job.id}
                className="glass-card p-5 rounded-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-white text-sm">
                      {job.file_path.split(/[\/\\]/).pop()}
                    </span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                      {job.job_type.toUpperCase()}
                    </span>

                    {/* Status Badge */}
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
                    {isQueued && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        <Clock className="h-3 w-3" />
                        Queued
                      </span>
                    )}
                    {isFailed && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        <AlertCircle className="h-3 w-3" />
                        Failed
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 font-mono">{job.message}</p>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2">
                  {(isFailed || job.status === "cancelled") && (
                    <button
                      onClick={() => handleRetry(job.id)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-indigo-300 rounded-lg border border-slate-700 flex items-center gap-1"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      Retry
                    </button>
                  )}

                  {(isQueued || isProcessing) && (
                    <button
                      onClick={() => handleCancel(job.id)}
                      className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-300 rounded-lg border border-rose-500/30 flex items-center gap-1"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="glass-panel p-12 text-center text-slate-500 rounded-xl">
            No background processing jobs in queue.
          </div>
        )}
      </div>
    </div>
  );
};

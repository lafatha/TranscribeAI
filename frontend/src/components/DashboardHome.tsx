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
  ChevronRight,
  Layers,
  ShieldAlert,
  Hash
} from "lucide-react";
import { fetchBatchJobs, BatchJob } from "../lib/api";

interface DashboardHomeProps {
  onSelectWorkflow: (workflow: "video" | "ocr" | "duplicates" | "redaction" | "counter" | "search") => void;
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
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-8">
      {/* Central Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
          Document Intelligence Engine
        </h1>
      </div>

      {/* Central Interactive Search Bar */}
      <div className="bg-[#17171a] border border-[#24242a] rounded-2xl p-3 space-y-3">
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords across documents..."
            className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none px-3 py-2"
          />
        </form>

        {/* Action Pills Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#222228] px-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onSelectWorkflow("video")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#222228] hover:bg-[#2c2c36] border border-[#33333d] text-xs font-medium text-slate-200 transition-colors"
            >
              <Video className="h-3.5 w-3.5 text-white" />
              <span>Video to PDF</span>
            </button>

            <button
              onClick={() => onSelectWorkflow("ocr")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#222228] hover:bg-[#2c2c36] border border-[#33333d] text-xs font-medium text-slate-200 transition-colors"
            >
              <FileText className="h-3.5 w-3.5 text-white" />
              <span>PDF OCR</span>
            </button>

            <button
              onClick={() => onSelectWorkflow("duplicates")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#222228] hover:bg-[#2c2c36] border border-[#33333d] text-xs font-medium text-slate-200 transition-colors"
            >
              <Layers className="h-3.5 w-3.5 text-white" />
              <span>Duplicate Remover</span>
            </button>

            <button
              onClick={() => onSelectWorkflow("redaction")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#222228] hover:bg-[#2c2c36] border border-[#33333d] text-xs font-medium text-slate-200 transition-colors"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-white" />
              <span>Keyword Redactor</span>
            </button>

            <button
              onClick={() => onSelectWorkflow("counter")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#222228] hover:bg-[#2c2c36] border border-[#33333d] text-xs font-medium text-slate-200 transition-colors"
            >
              <Hash className="h-3.5 w-3.5 text-white" />
              <span>Keyword Counter</span>
            </button>

            <button
              onClick={() => onSelectWorkflow("search")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#222228] hover:bg-[#2c2c36] border border-[#33333d] text-xs font-medium text-slate-200 transition-colors"
            >
              <Search className="h-3.5 w-3.5 text-white" />
              <span>Search</span>
            </button>
          </div>
        </div>
      </div>

      {/* Minimalist Workflows List */}
      <div className="bg-[#17171a] border border-[#24242a] rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 border-b border-[#24242a] pb-3">
          <span>Engine Modules</span>
          <span className="text-slate-500 font-mono">4 Workflows</span>
        </div>

        <div className="space-y-2">
          {/* Item 1: Video to PDF */}
          <div
            onClick={() => onSelectWorkflow("video")}
            className="group cursor-pointer flex items-center justify-between p-3.5 rounded-xl bg-[#131316] hover:bg-[#222228] border border-[#222228] hover:border-[#383842] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[#222228] border border-[#33333d] flex items-center justify-center text-white">
                <Video className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white group-hover:text-slate-200 transition-colors">
                  Video to PDF
                </h3>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-all" />
          </div>

          {/* Item 2: PDF OCR */}
          <div
            onClick={() => onSelectWorkflow("ocr")}
            className="group cursor-pointer flex items-center justify-between p-3.5 rounded-xl bg-[#131316] hover:bg-[#222228] border border-[#222228] hover:border-[#383842] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[#222228] border border-[#33333d] flex items-center justify-center text-white">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white group-hover:text-slate-200 transition-colors">
                  PDF OCR
                </h3>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-all" />
          </div>

          {/* Item 3: Duplicate Remover */}
          <div
            onClick={() => onSelectWorkflow("duplicates")}
            className="group cursor-pointer flex items-center justify-between p-3.5 rounded-xl bg-[#131316] hover:bg-[#222228] border border-[#222228] hover:border-[#383842] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[#222228] border border-[#33333d] flex items-center justify-center text-white">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white group-hover:text-slate-200 transition-colors">
                  Duplicate Remover
                </h3>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-all" />
          </div>

          {/* Item 4: Keyword Redactor */}
          <div
            onClick={() => onSelectWorkflow("redaction")}
            className="group cursor-pointer flex items-center justify-between p-3.5 rounded-xl bg-[#131316] hover:bg-[#222228] border border-[#222228] hover:border-[#383842] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-[#222228] border border-[#33333d] flex items-center justify-center text-white">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white group-hover:text-slate-200 transition-colors">
                  Keyword Redactor
                </h3>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-white transition-all" />
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-[#17171a] border border-[#24242a] rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#24242a]">
          <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            Recent Processing Activity
          </h3>
          <button
            onClick={() => onSelectWorkflow("search")}
            className="text-[11px] text-slate-400 hover:text-white font-medium transition-colors"
          >
            View All
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
                    <span className="text-[10px] text-slate-400 uppercase px-1.5 py-0.5 rounded bg-[#222228] border border-[#2c2c34]">
                      {job.job_type === "video_to_pdf" ? "Video to PDF" : "PDF OCR"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-white bg-[#222228] px-2 py-0.5 rounded border border-[#33333d]">
                        <CheckCircle2 className="h-3 w-3 text-white" />
                        Completed
                      </span>
                    )}
                    {isProcessing && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-200 bg-[#222228] px-2 py-0.5 rounded border border-[#33333d]">
                        <RefreshCw className="h-3 w-3 text-slate-300 animate-spin" />
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
            No processing history yet.
          </div>
        )}
      </div>
    </div>
  );
};

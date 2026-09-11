"use client";

import React, { useEffect, useState } from "react";
import { 
  Plus, 
  Monitor, 
  FileCode2, 
  Sliders, 
  FolderPlus, 
  ShieldCheck, 
  Search, 
  ListTodo, 
  Video, 
  FileText, 
  Mic,
  ChevronDown,
  LayoutDashboard,
  Clock,
  CheckCircle2,
  RefreshCw,
  User,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { fetchBatchJobs, BatchJob } from "../lib/api";

export type NavTab = "dashboard" | "video" | "ocr" | "search" | "batch";

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  selectedJobId?: string | null;
  onSelectJob?: (tab: NavTab, jobId: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  selectedJobId,
  onSelectJob,
  collapsed = false,
  onToggleCollapse
}) => {
  const [recentJobs, setRecentJobs] = useState<BatchJob[]>([]);

  useEffect(() => {
    const loadRecent = async () => {
      try {
        const data = await fetchBatchJobs();
        setRecentJobs(data.jobs.slice(0, 15) || []);
      } catch (err) {
        console.error(err);
      }
    };
    loadRecent();
    const interval = setInterval(loadRecent, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside
      className={`bg-[#131316] border-r border-[#222228] text-[#ececee] flex flex-col justify-between h-screen sticky top-0 transition-all duration-300 z-40 select-none ${
        collapsed ? "w-16 px-2 py-4" : "w-64 p-3"
      }`}
    >
      {/* Top Section */}
      <div className="space-y-4 overflow-y-auto pr-1 custom-scrollbar">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b border-[#1f1f26]">
          {!collapsed && (
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab("dashboard")}>
              <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <FileText className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xs tracking-tight text-white leading-none">Transcribe AI</span>
                <span className="text-[10px] text-slate-500 font-mono mt-0.5">v2.0 • Offline OCR</span>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="mx-auto cursor-pointer" onClick={() => setActiveTab("dashboard")}>
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white">
                <FileText className="h-4.5 w-4.5" />
              </div>
            </div>
          )}

          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#1c1c22] transition-colors"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* + New Job Button */}
        <button
          onClick={() => {
            setActiveTab("dashboard");
            if (onSelectJob) onSelectJob("dashboard", "");
          }}
          className={`w-full bg-[#1c1c22] hover:bg-[#25252e] text-white border border-[#2b2b34] rounded-xl flex items-center justify-center gap-2 transition-all font-medium text-xs py-2.5 shadow-sm ${
            collapsed ? "px-0" : "px-3"
          }`}
        >
          <Plus className="h-4 w-4 text-cyan-400" />
          {!collapsed && <span>New Job</span>}
        </button>

        {/* Navigation Items */}
        <nav className="space-y-1">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === "dashboard" && !selectedJobId
                ? "bg-indigo-600/15 text-indigo-300 font-semibold border border-indigo-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#1a1a20]"
            }`}
          >
            <LayoutDashboard className="h-4 w-4 text-slate-400 shrink-0" />
            {!collapsed && <span>Dashboard</span>}
          </button>

          <button
            onClick={() => setActiveTab("video")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === "video" && !selectedJobId
                ? "bg-indigo-600/15 text-indigo-300 font-semibold border border-indigo-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#1a1a20]"
            }`}
          >
            <Video className="h-4 w-4 text-indigo-400 shrink-0" />
            {!collapsed && <span>Video → Slide PDF</span>}
          </button>

          <button
            onClick={() => setActiveTab("ocr")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === "ocr" && !selectedJobId
                ? "bg-cyan-600/15 text-cyan-300 font-semibold border border-cyan-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#1a1a20]"
            }`}
          >
            <FileText className="h-4 w-4 text-cyan-400 shrink-0" />
            {!collapsed && <span>PDF → Structured OCR</span>}
          </button>

          <button
            onClick={() => setActiveTab("search")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === "search"
                ? "bg-[#202028] text-white font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#1a1a20]"
            }`}
          >
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            {!collapsed && <span>Search Documents</span>}
          </button>

          <button
            onClick={() => setActiveTab("batch")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === "batch"
                ? "bg-[#202028] text-white font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#1a1a20]"
            }`}
          >
            <ListTodo className="h-4 w-4 text-slate-400 shrink-0" />
            {!collapsed && <span>Batch Queue</span>}
          </button>
        </nav>

        {!collapsed && (
          <>
            {/* History List */}
            <div className="pt-3 border-t border-[#1f1f26] space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 px-2 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 text-slate-400" />
                  History
                </span>
                <span className="text-[10px] font-mono text-slate-600">{recentJobs.length}</span>
              </div>

              <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {recentJobs.length > 0 ? (
                  recentJobs.map((job) => {
                    const filename = job.file_path.split(/[\/\\]/).pop();
                    const isSelected = selectedJobId === job.id;
                    const isVideo = job.job_type === "video_to_pdf";
                    const isCompleted = job.status === "completed";
                    const isProcessing = job.status === "processing";
                    const isFailed = job.status === "failed";

                    return (
                      <button
                        key={job.id}
                        onClick={() => {
                          const tab: NavTab = isVideo ? "video" : "ocr";
                          if (onSelectJob) {
                            onSelectJob(tab, job.id);
                          } else {
                            setActiveTab(tab);
                          }
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-xl text-xs transition-all flex items-center justify-between group ${
                          isSelected
                            ? isVideo
                              ? "bg-indigo-950/70 border border-indigo-500/50 text-indigo-200 shadow-sm"
                              : "bg-cyan-950/70 border border-cyan-500/50 text-cyan-200 shadow-sm"
                            : "text-slate-400 hover:text-slate-200 hover:bg-[#1a1a20] border border-transparent"
                        }`}
                        title={`${filename} (${job.status})`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isVideo ? (
                            <Video className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-indigo-400" : "text-indigo-400/70 group-hover:text-indigo-400"}`} />
                          ) : (
                            <FileText className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-cyan-400" : "text-cyan-400/70 group-hover:text-cyan-400"}`} />
                          )}
                          <span className="truncate font-medium text-[11px]">{filename}</span>
                        </div>

                        {/* Status Indicator */}
                        <div className="shrink-0 ml-1">
                          {isCompleted && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 block" title="Completed" />}
                          {isProcessing && <RefreshCw className="h-3 w-3 text-cyan-400 animate-spin" />}
                          {isFailed && <span className="h-1.5 w-1.5 rounded-full bg-rose-400 block" title="Failed" />}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="px-2 py-3 text-[11px] text-slate-500 italic text-center bg-[#17171c] rounded-xl border border-[#222228]">
                    No processing history yet
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Profile Footer */}
      <div className="pt-3 border-t border-[#1f1f26]">
        <div className={`flex items-center gap-2.5 ${collapsed ? "justify-center" : "px-2"}`}>
          <div className="h-7 w-7 rounded-full bg-[#1c1c22] border border-[#2b2b34] flex items-center justify-center text-xs font-semibold text-slate-300">
            <User className="h-3.5 w-3.5" />
          </div>
          {!collapsed && (
            <div className="truncate">
              <p className="text-xs font-medium text-slate-200 truncate leading-none">Local Workspace</p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-mono">SQLite Storage</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

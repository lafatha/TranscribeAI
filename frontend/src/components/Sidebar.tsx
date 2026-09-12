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
  PanelLeftOpen,
  Layers,
  ShieldAlert,
  Hash
} from "lucide-react";
import { fetchBatchJobs, BatchJob } from "../lib/api";

export type NavTab = "dashboard" | "video" | "ocr" | "duplicates" | "redaction" | "counter" | "search" | "batch";

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
              <div className="h-7 w-7 rounded-xl bg-[#222228] border border-[#33333d] flex items-center justify-center text-white">
                <FileText className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xs tracking-tight text-white leading-none">Transcribe AI</span>
                <span className="text-[10px] text-slate-500 font-mono mt-0.5">v2.0 • Offline Engine</span>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="mx-auto cursor-pointer" onClick={() => setActiveTab("dashboard")}>
              <div className="h-8 w-8 rounded-xl bg-[#222228] border border-[#33333d] flex items-center justify-center text-white">
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

        {/* Navigation Items */}
        <nav className="space-y-1">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === "dashboard" && !selectedJobId
                ? "bg-[#222228] text-white font-semibold border border-[#383844]"
                : "text-slate-400 hover:text-slate-100 hover:bg-[#1a1a20]"
            }`}
          >
            <LayoutDashboard className="h-4 w-4 text-slate-300 shrink-0" />
            {!collapsed && <span>Dashboard</span>}
          </button>

          <button
            onClick={() => setActiveTab("video")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === "video" && !selectedJobId
                ? "bg-[#222228] text-white font-semibold border border-[#383844]"
                : "text-slate-400 hover:text-slate-100 hover:bg-[#1a1a20]"
            }`}
          >
            <Video className="h-4 w-4 text-slate-300 shrink-0" />
            {!collapsed && <span>Video to PDF</span>}
          </button>

          <button
            onClick={() => setActiveTab("ocr")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === "ocr" && !selectedJobId
                ? "bg-[#222228] text-white font-semibold border border-[#383844]"
                : "text-slate-400 hover:text-slate-100 hover:bg-[#1a1a20]"
            }`}
          >
            <FileText className="h-4 w-4 text-slate-300 shrink-0" />
            {!collapsed && <span>PDF OCR</span>}
          </button>

          <button
            onClick={() => setActiveTab("duplicates")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === "duplicates"
                ? "bg-[#222228] text-white font-semibold border border-[#383844]"
                : "text-slate-400 hover:text-slate-100 hover:bg-[#1a1a20]"
            }`}
          >
            <Layers className="h-4 w-4 text-slate-300 shrink-0" />
            {!collapsed && <span>Duplicate Remover</span>}
          </button>

          <button
            onClick={() => setActiveTab("redaction")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === "redaction"
                ? "bg-[#222228] text-white font-semibold border border-[#383844]"
                : "text-slate-400 hover:text-slate-100 hover:bg-[#1a1a20]"
            }`}
          >
            <ShieldAlert className="h-4 w-4 text-slate-300 shrink-0" />
            {!collapsed && <span>Keyword Redactor</span>}
          </button>

          <button
            onClick={() => setActiveTab("counter")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === "counter"
                ? "bg-[#222228] text-white font-semibold border border-[#383844]"
                : "text-slate-400 hover:text-slate-100 hover:bg-[#1a1a20]"
            }`}
          >
            <Hash className="h-4 w-4 text-slate-300 shrink-0" />
            {!collapsed && <span>Keyword Counter</span>}
          </button>

          <button
            onClick={() => setActiveTab("search")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === "search"
                ? "bg-[#222228] text-white font-semibold border border-[#383844]"
                : "text-slate-400 hover:text-slate-100 hover:bg-[#1a1a20]"
            }`}
          >
            <Search className="h-4 w-4 text-slate-300 shrink-0" />
            {!collapsed && <span>Search Documents</span>}
          </button>

          <button
            onClick={() => setActiveTab("batch")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === "batch"
                ? "bg-[#222228] text-white font-semibold border border-[#383844]"
                : "text-slate-400 hover:text-slate-100 hover:bg-[#1a1a20]"
            }`}
          >
            <ListTodo className="h-4 w-4 text-slate-300 shrink-0" />
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
                            ? "bg-[#222228] border border-[#383844] text-white shadow-sm font-medium"
                            : "text-slate-400 hover:text-slate-200 hover:bg-[#1a1a20] border border-transparent"
                        }`}
                        title={`${filename} (${job.status})`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isVideo ? (
                            <Video className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-white" />
                          ) : (
                            <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-white" />
                          )}
                          <span className="truncate font-medium text-[11px]">{filename}</span>
                        </div>

                        {/* Status Indicator */}
                        {isProcessing && (
                          <div className="shrink-0 ml-1">
                            <RefreshCw className="h-3 w-3 text-slate-300 animate-spin" />
                          </div>
                        )}
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
    </aside>
  );
};

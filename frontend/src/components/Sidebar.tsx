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
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  collapsed = false,
  onToggleCollapse
}) => {
  const [recentJobs, setRecentJobs] = useState<BatchJob[]>([]);

  useEffect(() => {
    const loadRecent = async () => {
      try {
        const data = await fetchBatchJobs();
        setRecentJobs(data.jobs.slice(0, 10) || []);
      } catch (err) {
        console.error(err);
      }
    };
    loadRecent();
    const interval = setInterval(loadRecent, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside
      className={`bg-[#17171a] border-r border-[#24242a] text-[#ececee] flex flex-col justify-between h-screen sticky top-0 transition-all duration-300 z-40 select-none ${
        collapsed ? "w-16 px-2 py-4" : "w-64 p-3"
      }`}
    >
      {/* Top Section */}
      <div className="space-y-4 overflow-y-auto pr-1">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 pt-1 pb-2">
          {!collapsed && (
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab("dashboard")}>
              <Mic className="h-5 w-5 text-indigo-400" />
              <span className="font-semibold text-sm tracking-tight text-white">Transcribe OCR</span>
            </div>
          )}
          {collapsed && (
            <div className="mx-auto cursor-pointer" onClick={() => setActiveTab("dashboard")}>
              <Mic className="h-5 w-5 text-indigo-400" />
            </div>
          )}

          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-[#222227] transition-colors"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* + New Button */}
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`w-full bg-[#24242a] hover:bg-[#2e2e36] text-white border border-[#33333d] rounded-xl flex items-center justify-center gap-2 transition-all font-medium text-xs py-2.5 ${
            collapsed ? "px-0" : "px-3"
          }`}
        >
          <Plus className="h-4 w-4 text-indigo-400" />
          {!collapsed && <span>New Job</span>}
        </button>

        {/* Navigation Items */}
        <nav className="space-y-1">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === "dashboard"
                ? "bg-[#25252b] text-white font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#1f1f24]"
            }`}
          >
            <LayoutDashboard className="h-4 w-4 text-slate-400" />
            {!collapsed && <span>Dashboard</span>}
          </button>

          <button
            onClick={() => setActiveTab("video")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === "video"
                ? "bg-[#25252b] text-white font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#1f1f24]"
            }`}
          >
            <Video className="h-4 w-4 text-indigo-400" />
            {!collapsed && <span>Video → Slide PDF</span>}
          </button>

          <button
            onClick={() => setActiveTab("ocr")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === "ocr"
                ? "bg-[#25252b] text-white font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#1f1f24]"
            }`}
          >
            <FileText className="h-4 w-4 text-cyan-400" />
            {!collapsed && <span>PDF → Structured OCR</span>}
          </button>

          <button
            onClick={() => setActiveTab("search")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === "search"
                ? "bg-[#25252b] text-white font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#1f1f24]"
            }`}
          >
            <Search className="h-4 w-4 text-slate-400" />
            {!collapsed && <span>Search Documents</span>}
          </button>

          <button
            onClick={() => setActiveTab("batch")}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
              activeTab === "batch"
                ? "bg-[#25252b] text-white font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-[#1f1f24]"
            }`}
          >
            <ListTodo className="h-4 w-4 text-slate-400" />
            {!collapsed && <span>Batch Queue</span>}
          </button>
        </nav>

        {!collapsed && (
          <>
            {/* Sessions / Recent History List */}
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 px-2 uppercase tracking-wider">
                <span>Sessions</span>
                <ChevronDown className="h-3 w-3 text-slate-500" />
              </div>

              <div className="space-y-0.5">
                {recentJobs.length > 0 ? (
                  recentJobs.map((job) => {
                    const filename = job.file_path.split(/[\/\\]/).pop();
                    return (
                      <button
                        key={job.id}
                        onClick={() => setActiveTab(job.job_type === "video_to_pdf" ? "video" : "ocr")}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-[#1f1f24] truncate flex items-center gap-2 group transition-colors"
                      >
                        {job.job_type === "video_to_pdf" ? (
                          <Video className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                        ) : (
                          <FileText className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                        )}
                        <span className="truncate">{filename}</span>
                      </button>
                    );
                  })
                ) : (
                  <div className="px-2 py-2 text-[11px] text-slate-500 italic">
                    No recent sessions
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Profile Footer */}
      <div className="pt-3 border-t border-[#24242a]">
        <div className={`flex items-center gap-2.5 ${collapsed ? "justify-center" : "px-2"}`}>
          <div className="h-7 w-7 rounded-full bg-[#2a2a32] border border-[#383842] flex items-center justify-center text-xs font-semibold text-slate-300">
            <User className="h-3.5 w-3.5" />
          </div>
          {!collapsed && (
            <div className="truncate">
              <p className="text-xs font-medium text-slate-200 truncate leading-none">Local Workspace</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

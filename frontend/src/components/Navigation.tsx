"use client";

import React from "react";
import { LayoutDashboard, Video, FileText, Search, ListTodo, ShieldCheck, Cpu, ChevronRight } from "lucide-react";

export type NavTab = "dashboard" | "video" | "ocr" | "search" | "batch";

interface NavigationProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const getBreadcrumbTitle = () => {
    switch (activeTab) {
      case "dashboard":
        return "Home Dashboard";
      case "video":
        return "Tool 1 — Video to Slide PDF";
      case "ocr":
        return "Tool 2 — PDF to Structured OCR";
      case "search":
        return "Local Presentation Search";
      case "batch":
        return "Batch Job Queue";
      default:
        return "";
    }
  };

  return (
    <header className="glass-panel sticky top-0 z-50 px-6 py-4 border-b border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4">
      {/* Brand & Breadcrumb */}
      <div className="flex items-center gap-4">
        <div
          onClick={() => setActiveTab("dashboard")}
          className="cursor-pointer flex items-center gap-3 group"
        >
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <Cpu className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-indigo-300 leading-none">
              Document Intelligence
            </h1>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium mt-1">
              <ShieldCheck className="h-3 w-3" />
              <span>Air-Gapped • 100% Offline</span>
            </div>
          </div>
        </div>

        {/* Breadcrumb separator */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 pl-4 border-l border-slate-800">
          <span>Dashboard</span>
          <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
          <span className="text-indigo-300 font-semibold">{getBreadcrumbTitle()}</span>
        </div>
      </div>

      {/* Navigation Buttons */}
      <nav className="flex items-center bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 space-x-1">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "dashboard"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab("video")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "video"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
          }`}
        >
          <Video className="h-4 w-4" />
          <span>Video → PDF</span>
        </button>

        <button
          onClick={() => setActiveTab("ocr")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "ocr"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>PDF → OCR</span>
        </button>

        <button
          onClick={() => setActiveTab("search")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "search"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
          }`}
        >
          <Search className="h-4 w-4" />
          <span>Search</span>
        </button>

        <button
          onClick={() => setActiveTab("batch")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "batch"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
          }`}
        >
          <ListTodo className="h-4 w-4" />
          <span>Queue</span>
        </button>
      </nav>
    </header>
  );
};

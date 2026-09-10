"use client";

import React, { useState } from "react";
import { Sidebar, NavTab } from "../components/Sidebar";
import { DashboardHome } from "../components/DashboardHome";
import { Tool1VideoToPdf } from "../components/Tool1VideoToPdf";
import { Tool2PdfToOcr } from "../components/Tool2PdfToOcr";
import { LocalSearch } from "../components/LocalSearch";
import { BatchQueue } from "../components/BatchQueue";
import { Sparkles, ShieldCheck } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleSelectWorkflow = (tab: "video" | "ocr" | "search") => {
    setActiveTab(tab);
  };

  const getBreadcrumbTitle = () => {
    switch (activeTab) {
      case "dashboard":
        return "Workspace Home";
      case "video":
        return "Video → Slide PDF";
      case "ocr":
        return "PDF → Structured OCR";
      case "search":
        return "Search Presentations";
      case "batch":
        return "Batch Job Queue";
      default:
        return "Workspace";
    }
  };

  return (
    <div className="min-h-screen bg-[#111113] text-[#ececee] flex selection:bg-indigo-600 selection:text-white font-sans">
      {/* Left Sidebar Layout */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Right Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Minimal Top Header Bar */}
        <header className="sticky top-0 z-30 bg-[#111113]/90 backdrop-blur-md border-b border-[#24242a] px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-300">
              {getBreadcrumbTitle()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <ShieldCheck className="h-3 w-3" />
              <span>100% Air-Gapped</span>
            </div>
          </div>
        </header>

        {/* Main Content Body */}
        <main className="flex-1 p-6 md:p-8 max-w-6xl w-full mx-auto">
          {activeTab === "dashboard" && <DashboardHome onSelectWorkflow={handleSelectWorkflow} />}
          {activeTab === "video" && <Tool1VideoToPdf onSendToOcr={() => setActiveTab("ocr")} />}
          {activeTab === "ocr" && <Tool2PdfToOcr />}
          {activeTab === "search" && <LocalSearch />}
          {activeTab === "batch" && <BatchQueue />}
        </main>
      </div>
    </div>
  );
}

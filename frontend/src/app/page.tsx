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
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    setSelectedJobId(null);
  };

  const handleSelectJob = (tab: NavTab, jobId: string) => {
    setActiveTab(tab);
    setSelectedJobId(jobId);
  };

  const getBreadcrumbTitle = () => {
    switch (activeTab) {
      case "dashboard":
        return "Workspace Home";
      case "video":
        return selectedJobId ? "Video → Slide PDF (History Job)" : "Video → Slide PDF";
      case "ocr":
        return selectedJobId ? "PDF → Structured OCR (History Job)" : "PDF → Structured OCR";
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
        setActiveTab={handleSelectTab}
        selectedJobId={selectedJobId}
        onSelectJob={handleSelectJob}
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
        </header>

        {/* Main Content Body */}
        <main className="flex-1 p-6 md:p-8 max-w-6xl w-full mx-auto">
          {activeTab === "dashboard" && <DashboardHome onSelectWorkflow={(t) => handleSelectTab(t)} />}
          {activeTab === "video" && (
            <Tool1VideoToPdf
              selectedJobId={selectedJobId}
              onSendToOcr={() => handleSelectTab("ocr")}
            />
          )}
          {activeTab === "ocr" && (
            <Tool2PdfToOcr selectedJobId={selectedJobId} />
          )}
          {activeTab === "search" && <LocalSearch />}
          {activeTab === "batch" && <BatchQueue onSelectJob={handleSelectJob} />}
        </main>
      </div>
    </div>
  );
}

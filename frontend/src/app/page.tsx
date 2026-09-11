"use client";

import React, { useState } from "react";
import { Sidebar, NavTab } from "../components/Sidebar";
import { DashboardHome } from "../components/DashboardHome";
import { Tool1VideoToPdf } from "../components/Tool1VideoToPdf";
import { Tool2PdfToOcr } from "../components/Tool2PdfToOcr";
import { Tool3DuplicateRemover } from "../components/Tool3DuplicateRemover";
import { Tool4KeywordRedactor } from "../components/Tool4KeywordRedactor";
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
      case "duplicates":
        return "Tool 3 — Duplicate Slide Removal";
      case "redaction":
        return "Tool 4 — Keyword PDF Redaction";
      case "search":
        return "Search Presentations";
      case "batch":
        return "Batch Job Queue";
      default:
        return "Workspace";
    }
  };

  return (
    <div className="min-h-screen bg-[#111113] text-[#ececee] flex selection:bg-slate-700 selection:text-white font-sans">
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
        {/* Main Content Body */}
        <main className="flex-1 p-6 md:p-8 max-w-6xl w-full mx-auto">
          {activeTab === "dashboard" && <DashboardHome onSelectWorkflow={(t) => handleSelectTab(t)} />}
          {activeTab === "video" && (
            <Tool1VideoToPdf
              selectedJobId={selectedJobId}
              onSendToOcr={() => handleSelectTab("ocr")}
            />
          )}
          {activeTab === "ocr" && <Tool2PdfToOcr selectedJobId={selectedJobId} />}
          {activeTab === "duplicates" && <Tool3DuplicateRemover selectedJobId={selectedJobId} />}
          {activeTab === "redaction" && <Tool4KeywordRedactor selectedJobId={selectedJobId} />}
          {activeTab === "search" && <LocalSearch />}
          {activeTab === "batch" && <BatchQueue onSelectJob={handleSelectJob} />}
        </main>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { Navigation, NavTab } from "../components/Navigation";
import { DashboardHome } from "../components/DashboardHome";
import { Tool1VideoToPdf } from "../components/Tool1VideoToPdf";
import { Tool2PdfToOcr } from "../components/Tool2PdfToOcr";
import { LocalSearch } from "../components/LocalSearch";
import { BatchQueue } from "../components/BatchQueue";

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");

  const handleSelectWorkflow = (tab: "video" | "ocr" | "search") => {
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white font-sans">
      {/* Navigation Header with Breadcrumbs */}
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Container */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
        {activeTab === "dashboard" && <DashboardHome onSelectWorkflow={handleSelectWorkflow} />}
        {activeTab === "video" && <Tool1VideoToPdf onSendToOcr={() => setActiveTab("ocr")} />}
        {activeTab === "ocr" && <Tool2PdfToOcr />}
        {activeTab === "search" && <LocalSearch />}
        {activeTab === "batch" && <BatchQueue />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 px-6 text-center text-xs text-slate-500">
        Document Intelligence System • 100% Offline, Self-Hosted & Privacy-Preserving
      </footer>
    </div>
  );
}

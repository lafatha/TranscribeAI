"use client";

import React, { useState } from "react";
import { 
  Layers, 
  Upload, 
  Download, 
  AlertTriangle, 
  RefreshCw, 
  SlidersHorizontal, 
  Check, 
  FileText, 
  Plus 
} from "lucide-react";
import { 
  directDetectDuplicates, 
  detectDuplicates,
  generateUniquePdf, 
  DuplicateAnalysis, 
  getOcrExportUrl 
} from "../lib/api";

interface Tool3Props {
  selectedJobId?: string | null;
}

export const Tool3DuplicateRemover: React.FC<Tool3Props> = ({ selectedJobId }) => {
  const [file, setFile] = useState<File | null>(null);
  const [dupThreshold, setDupThreshold] = useState<number>(0.75);
  const [dupAnalysis, setDupAnalysis] = useState<DuplicateAnalysis | null>(null);
  const [selectedUniquePages, setSelectedUniquePages] = useState<number[]>([]);
  
  const [jobId, setJobId] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [isBuildingUniquePdf, setIsBuildingUniquePdf] = useState<boolean>(false);
  const [uniquePdfPath, setUniquePdfPath] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleRunDetection = async () => {
    if (!file && !selectedJobId) {
      setErrorMessage("Please select a PDF file first.");
      return;
    }

    setIsDetecting(true);
    setErrorMessage(null);
    try {
      if (file) {
        const res = await directDetectDuplicates(file, dupThreshold);
        if (!res || !res.duplicate_analysis) {
          throw new Error("Failed to analyze PDF duplicates.");
        }
        setJobId(res.job_id);
        setDupAnalysis(res.duplicate_analysis);
        setSelectedUniquePages(res.duplicate_analysis.unique_pages || []);
        if (res.unique_pdf_path) {
          setUniquePdfPath(res.unique_pdf_path);
        }
      } else if (selectedJobId) {
        const res = await detectDuplicates(selectedJobId, dupThreshold);
        if (!res || !res.duplicate_analysis) {
          throw new Error("Failed to analyze PDF duplicates.");
        }
        setJobId(res.job_id);
        setDupAnalysis(res.duplicate_analysis);
        setSelectedUniquePages(res.duplicate_analysis.unique_pages || []);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to detect duplicate slides.");
    } finally {
      setIsDetecting(false);
    }
  };

  const handleGenerateUniquePdf = async () => {
    if (!jobId || selectedUniquePages.length === 0) return;
    setIsBuildingUniquePdf(true);
    setErrorMessage(null);
    try {
      const res = await generateUniquePdf(jobId, selectedUniquePages);
      setUniquePdfPath(res.unique_pdf_path);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to generate unique PDF.");
    } finally {
      setIsBuildingUniquePdf(false);
    }
  };

  const toggleUniquePageSelection = (pageNumber: number) => {
    if (selectedUniquePages.includes(pageNumber)) {
      setSelectedUniquePages(selectedUniquePages.filter((p) => p !== pageNumber));
    } else {
      setSelectedUniquePages([...selectedUniquePages, pageNumber].sort((a, b) => a - b));
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-[#1c1c20] border border-[#33333d] text-slate-200 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-slate-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-xs text-slate-400 hover:text-white font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {/* File Upload Dropzone & Action */}
      <div className="bg-[#17171a] p-6 rounded-2xl border border-[#24242a] space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#24242a] pb-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Duplicate Removal Settings</h4>
          <div className="flex items-center gap-2 bg-[#131316] px-3 py-1.5 rounded-xl border border-[#24242a] text-xs">
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-400">Similarity Threshold:</span>
            <span className="font-mono text-white font-bold">{Math.round(dupThreshold * 100)}%</span>
            <input
              type="range"
              min="0.50"
              max="0.95"
              step="0.05"
              value={dupThreshold}
              onChange={(e) => setDupThreshold(parseFloat(e.target.value))}
              className="w-20 accent-slate-300 cursor-pointer"
            />
          </div>
        </div>
        <div className="border border-dashed border-[#33333d] hover:border-slate-500 rounded-xl p-8 text-center transition-all bg-[#141416] relative">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-[#222228] flex items-center justify-center text-white border border-[#2e2e36]">
              <Layers className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">
                {file ? file.name : "Drop PDF file here to remove duplicate slides"}
              </p>
              <p className="text-xs text-slate-500 mt-1">Fast native text layer extraction (Sub-second execution)</p>
            </div>
            {file && (
              <span className="text-xs font-medium px-2.5 py-0.5 bg-[#25252b] border border-[#303038] text-slate-300 rounded-md">
                {(file.size / (1024 * 1024)).toFixed(1)} MB
              </span>
            )}
          </div>
        </div>

        <button
          onClick={handleRunDetection}
          disabled={!file || isDetecting}
          className="w-full py-3 px-5 rounded-xl font-medium text-xs text-white bg-[#222228] hover:bg-[#2c2c36] disabled:opacity-50 disabled:cursor-not-allowed border border-[#33333d] transition-all flex items-center justify-center gap-2"
        >
          {isDetecting ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin text-white" />
              <span>Analyzing Presentation Slides...</span>
            </>
          ) : (
            <>
              <Layers className="h-4 w-4 text-white" />
              <span>Detect & Remove Duplicate Slides</span>
            </>
          )}
        </button>
      </div>

      {/* Duplicate Analysis Statistics Cards */}
      {dupAnalysis && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#17171a] p-4 rounded-2xl border border-[#24242a] text-center space-y-1">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Original Pages</p>
            <p className="text-2xl font-mono font-bold text-white">{dupAnalysis.original_page_count}</p>
          </div>

          <div className="bg-[#17171a] p-4 rounded-2xl border border-[#24242a] text-center space-y-1">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Duplicates Detected</p>
            <p className="text-2xl font-mono font-bold text-slate-300">{dupAnalysis.duplicate_page_count}</p>
          </div>

          <div className="bg-[#17171a] p-4 rounded-2xl border border-[#24242a] text-center space-y-1">
            <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Unique Pages Remaining</p>
            <p className="text-2xl font-mono font-bold text-white">{dupAnalysis.unique_page_count}</p>
          </div>
        </div>
      )}

      {/* Duplicate Groups Breakdown */}
      {dupAnalysis && dupAnalysis.duplicate_groups.length > 0 && (
        <div className="bg-[#17171a] p-6 rounded-2xl border border-[#24242a] space-y-4">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Detected Duplicate Groups</h4>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {dupAnalysis.duplicate_groups.map((group, idx) => (
              <div key={idx} className="bg-[#131316] p-4 rounded-xl border border-[#222228] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-200">Group {idx + 1}</span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#222228] text-white border border-[#33333d] font-mono font-medium">
                    Keep: Page {group.keep_page}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Duplicates Removed:</span>
                  <div className="flex flex-wrap gap-1">
                    {group.duplicate_pages.map((dp) => (
                      <span key={dp} className="px-2 py-0.5 rounded bg-[#1c1c20] text-slate-300 border border-[#2a2a32] font-mono">
                        Page {dp}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unique Pages Selection Matrix */}
      {dupAnalysis && (
        <div className="bg-[#17171a] p-6 rounded-2xl border border-[#24242a] space-y-4">
          <div className="flex items-center justify-between text-xs">
            <h4 className="font-bold text-slate-300 uppercase tracking-wider">Included Pages for Unique PDF Output ({selectedUniquePages.length})</h4>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedUniquePages(Array.from({ length: dupAnalysis.original_page_count }, (_, i) => i + 1))}
                className="text-[11px] text-slate-300 hover:text-white hover:underline"
              >
                Select All
              </button>
              <span className="text-slate-600">•</span>
              <button
                onClick={() => setSelectedUniquePages(dupAnalysis.unique_pages)}
                className="text-[11px] text-slate-300 hover:text-white hover:underline"
              >
                Reset to Detected Unique
              </button>
            </div>
          </div>

          <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
            {Array.from({ length: dupAnalysis.original_page_count }, (_, i) => i + 1).map((pNum) => {
              const isSelected = selectedUniquePages.includes(pNum);
              const isDetectedDup = dupAnalysis.duplicate_pages.includes(pNum);

              return (
                <button
                  key={pNum}
                  onClick={() => toggleUniquePageSelection(pNum)}
                  className={`p-2.5 rounded-xl border text-center font-mono text-xs transition-all flex flex-col items-center justify-center gap-1 ${
                    isSelected
                      ? "bg-[#222228] border-[#383844] text-white shadow-sm font-medium"
                      : "bg-[#131316] border-[#222228] text-slate-600 hover:border-slate-600"
                  }`}
                >
                  <span className="font-bold">#{pNum}</span>
                  {isDetectedDup && <span className="text-[9px] text-slate-400 font-sans">Dup</span>}
                </button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[#24242a] flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              onClick={handleGenerateUniquePdf}
              disabled={isBuildingUniquePdf || selectedUniquePages.length === 0}
              className="w-full sm:w-auto px-6 py-3 bg-[#222228] hover:bg-[#2c2c36] disabled:opacity-50 text-white text-xs font-bold rounded-xl border border-[#33333d] flex items-center justify-center gap-2 transition-all"
            >
              {isBuildingUniquePdf ? <RefreshCw className="h-4 w-4 animate-spin text-white" /> : <Layers className="h-4 w-4 text-white" />}
              <span>Generate Unique PDF ({selectedUniquePages.length} Pages)</span>
            </button>

            {jobId && uniquePdfPath && (
              <a
                href={getOcrExportUrl(jobId, "unique", false)}
                download
                className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-slate-200 text-black text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all border border-white"
              >
                <Download className="h-4 w-4" />
                <span>Download Unique PDF</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

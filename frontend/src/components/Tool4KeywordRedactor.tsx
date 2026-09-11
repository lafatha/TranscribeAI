"use client";

import React, { useState } from "react";
import { 
  ShieldAlert, 
  ShieldCheck, 
  Search, 
  Plus, 
  Trash2, 
  Download, 
  AlertTriangle, 
  RefreshCw 
} from "lucide-react";
import { 
  directScanRedactions, 
  directApplyRedactions, 
  RedactionScanResult, 
  RedactionVerification, 
  getDirectDownloadUrl 
} from "../lib/api";

interface Tool4Props {
  selectedJobId?: string | null;
}

export interface KeywordItem {
  keyword: string;
  label: string;
}

export const Tool4KeywordRedactor: React.FC<Tool4Props> = ({ selectedJobId }) => {
  const [file, setFile] = useState<File | null>(null);
  const [redactionStyle, setRedactionStyle] = useState<"pure" | "acronym">("acronym");
  const [keywords, setKeywords] = useState<KeywordItem[]>([
    { keyword: "CONFIDENTIAL", label: "SECRET" },
    { keyword: "Project X", label: "1" }
  ]);
  const [keywordInput, setKeywordInput] = useState<string>("");
  const [labelInput, setLabelInput] = useState<string>("");
  const [caseSensitive, setCaseSensitive] = useState<boolean>(false);
  const [wholeWordOnly, setWholeWordOnly] = useState<boolean>(true);
  
  const [targetPdfPath, setTargetPdfPath] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<RedactionScanResult | null>(null);
  const [redactedPdfPath, setRedactedPdfPath] = useState<string | null>(null);
  const [redactionVerification, setRedactionVerification] = useState<RedactionVerification | null>(null);

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleAddKeyword = () => {
    const cleanKw = keywordInput.trim();
    const cleanLbl = labelInput.trim();

    if (cleanKw) {
      if (!keywords.some((k) => k.keyword.toLowerCase() === cleanKw.toLowerCase())) {
        const assignedLabel = redactionStyle === "acronym" ? (cleanLbl || `${keywords.length + 1}`) : "";
        setKeywords([...keywords, { keyword: cleanKw, label: assignedLabel }]);
        setKeywordInput("");
        setLabelInput("");
      }
    }
  };

  const handleRemoveKeyword = (kwToRemove: string) => {
    setKeywords(keywords.filter((k) => k.keyword !== kwToRemove));
  };

  const handleScanRedactions = async () => {
    if (keywords.length === 0) {
      setErrorMessage("Please enter at least 1 keyword to scan.");
      return;
    }
    if (!file && !targetPdfPath) {
      setErrorMessage("Please select a PDF file first.");
      return;
    }

    setIsScanning(true);
    setErrorMessage(null);
    try {
      // Pass formatted list of items with labels if acronym style selected
      const payloadKeywords = keywords.map((k) => 
        redactionStyle === "acronym" && k.label ? `${k.keyword}:${k.label}` : k.keyword
      );
      const res = await directScanRedactions(file, targetPdfPath, payloadKeywords, caseSensitive, wholeWordOnly);
      setScanResult(res.scan_result);
      setTargetPdfPath(res.target_pdf);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to scan PDF for keywords.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleApplyRedactions = async () => {
    if (!scanResult || scanResult.matches.length === 0 || !targetPdfPath) return;
    setIsApplying(true);
    setErrorMessage(null);
    try {
      // Ensure matches carry the correct label based on current redactionStyle
      const updatedMatches = scanResult.matches.map((m) => {
        const item = keywords.find((k) => k.keyword.toLowerCase() === m.keyword.toLowerCase());
        return {
          ...m,
          label: redactionStyle === "acronym" ? (m.label || (item ? item.label : "")) : ""
        };
      });

      const res = await directApplyRedactions(targetPdfPath, updatedMatches);
      setRedactedPdfPath(res.redacted_pdf_path);
      setRedactionVerification(res.verification);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to redact PDF.");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-[#222228] border border-[#383844] text-slate-200 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-white shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-xs text-slate-400 hover:text-white font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {/* KEYWORD TRACKING SECTION (ALWAYS VISIBLE AT THE TOP!) */}
      <div className="bg-[#17171a] p-6 rounded-2xl border border-[#24242a] space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#24242a] pb-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            1. Redaction Style & Target Keywords
          </h4>

          {/* Redaction Style Selector (Pure Blackout vs Blackout + Acronym / Label) */}
          <div className="flex items-center gap-1 bg-[#131316] p-1 rounded-xl border border-[#24242a]">
            <button
              type="button"
              onClick={() => setRedactionStyle("pure")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                redactionStyle === "pure"
                  ? "bg-[#222228] text-white font-bold border border-[#33333d]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Pure Blackout
            </button>
            <button
              type="button"
              onClick={() => setRedactionStyle("acronym")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                redactionStyle === "acronym"
                  ? "bg-[#222228] text-white font-bold border border-[#33333d]"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Blackout + Acronym / Label
            </button>
          </div>
        </div>

        {/* Input Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
            placeholder="Keyword (e.g. AKU, CONFIDENTIAL, Project X)..."
            className="flex-1 bg-[#0b0b0d] border border-[#262630] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-400"
          />

          {redactionStyle === "acronym" && (
            <input
              type="text"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
              placeholder="Acronym / Label (e.g. 1, ANON, SECRET)..."
              className="w-full sm:w-48 bg-[#0b0b0d] border border-[#262630] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-400 font-mono"
            />
          )}

          <button
            onClick={handleAddKeyword}
            className="px-4 py-2.5 bg-[#222228] hover:bg-[#2e2e38] text-white text-xs font-semibold rounded-xl border border-[#2e2e36] transition-all flex items-center justify-center gap-1.5 shrink-0"
          >
            <Plus className="h-4 w-4 text-white" />
            <span>Add Keyword</span>
          </button>

          <div className="flex items-center gap-2 shrink-0">
            <label className="flex items-center gap-2 text-xs text-slate-300 bg-[#0b0b0d] px-3.5 py-2.5 rounded-xl border border-[#262630] cursor-pointer">
              <input
                type="checkbox"
                checked={wholeWordOnly}
                onChange={(e) => setWholeWordOnly(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-white focus:ring-0"
              />
              <span>Whole Word Only</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-300 bg-[#0b0b0d] px-3.5 py-2.5 rounded-xl border border-[#262630] cursor-pointer">
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-white focus:ring-0"
              />
              <span>Case Sensitive</span>
            </label>
          </div>
        </div>

        {/* Keyword Chips */}
        <div className="flex flex-wrap gap-2 pt-1">
          {keywords.map((item) => (
            <span key={item.keyword} className="px-3 py-1 bg-[#222228] border border-[#383844] text-slate-200 rounded-xl text-xs flex items-center gap-2 font-medium">
              <span>{item.keyword}</span>
              {redactionStyle === "acronym" && item.label && (
                <span className="px-1.5 py-0.5 rounded bg-[#141416] text-white font-mono text-[10px] border border-[#2e2e36]">
                  {item.label}
                </span>
              )}
              <button onClick={() => handleRemoveKeyword(item.keyword)} className="text-slate-400 hover:text-white">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Target PDF Upload Section */}
      <div className="bg-[#17171a] p-6 rounded-2xl border border-[#24242a] space-y-6">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          2. Select Target PDF Document
        </h4>

        <div className="border border-dashed border-[#33333d] hover:border-slate-500 rounded-xl p-8 text-center transition-all bg-[#141416] relative">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-[#222228] flex items-center justify-center text-white border border-[#2e2e36]">
              <ShieldAlert className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">
                {file ? file.name : "Drop PDF file here for keyword redaction"}
              </p>
              <p className="text-xs text-slate-500 mt-1">Fast PyMuPDF text stream search (Sub-second execution)</p>
            </div>
            {file && (
              <span className="text-xs font-medium px-2.5 py-0.5 bg-[#25252b] border border-[#303038] text-slate-300 rounded-md">
                {(file.size / (1024 * 1024)).toFixed(1)} MB
              </span>
            )}
          </div>
        </div>

        <button
          onClick={handleScanRedactions}
          disabled={!file || keywords.length === 0 || isScanning}
          className="w-full py-3 px-5 rounded-xl font-medium text-xs text-white bg-[#222228] hover:bg-[#2c2c36] disabled:opacity-50 disabled:cursor-not-allowed border border-[#33333d] transition-all flex items-center justify-center gap-2"
        >
          {isScanning ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin text-white" />
              <span>Scanning PDF for Matched Keywords...</span>
            </>
          ) : (
            <>
              <Search className="h-4 w-4 text-white" />
              <span>Scan PDF for Keywords ({keywords.length} Target Keywords)</span>
            </>
          )}
        </button>
      </div>

      {/* Redaction Preview & Execution Section */}
      {scanResult && (
        <div className="bg-[#17171a] p-6 rounded-2xl border border-[#24242a] space-y-6">
          <div className="flex items-center justify-between border-b border-[#24242a] pb-3 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider">3. Redaction Preview Summary</h4>
            <span className="font-mono text-white font-bold text-sm">{scanResult.total_redactions} Total Occurrences Found</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {scanResult.keywords_summary.map((ks) => (
              <div key={ks.keyword} className="bg-[#131316] p-4 rounded-xl border border-[#222228] text-xs space-y-1">
                <p className="font-bold text-slate-200 truncate">{ks.keyword}</p>
                <p className="text-slate-400 text-[11px]">
                  <strong className="text-white">{ks.matches_count} matches</strong> across {ks.pages_count} pages
                </p>
              </div>
            ))}
          </div>

          {/* Matched Locations List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Matched Locations ({scanResult.matches.length})</h4>
            <div className="max-h-[300px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
              {scanResult.matches.map((m) => (
                <div key={m.match_id} className="bg-[#131316] p-3 rounded-xl border border-[#222228] flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-[#222228] text-white border border-[#33333d] rounded font-mono font-bold">
                      Page {m.page}
                    </span>
                    <span className="font-bold text-slate-200">{m.keyword}:</span>
                    <span className="text-slate-400 italic font-mono text-[11px] truncate max-w-md">"{m.snippet}"</span>
                  </div>

                  <span className="text-[10px] font-mono text-slate-500">
                    BBox: [{m.bbox.join(", ")}]
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Execute Redaction Action & Download */}
          <div className="pt-4 border-t border-[#24242a] flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              onClick={handleApplyRedactions}
              disabled={isApplying || scanResult.matches.length === 0}
              className="w-full sm:w-auto px-6 py-3 bg-[#222228] hover:bg-[#2c2c36] disabled:opacity-50 text-white text-xs font-bold rounded-xl border border-[#33333d] flex items-center justify-center gap-2 transition-all"
            >
              {isApplying ? <RefreshCw className="h-4 w-4 animate-spin text-white" /> : <ShieldAlert className="h-4 w-4 text-white" />}
              <span>Execute Permanent True Redaction</span>
            </button>

            {redactionVerification && (
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#222228] border border-[#33333d] text-white text-xs font-semibold">
                <ShieldCheck className="h-4 w-4 text-white" />
                <span>Security Verified: 0 Unredacted Occurrences</span>
              </div>
            )}

            {redactedPdfPath && (
              <a
                href={getDirectDownloadUrl(redactedPdfPath)}
                download
                className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-slate-200 text-black text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all border border-white"
              >
                <Download className="h-4 w-4" />
                <span>Download Final Redacted PDF</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

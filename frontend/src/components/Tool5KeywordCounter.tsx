"use client";

import React, { useState } from "react";
import {
  Upload,
  FileText,
  Hash,
  Copy,
  Check,
  Filter,
  SlidersHorizontal,
  Search,
  RefreshCw,
  AlertCircle,
  Layers,
  Sparkles,
  Shuffle
} from "lucide-react";
import { directCountKeywords, KeywordCounterResult, KeywordCountItem } from "@/lib/api";

export function Tool5KeywordCounter() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Settings
  const [minFrequency, setMinFrequency] = useState<number>(1);
  const [minWordLength, setMinWordLength] = useState<number>(2);
  const [excludeStopwords, setExcludeStopwords] = useState<boolean>(false);
  const [includePhrases, setIncludePhrases] = useState<boolean>(true);

  // Results & UI state
  const [result, setResult] = useState<KeywordCounterResult | null>(null);
  const [semicolonText, setSemicolonText] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [tableFilter, setTableFilter] = useState("");

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        setSelectedFile(file);
        setError(null);
        setResult(null);
      } else {
        setError("Please upload a valid PDF file.");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setError(null);
      setResult(null);
    }
  };

  const handleRunCounter = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);

    try {
      const res = await directCountKeywords(
        selectedFile,
        minFrequency,
        minWordLength,
        excludeStopwords,
        includePhrases
      );
      setResult(res);
      setSemicolonText(res.semicolon_formatted);
    } catch (err: any) {
      setError(err.message || "Failed to analyze PDF keywords");
    } finally {
      setLoading(false);
    }
  };

  const handleCopySemicolon = () => {
    if (!semicolonText) return;
    navigator.clipboard.writeText(semicolonText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShuffleSemicolon = () => {
    if (!semicolonText) return;
    const words = semicolonText.split(";");
    for (let i = words.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [words[i], words[j]] = [words[j], words[i]];
    }
    setSemicolonText(words.join(";"));
  };

  const filteredKeywords = result?.keywords.filter((k) =>
    k.word.toLowerCase().includes(tableFilter.toLowerCase())
  ) || [];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d0d10] text-slate-100 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#222228] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#1a1a20] border border-[#2d2d38] text-slate-300">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white tracking-tight">
                Keyword Counter & Frequency Analyzer
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Extracts, counts word frequencies across PDF pages, and outputs copyable semicolon format
              </p>
            </div>
          </div>
        </div>

        {selectedFile && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 truncate max-w-[200px]">
              {selectedFile.name}
            </span>
            <button
              onClick={() => {
                setSelectedFile(null);
                setResult(null);
              }}
              className="text-xs px-3 py-1.5 rounded-md bg-[#1a1a20] hover:bg-[#252530] text-slate-300 border border-[#2d2d38] transition"
            >
              Change PDF
            </button>
          </div>
        )}
      </div>

      {/* Upload area or Settings & Analyze */}
      {!selectedFile ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleFileDrop}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition flex flex-col items-center justify-center cursor-pointer min-h-[300px] ${
            isDragOver
              ? "border-slate-400 bg-[#16161c]"
              : "border-[#282832] bg-[#121217] hover:border-[#3b3b48] hover:bg-[#15151b]"
          }`}
        >
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
            id="counter-pdf-upload"
          />
          <label htmlFor="counter-pdf-upload" className="cursor-pointer flex flex-col items-center">
            <div className="p-4 rounded-full bg-[#1b1b22] border border-[#2e2e3a] mb-4 text-slate-300">
              <Upload className="w-8 h-8" />
            </div>
            <h3 className="text-base font-medium text-white mb-1">
              Drop your PDF document here
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mb-4">
              Upload any multi-page PDF to extract word and phrase frequency counts in seconds.
            </p>
            <span className="px-4 py-2 rounded-lg bg-[#22222a] hover:bg-[#2c2c36] text-xs font-medium text-slate-200 border border-[#333340] transition">
              Select PDF File
            </span>
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Panel */}
          <div className="lg:col-span-4 bg-[#131318] border border-[#22222a] rounded-xl p-5 space-y-5">
            <div className="flex items-center gap-2 border-b border-[#22222a] pb-3">
              <SlidersHorizontal className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-medium text-white">Analyzer Settings</h3>
            </div>

            {/* Min Frequency */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">
                Minimum Frequency Count
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={minFrequency}
                onChange={(e) => setMinFrequency(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-[#1a1a22] border border-[#2c2c38] rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-slate-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Only show keywords appearing at least N times.
              </p>
            </div>

            {/* Min Word Length */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1.5">
                Minimum Word Length
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={minWordLength}
                onChange={(e) => setMinWordLength(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-[#1a1a22] border border-[#2c2c38] rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-slate-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Filter out short words (e.g. min length 2 ignores 1-char letters).
              </p>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3 pt-2 border-t border-[#22222a]">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={excludeStopwords}
                  onChange={(e) => setExcludeStopwords(e.target.checked)}
                  className="rounded border-[#333340] bg-[#1a1a22] text-slate-400 focus:ring-0"
                />
                Exclude common stopwords (yang, di, dan, the, is, ...)
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={includePhrases}
                  onChange={(e) => setIncludePhrases(e.target.checked)}
                  className="rounded border-[#333340] bg-[#1a1a22] text-slate-400 focus:ring-0"
                />
                Include 2-word phrases (n-grams)
              </label>
            </div>

            <button
              onClick={handleRunCounter}
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[#24242e] hover:bg-[#30303d] disabled:opacity-50 font-medium text-xs text-white border border-[#383846] flex items-center justify-center gap-2 transition"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                  Analyzing PDF...
                </>
              ) : (
                <>
                  <Hash className="w-4 h-4 text-slate-300" />
                  Analyze Keywords & Count
                </>
              )}
            </button>

            {error && (
              <div className="p-3 rounded-lg bg-[#251515] border border-[#4d2020] text-red-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Results Display */}
          <div className="lg:col-span-8 space-y-5">
            {!result && !loading && (
              <div className="bg-[#131318] border border-[#22222a] rounded-xl p-12 text-center text-slate-400 flex flex-col items-center justify-center min-h-[300px]">
                <FileText className="w-10 h-10 text-slate-600 mb-3" />
                <p className="text-sm font-medium text-slate-300">Ready to analyze</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Click &quot;Analyze Keywords & Count&quot; to process PDF pages and generate semicolon format.
                </p>
              </div>
            )}

            {loading && (
              <div className="bg-[#131318] border border-[#22222a] rounded-xl p-12 text-center text-slate-400 flex flex-col items-center justify-center min-h-[300px]">
                <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mb-4" />
                <p className="text-sm font-medium text-slate-200">Processing PDF text layer...</p>
                <p className="text-xs text-slate-500 mt-1">Scanning pages and compiling frequency statistics.</p>
              </div>
            )}

            {result && !loading && (
              <>
                {/* Stats row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#131318] border border-[#22222a] rounded-xl p-4">
                    <p className="text-xs text-slate-400 font-medium">Total Words Scanned</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {result.total_words_scanned.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-[#131318] border border-[#22222a] rounded-xl p-4">
                    <p className="text-xs text-slate-400 font-medium">Unique Keywords Found</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {result.unique_words_count.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Semicolon Copy Box */}
                <div className="bg-[#131318] border border-[#2b2b36] rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Copy className="w-4 h-4 text-slate-300" />
                      <h4 className="text-sm font-semibold text-white">
                        Semicolon Format (Copyable List)
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleShuffleSemicolon}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-[#1a1a22] hover:bg-[#252530] border-[#333342] text-slate-300 flex items-center gap-1.5 transition"
                        title="Randomize keyword order"
                      >
                        <Shuffle className="w-3.5 h-3.5 text-slate-400" />
                        Shuffle Order
                      </button>

                      <button
                        onClick={handleCopySemicolon}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition ${
                          copied
                            ? "bg-emerald-950 border-emerald-800 text-emerald-300"
                            : "bg-[#22222c] hover:bg-[#2c2c38] border-[#383846] text-slate-200"
                        }`}
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-300" />
                            Copy Keywords
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <textarea
                      readOnly
                      rows={3}
                      value={semicolonText}
                      className="w-full bg-[#181820] border border-[#2a2a36] rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none resize-y selection:bg-slate-700"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Format: <code className="text-slate-400">randomized list (jamilah;aku;tidak;hey;antek antek;asheng)</code> without numbers. Table below remains sorted by frequency rank.
                  </p>
                </div>

                {/* Keyword Frequency Table */}
                <div className="bg-[#131318] border border-[#22222a] rounded-xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-slate-400" />
                      Keyword Frequency Breakdown
                    </h4>

                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Filter keywords..."
                        value={tableFilter}
                        onChange={(e) => setTableFilter(e.target.value)}
                        className="w-full bg-[#181820] border border-[#2a2a36] rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-slate-500"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-[#22222a] rounded-lg max-h-[400px]">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-[#181820] text-slate-400 sticky top-0 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-4 py-2.5 font-medium">#</th>
                          <th className="px-4 py-2.5 font-medium">Keyword / Phrase</th>
                          <th className="px-4 py-2.5 font-medium text-right">Frequency</th>
                          <th className="px-4 py-2.5 font-medium text-right">Pages</th>
                          <th className="px-4 py-2.5 font-medium">Page Numbers</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#22222a]">
                        {filteredKeywords.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                              No keywords matching filter.
                            </td>
                          </tr>
                        ) : (
                          filteredKeywords.map((item, idx) => (
                            <tr key={idx} className="hover:bg-[#181822] transition">
                              <td className="px-4 py-2 text-slate-500 font-mono text-[11px]">
                                {idx + 1}
                              </td>
                              <td className="px-4 py-2 font-medium text-white font-mono">
                                {item.word}
                              </td>
                              <td className="px-4 py-2 text-right font-bold text-slate-200">
                                {item.count}
                              </td>
                              <td className="px-4 py-2 text-right text-slate-400">
                                {item.pages_count}
                              </td>
                              <td className="px-4 py-2 text-slate-400 max-w-[200px] truncate">
                                {item.pages.join(", ")}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

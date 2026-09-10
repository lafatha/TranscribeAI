"use client";

import React, { useState } from "react";
import { Search, FileText, ExternalLink, Sparkles, Image as ImageIcon } from "lucide-react";
import { performSearch, SearchResultItem, API_BASE } from "../lib/api";

export const LocalSearch: React.FC = () => {
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      const res = await performSearch(query.trim());
      setResults(res.results || []);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Minimalist Search Input Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari kata kunci pada slide, tabel, atau teks..."
            className="w-full bg-[#1c1c20] border border-[#2e2e36] focus:border-[#444452] rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
          />
        </div>
        <button
          type="submit"
          disabled={isSearching || !query.trim()}
          className="px-4 py-2.5 bg-[#24242a] hover:bg-[#2d2d34] disabled:opacity-50 text-white text-xs font-medium rounded-xl border border-[#33333d] transition-all flex items-center gap-1.5 shrink-0"
        >
          {isSearching ? "Mencari..." : "Cari Dokumen"}
        </button>
      </form>

      {/* Results Section */}
      {hasSearched && (
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs text-slate-400 px-1">
            <span>Ditemukan {results.length} slide yang cocok</span>
            <span>Kata kunci: "{query}"</span>
          </div>

          {results.length > 0 ? (
            <div className="space-y-3">
              {results.map((item, idx) => {
                const imgRelPath = item.image_path ? item.image_path.split("data")[1] || item.image_path : "";
                const imgUrl = imgRelPath ? `${API_BASE}/data${imgRelPath.replace(/\\/g, "/")}` : null;

                return (
                  <div
                    key={idx}
                    className="bg-[#17171a] p-4 rounded-xl border border-[#24242a] flex flex-col md:flex-row items-start gap-4 hover:border-[#383842] transition-all"
                  >
                    {imgUrl && (
                      <div className="w-full md:w-44 aspect-video bg-black rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border border-[#28282e]">
                        <img src={imgUrl} alt={`Slide ${item.slide_number}`} className="object-contain w-full h-full" />
                      </div>
                    )}

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-indigo-400" />
                          <span className="text-xs font-semibold text-white">{item.document_name}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#222228] text-indigo-300 border border-[#2a2a32]">
                            Slide #{item.slide_number}
                          </span>
                        </div>
                      </div>

                      {/* Highlight snippet */}
                      <div
                        className="text-xs text-slate-300 bg-[#1c1c20] p-3 rounded-lg border border-[#26262c] leading-relaxed font-mono"
                        dangerouslySetInnerHTML={{ __html: item.snippet }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-[#17171a] border border-[#24242a] p-10 text-center text-slate-500 space-y-1 rounded-xl text-xs">
              <p className="font-medium text-slate-300">Tidak ada slide yang cocok dengan kata kunci.</p>
              <p className="text-slate-500">Coba gunakan kata kunci umum lainnya.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

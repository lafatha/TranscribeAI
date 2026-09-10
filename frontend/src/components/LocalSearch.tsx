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
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Search Header Banner */}
      <div className="glass-panel p-8 rounded-2xl border border-slate-800 text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5" />
          LOCAL FULL-TEXT PRESENTATION SEARCH
        </div>
        <h2 className="text-3xl font-extrabold text-white">Search All Processed Presentations</h2>
        <p className="text-slate-400 text-sm max-w-xl mx-auto">
          Instantly query keywords across titles, paragraphs, tables, and chart labels. Powered 100% locally by SQLite FTS5.
        </p>

        <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex gap-3 pt-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. revenue growth, acquisition, strategy 2026..."
              className="w-full bg-slate-900/90 border border-slate-700 hover:border-indigo-500/50 focus:border-indigo-500 rounded-xl pl-12 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition-all shadow-inner"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
          >
            {isSearching ? "Searching..." : "Search"}
          </button>
        </form>
      </div>

      {/* Results Section */}
      {hasSearched && (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400 px-2">
            <span>Found {results.length} matching slides</span>
            <span>Query: "{query}"</span>
          </div>

          {results.length > 0 ? (
            <div className="space-y-4">
              {results.map((item, idx) => {
                const imgRelPath = item.image_path ? item.image_path.split("data")[1] || item.image_path : "";
                const imgUrl = imgRelPath ? `${API_BASE}/data${imgRelPath.replace(/\\/g, "/")}` : null;

                return (
                  <div
                    key={idx}
                    className="glass-card p-5 rounded-xl border border-slate-800 flex flex-col md:flex-row items-start gap-4 hover:border-indigo-500/40 transition-all"
                  >
                    {imgUrl && (
                      <div className="w-full md:w-48 aspect-video bg-slate-950 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-800">
                        <img src={imgUrl} alt={`Slide ${item.slide_number}`} className="object-contain w-full h-full" />
                      </div>
                    )}

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-indigo-400" />
                          <span className="text-sm font-bold text-white">{item.document_name}</span>
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300">
                            Slide #{item.slide_number}
                          </span>
                        </div>
                      </div>

                      {/* Highlight snippet */}
                      <div
                        className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 leading-relaxed font-mono"
                        dangerouslySetInnerHTML={{ __html: item.snippet }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-panel p-12 text-center text-slate-500 space-y-2 rounded-xl">
              <p className="text-sm">No presentation slides matched your query.</p>
              <p className="text-xs text-slate-600">Try searching for broader keywords like "revenue", "2026", or "table".</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

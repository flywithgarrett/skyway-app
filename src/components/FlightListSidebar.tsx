"use client";

import { useState, useMemo } from "react";
import { Flight } from "@/lib/types";
import { fmtAltitude, fmtSpeed } from "@/lib/format";

interface FlightListSidebarProps {
  flights: Flight[];
  selectedFlightId: string | null;
  onSelectFlight: (flight: Flight) => void;
}

export default function FlightListSidebar({ flights, selectedFlightId, onSelectFlight }: FlightListSidebarProps) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return flights;
    const q = search.trim().toUpperCase();
    return flights.filter((f) =>
      f.callsign.toUpperCase().includes(q) ||
      f.flightNumber.toUpperCase().includes(q) ||
      (f.registration && f.registration.toUpperCase().includes(q)) ||
      f.airline.name.toUpperCase().includes(q)
    );
  }, [flights, search]);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="absolute top-16 left-3 z-20 w-9 h-9 rounded-xl flex items-center justify-center glass-panel"
        style={{ backdropFilter: "blur(16px)" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(0,229,255,0.6)" strokeWidth="2" strokeLinecap="round">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    );
  }

  return (
    <div className="absolute top-14 left-3 bottom-16 z-20 w-72 flex flex-col pointer-events-auto hidden sm:flex">
      <div className="flex-1 flex flex-col overflow-hidden glass-panel" style={{ backdropFilter: "blur(16px)" }}>
        {/* Header */}
        <div className="shrink-0 px-3 pt-3 pb-2 border-b border-white/[0.04]">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/25">
              Flights <span className="text-cyan-400/50">{filtered.length}</span>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="p-1 rounded-lg hover:bg-white/5 text-white/20 hover:text-white/40 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(0,229,255,0.3)" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search callsign or tail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-[11px] font-mono text-white/70 placeholder:text-white/15 outline-none"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            />
          </div>
        </div>

        {/* Scrollable flight list */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,229,255,0.15) transparent" }}>
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-[10px] text-white/15">
              {search ? "No matches" : "No flights loaded"}
            </div>
          ) : (
            filtered.map((f) => {
              const isSelected = f.id === selectedFlightId;
              return (
                <button
                  key={f.id}
                  onClick={() => onSelectFlight(f)}
                  className="w-full text-left px-3 py-2 transition-colors border-b border-white/[0.02]"
                  style={{
                    background: isSelected ? "rgba(0,229,255,0.06)" : "transparent",
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[12px] font-bold font-mono" style={{ color: isSelected ? "#00e5ff" : "rgba(0,229,255,0.7)" }}>
                      {f.callsign || f.flightNumber}
                    </span>
                    <span className="text-[9px] font-mono text-white/25">
                      {fmtAltitude(f.altitude)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] text-white/30 truncate">{f.airline.name}</span>
                      {f.aircraft && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.35)" }}>
                          {f.aircraft}
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] font-mono text-white/20 shrink-0 ml-2">
                      {fmtSpeed(f.speed)}
                    </span>
                  </div>
                  {f.origin.code !== "---" && f.destination.code !== "---" && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[9px] font-mono text-white/20">{f.origin.code}</span>
                      <span className="text-[8px] text-white/10">→</span>
                      <span className="text-[9px] font-mono text-white/20">{f.destination.code}</span>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { Flight } from "@/lib/types";

interface TopBarProps {
  totalFlights: number;
  enRouteCount: number;
  onSearchOpen: () => void;
  selectedFlight: Flight | null;
}

export default function TopBar({ totalFlights, enRouteCount, onSearchOpen, selectedFlight }: TopBarProps) {
  const now = new Date();
  const zulu = `${now.getUTCHours().toString().padStart(2, "0")}:${now.getUTCMinutes().toString().padStart(2, "0")}Z`;

  return (
    <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
      <div className="flex items-center gap-3 px-4 py-2.5 pointer-events-auto glass-bar">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
          <span className="text-sm font-bold tracking-wider text-glow-white">
            Sky<span className="text-glow-cyan">Way</span>
          </span>
        </div>

        {/* Search bar */}
        <button
          onClick={onSearchOpen}
          className="flex-1 max-w-sm flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs glass-input transition-all hover:border-cyan-400/30"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-cyan-400/60">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="text-slate-500">Search flights, airports...</span>
        </button>

        {/* Right side info */}
        <div className="flex items-center gap-2 shrink-0">
          {selectedFlight ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg glass-chip">
              <span className="text-xs font-bold text-glow-cyan">{selectedFlight.flightNumber}</span>
              <span className="text-[10px] text-slate-500">{selectedFlight.origin.code} → {selectedFlight.destination.code}</span>
            </div>
          ) : (
            <>
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg glass-chip">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono text-glow-cyan">LIVE</span>
                <span className="text-[10px] font-mono text-slate-500">{zulu}</span>
              </div>
              <div className="hidden md:flex items-center gap-3 px-2.5 py-1 text-[10px] text-slate-500">
                <span><span className="text-glow-cyan font-semibold">{totalFlights}</span> flights</span>
                <span><span className="text-emerald-400 font-semibold">{enRouteCount}</span> en route</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

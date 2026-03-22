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
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
          <span className="text-[15px] font-bold tracking-wider text-glow-white">
            Sky<span className="text-glow-cyan">Way</span>
          </span>
        </div>

        {/* Search bar */}
        <button
          onClick={onSearchOpen}
          className="flex-1 max-w-sm flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs glass-input"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="opacity-40">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="text-white/25">Search flights, airports...</span>
        </button>

        {/* Right side info */}
        <div className="flex items-center gap-2 shrink-0">
          {selectedFlight ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl glass-chip">
              <span className="text-xs font-bold text-glow-cyan">{selectedFlight.flightNumber}</span>
              <span className="text-[10px] text-white/30">{selectedFlight.origin.code} → {selectedFlight.destination.code}</span>
            </div>
          ) : (
            <>
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl glass-chip">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_4px_rgba(52,211,153,0.5)]" />
                <span className="text-[10px] font-mono text-glow-cyan">LIVE</span>
                <span className="text-[10px] font-mono text-white/30">{zulu}</span>
              </div>

              {/* Layers button */}
              <button className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl glass-button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400/70">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                <span className="text-[10px] font-medium text-cyan-400/70">Layers</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

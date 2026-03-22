"use client";

import { Flight } from "@/lib/types";

interface TopBarProps {
  totalFlights: number;
  enRouteCount: number;
  onSearchOpen: () => void;
  selectedFlight: Flight | null;
}

export default function TopBar({ totalFlights, enRouteCount, onSearchOpen, selectedFlight }: TopBarProps) {
  return (
    <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
      <div className="flex items-center justify-between px-4 py-3 pointer-events-auto"
           style={{ background: "linear-gradient(180deg, rgba(10,22,40,0.95) 0%, rgba(10,22,40,0.7) 70%, transparent 100%)" }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="#3bb8e8"/>
            </svg>
            <span className="text-lg font-bold tracking-wide" style={{ color: "#e0e7ef" }}>
              SKY<span style={{ color: "#3bb8e8" }}>WAY</span>
            </span>
          </div>
          {!selectedFlight && (
            <div className="hidden sm:flex items-center gap-4 ml-4 text-xs" style={{ color: "#6b8299" }}>
              <span><span style={{ color: "#3bb8e8" }} className="font-semibold">{totalFlights}</span> flights</span>
              <span><span style={{ color: "#22c55e" }} className="font-semibold">{enRouteCount}</span> en route</span>
            </div>
          )}
        </div>

        {selectedFlight ? (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-bold" style={{ color: "#3bb8e8" }}>{selectedFlight.flightNumber}</div>
              <div className="text-xs" style={{ color: "#6b8299" }}>{selectedFlight.airline.name}</div>
            </div>
          </div>
        ) : (
          <button
            onClick={onSearchOpen}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors"
            style={{ background: "rgba(59,184,232,0.12)", color: "#3bb8e8", border: "1px solid rgba(59,184,232,0.25)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Search
          </button>
        )}
      </div>
    </div>
  );
}

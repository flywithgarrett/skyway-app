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
      <div className="flex items-center gap-3 px-4 pointer-events-auto glass-bar" style={{ height: 52 }}>
        {/* Logo */}
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 shrink-0 cursor-pointer"
          style={{ background: "none", border: "none", padding: 0 }}
        >
          <span style={{ fontSize: 15, color: "#0A84FF" }}>✈</span>
          <span style={{ fontSize: 17, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
            SkyWay
          </span>
        </button>

        {/* Search bar */}
        <button
          onClick={onSearchOpen}
          className="flex-1 max-w-sm flex items-center gap-2 px-3 py-1.5 glass-input"
          style={{ borderRadius: 10 }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ opacity: 0.3 }}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.30)" }}>Search flights, airports...</span>
        </button>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {selectedFlight ? (
            <div className="flex items-center gap-2 px-3 py-1 glass-chip" style={{ borderRadius: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#0A84FF" }}>{selectedFlight.flightNumber}</span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.30)" }}>{selectedFlight.origin.code} → {selectedFlight.destination.code}</span>
            </div>
          ) : (
            <>
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 glass-chip" style={{
                background: "rgba(52,199,89,0.15)",
                border: "1px solid rgba(52,199,89,0.3)",
                borderRadius: 6,
              }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#34C759" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#34C759", letterSpacing: "0.02em" }}>LIVE</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.30)", fontVariantNumeric: "tabular-nums" }}>{zulu}</span>
              </div>

              <button className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 glass-button" style={{ borderRadius: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#0A84FF" }}>
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                <span style={{ fontSize: 11, fontWeight: 500, color: "#0A84FF" }}>Layers</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

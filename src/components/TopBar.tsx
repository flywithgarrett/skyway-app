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
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 20, pointerEvents: "none" }}>
      <div style={{
        height: 52,
        background: "rgba(10,10,15,0.85)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        padding: "0 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        pointerEvents: "auto",
      }}>
        {/* Logo */}
        <button
          onClick={() => window.location.reload()}
          style={{ background: "none", border: "none", padding: 0, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flexShrink: 0 }}
        >
          <span style={{ fontSize: 15, color: "#0A84FF" }}>✈</span>
          <span style={{ fontSize: 17, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>SkyWay</span>
        </button>

        {/* Search bar */}
        <button
          onClick={onSearchOpen}
          style={{
            flex: 1, maxWidth: 360,
            display: "flex", alignItems: "center", gap: 8,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.30)" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span style={{ fontSize: 14, color: "rgba(255,255,255,0.30)" }}>Search flights, airports...</span>
        </button>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {selectedFlight ? (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, padding: "4px 10px",
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#0A84FF" }}>{selectedFlight.flightNumber}</span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.30)" }}>{selectedFlight.origin.code} → {selectedFlight.destination.code}</span>
            </div>
          ) : (
            <>
              {/* LIVE badge */}
              <div className="hidden sm:flex" style={{
                alignItems: "center", gap: 6,
                background: "rgba(52,199,89,0.15)",
                border: "1px solid rgba(52,199,89,0.3)",
                borderRadius: 6,
                padding: "3px 8px",
              }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#34C759" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#34C759", letterSpacing: "0.04em" }}>LIVE</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.30)", fontVariantNumeric: "tabular-nums" }}>{zulu}</span>
              </div>

              {/* Layers button */}
              <button className="hidden sm:flex" style={{
                alignItems: "center", gap: 6,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8, padding: "6px 12px",
                cursor: "pointer",
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0A84FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                </svg>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#0A84FF" }}>Layers</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

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
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0,
      height: 52,
      paddingTop: "env(safe-area-inset-top, 0px)",
      background: "rgba(10,10,15,0.92)",
      backdropFilter: "blur(20px) saturate(180%)",
      WebkitBackdropFilter: "blur(20px) saturate(180%)",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      display: "flex", alignItems: "center",
      padding: "0 16px", gap: 12,
      fontFamily: "-apple-system, 'SF Pro Display', system-ui, sans-serif",
    }}>
      {/* Logo */}
      <span
        onClick={() => window.location.reload()}
        style={{
          fontSize: 18, fontWeight: 700, color: "#FFFFFF",
          letterSpacing: "-0.02em", cursor: "pointer", userSelect: "none",
          flexShrink: 0,
        }}
      >
        SkyWay
      </span>

      {/* Search bar — full on desktop, icon on mobile */}
      <div
        onClick={onSearchOpen}
        className="desktop-only"
        style={{
          flex: 1, maxWidth: 360,
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 10, padding: "7px 12px",
          color: "rgba(255,255,255,0.35)", fontSize: 14,
          cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        Search flights, airports...
      </div>
      {/* Mobile search icon */}
      <div style={{ flex: 1 }} className="mobile-only" />
      <button
        onClick={onSearchOpen}
        className="mobile-only"
        style={{
          background: "rgba(255,255,255,0.07)", border: "none",
          borderRadius: 10, width: 36, height: 36, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "rgba(255,255,255,0.55)",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>

      {/* Right side */}
      {selectedFlight ? (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 8, padding: "4px 10px", flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#0A84FF" }}>{selectedFlight.flightNumber}</span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.30)" }}>{selectedFlight.origin.code} → {selectedFlight.destination.code}</span>
        </div>
      ) : (
        <>
          {/* LIVE badge */}
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "rgba(52,199,89,0.12)",
            border: "1px solid rgba(52,199,89,0.30)",
            borderRadius: 6, padding: "3px 8px",
            flexShrink: 0,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34C759", display: "inline-block" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#34C759", letterSpacing: "0.04em" }}>LIVE</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.35)", fontVariantNumeric: "tabular-nums" }}>{zulu}</span>
          </div>

          {/* Layers */}
          <button style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 8, padding: "6px 12px",
            color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 500,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
            </svg>
            Layers
          </button>
        </>
      )}
    </nav>
  );
}

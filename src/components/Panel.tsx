"use client";

import { Flight } from "@/lib/types";

interface PanelProps {
  flight: Flight;
  onClose: () => void;
  onViewDetails: (flight: Flight) => void;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; glow: string }> = {
    "en-route": { bg: "rgba(52,211,153,0.08)", text: "#34d399", glow: "0 0 8px rgba(52,211,153,0.15)" },
    "on-ground": { bg: "rgba(100,116,139,0.08)", text: "#64748b", glow: "none" },
    unknown: { bg: "rgba(0,229,255,0.08)", text: "#00e5ff", glow: "0 0 8px rgba(0,229,255,0.15)" },
  };
  const s = styles[status] || styles["unknown"];
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
      style={{ background: s.bg, color: s.text, boxShadow: s.glow }}
    >
      {status}
    </span>
  );
}

export default function Panel({ flight, onClose, onViewDetails }: PanelProps) {
  const hasRoute = flight.origin.code !== "---" && flight.destination.code !== "---";

  return (
    <div className="absolute bottom-14 left-0 right-0 sm:left-auto sm:right-4 sm:bottom-16 sm:w-80 z-30">
      <div className="mx-2 sm:mx-0 overflow-hidden glass-panel">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold tracking-wide"
              style={{
                background: `linear-gradient(135deg, ${flight.airline.color}, ${flight.airline.color}88)`,
                color: "#fff",
                boxShadow: `0 2px 8px ${flight.airline.color}30`,
              }}
            >
              {flight.airline.code}
            </div>
            <div>
              <div className="font-bold text-sm text-glow-cyan">{flight.flightNumber}</div>
              <div className="text-[11px] text-white/30">{flight.airline.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={flight.status} />
            <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:bg-white/5 text-white/20 hover:text-white/40">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Route (only if origin/dest known) or Position */}
        <div className="px-4 py-3">
          {hasRoute ? (
            <div className="flex items-center justify-between">
              <div className="text-center">
                <div className="text-xl font-bold text-glow-white">{flight.origin.code}</div>
                <div className="text-[10px] text-white/25 mt-0.5">{flight.origin.city}</div>
              </div>
              <div className="flex-1 mx-4 text-center text-[10px] text-white/20">→</div>
              <div className="text-center">
                <div className="text-xl font-bold text-glow-white">{flight.destination.code}</div>
                <div className="text-[10px] text-white/25 mt-0.5">{flight.destination.city}</div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-widest text-white/15 mb-1">Position</div>
              <div className="text-sm font-mono text-white/50">
                {flight.currentLat.toFixed(4)}°, {flight.currentLng.toFixed(4)}°
              </div>
              <div className="text-[10px] text-white/20 mt-1">{flight.originCountry}</div>
            </div>
          )}
        </div>

        {/* Details grid */}
        <div className="px-4 pb-3">
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: "Altitude", value: flight.altitude > 0 ? `${(flight.altitude / 1000).toFixed(1)}k ft` : "---" },
              { label: "Speed", value: flight.speed > 0 ? `${flight.speed} kts` : "---" },
              { label: "Heading", value: flight.heading > 0 ? `${Math.round(flight.heading)}°` : "---" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl px-2 py-2 text-center glass-detail">
                <div className="text-[9px] uppercase tracking-widest mb-0.5 text-white/20">{item.label}</div>
                <div className="text-[11px] font-semibold text-white/60 font-mono">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* View Full Details button */}
        <div className="px-4 pb-4">
          <button
            onClick={() => onViewDetails(flight)}
            className="w-full py-2 rounded-xl text-[11px] font-semibold tracking-wide transition-all duration-300 detail-view-btn"
          >
            View Full Details
          </button>
        </div>
      </div>
    </div>
  );
}

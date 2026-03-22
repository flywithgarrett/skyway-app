"use client";

import { Flight } from "@/lib/types";

interface PanelProps {
  flight: Flight;
  onClose: () => void;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; glow: string }> = {
    "en-route": { bg: "rgba(52,211,153,0.08)", text: "#34d399", glow: "0 0 8px rgba(52,211,153,0.15)" },
    "on-time": { bg: "rgba(0,229,255,0.08)", text: "#00e5ff", glow: "0 0 8px rgba(0,229,255,0.15)" },
    delayed: { bg: "rgba(239,68,68,0.08)", text: "#ef4444", glow: "0 0 8px rgba(239,68,68,0.15)" },
    landed: { bg: "rgba(100,116,139,0.08)", text: "#64748b", glow: "none" },
    boarding: { bg: "rgba(251,191,36,0.08)", text: "#fbbf24", glow: "0 0 8px rgba(251,191,36,0.15)" },
  };
  const s = styles[status] || styles["on-time"];
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
      style={{ background: s.bg, color: s.text, boxShadow: s.glow }}
    >
      {status}
    </span>
  );
}

export default function Panel({ flight, onClose }: PanelProps) {
  const progressPercent = Math.round(flight.progress * 100);

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

        {/* Route */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-xl font-bold text-glow-white">{flight.origin.code}</div>
              <div className="text-[10px] text-white/25 mt-0.5">{flight.origin.city}</div>
              <div className="text-[11px] font-mono mt-1 text-glow-cyan">{flight.departureTime}</div>
            </div>

            <div className="flex-1 mx-4">
              <div className="relative h-[2px]">
                <div className="absolute inset-0 rounded-full" style={{ background: "rgba(255, 255, 255, 0.04)" }} />
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    background: "linear-gradient(90deg, #3bb8e8, #00e5ff)",
                    width: `${progressPercent}%`,
                    boxShadow: "0 0 8px rgba(0, 229, 255, 0.3)",
                  }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2"
                  style={{ left: `${progressPercent}%`, transform: `translate(-50%, -50%)` }}
                >
                  <div className="w-3 h-3 rounded-full border border-cyan-400/40 flex items-center justify-center"
                       style={{ background: "rgba(10, 18, 32, 0.9)", boxShadow: "0 0 8px rgba(0, 229, 255, 0.3)" }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  </div>
                </div>
              </div>
              <div className="text-center text-[10px] mt-2 text-white/25 font-mono">{progressPercent}%</div>
            </div>

            <div className="text-center">
              <div className="text-xl font-bold text-glow-white">{flight.destination.code}</div>
              <div className="text-[10px] text-white/25 mt-0.5">{flight.destination.city}</div>
              <div className="text-[11px] font-mono mt-1 text-glow-cyan">{flight.arrivalTime}</div>
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: "Aircraft", value: flight.aircraft },
              { label: "Altitude", value: flight.altitude > 0 ? `${(flight.altitude / 1000).toFixed(1)}k ft` : "---" },
              { label: "Speed", value: flight.speed > 0 ? `${flight.speed} kts` : "---" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl px-2 py-2 text-center glass-detail">
                <div className="text-[9px] uppercase tracking-widest mb-0.5 text-white/20">{item.label}</div>
                <div className="text-[11px] font-semibold text-white/60">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

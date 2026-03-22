"use client";

import { Flight } from "@/lib/types";

interface PanelProps {
  flight: Flight;
  onClose: () => void;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    "en-route": { bg: "rgba(34,197,94,0.15)", text: "#22c55e" },
    "on-time": { bg: "rgba(59,184,232,0.15)", text: "#3bb8e8" },
    delayed: { bg: "rgba(239,68,68,0.15)", text: "#ef4444" },
    landed: { bg: "rgba(156,163,175,0.15)", text: "#9ca3af" },
    boarding: { bg: "rgba(251,191,36,0.15)", text: "#fbbf24" },
  };
  const c = colors[status] || colors["on-time"];
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide"
      style={{ background: c.bg, color: c.text }}
    >
      {status}
    </span>
  );
}

export default function Panel({ flight, onClose }: PanelProps) {
  const progressPercent = Math.round(flight.progress * 100);

  return (
    <div className="absolute bottom-14 left-0 right-0 sm:left-auto sm:right-4 sm:bottom-16 sm:w-80 z-30">
      <div
        className="mx-2 sm:mx-0 rounded-xl overflow-hidden backdrop-blur-lg"
        style={{
          background: "rgba(10,22,40,0.95)",
          border: "1px solid rgba(59,184,232,0.2)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
              style={{ background: flight.airline.color, color: "#fff" }}
            >
              {flight.airline.code}
            </div>
            <div>
              <div className="font-bold text-sm" style={{ color: "#e0e7ef" }}>{flight.flightNumber}</div>
              <div className="text-xs" style={{ color: "#6b8299" }}>{flight.airline.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={flight.status} />
            <button onClick={onClose} className="p-1 rounded-md transition-colors hover:bg-white/5" style={{ color: "#6b8299" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
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
              <div className="text-2xl font-bold" style={{ color: "#e0e7ef" }}>{flight.origin.code}</div>
              <div className="text-xs" style={{ color: "#6b8299" }}>{flight.origin.city}</div>
              <div className="text-xs font-mono mt-1" style={{ color: "#3bb8e8" }}>{flight.departureTime}</div>
            </div>

            <div className="flex-1 mx-4">
              <div className="relative">
                <div className="h-px w-full" style={{ background: "rgba(59,184,232,0.2)" }} />
                <div className="h-px" style={{ background: "#3bb8e8", width: `${progressPercent}%` }} />
                <div
                  className="absolute top-1/2 -translate-y-1/2"
                  style={{ left: `${progressPercent}%`, transform: `translate(-50%, -50%)` }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#3bb8e8">
                    <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="text-center text-xs mt-2" style={{ color: "#6b8299" }}>{progressPercent}%</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: "#e0e7ef" }}>{flight.destination.code}</div>
              <div className="text-xs" style={{ color: "#6b8299" }}>{flight.destination.city}</div>
              <div className="text-xs font-mono mt-1" style={{ color: "#3bb8e8" }}>{flight.arrivalTime}</div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Aircraft", value: flight.aircraft },
              { label: "Altitude", value: flight.altitude > 0 ? `${(flight.altitude / 1000).toFixed(1)}k ft` : "---" },
              { label: "Speed", value: flight.speed > 0 ? `${flight.speed} kts` : "---" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg px-2 py-2 text-center"
                style={{ background: "rgba(59,184,232,0.06)" }}
              >
                <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "#4a6080" }}>{item.label}</div>
                <div className="text-xs font-semibold" style={{ color: "#c8d6e0" }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { Flight } from "@/lib/types";

interface FlightDetailPanelProps {
  flight: Flight;
  onClose: () => void;
}

function StatusIndicator({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; glow: string }> = {
    "en-route": { label: "En Route", color: "#34d399", glow: "rgba(52,211,153,0.25)" },
    "on-ground": { label: "On Ground", color: "#64748b", glow: "none" },
    unknown: { label: "Tracking", color: "#00e5ff", glow: "rgba(0,229,255,0.25)" },
  };
  const s = map[status] || map["unknown"];
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-2 h-2 rounded-full animate-pulse"
        style={{ background: s.color, boxShadow: `0 0 8px ${s.glow}` }}
      />
      <span
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: s.color, textShadow: `0 0 8px ${s.glow}` }}
      >
        {s.label}
      </span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/20 mb-3">
      {children}
    </div>
  );
}

function DataCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="glass-detail rounded-xl px-3 py-2.5">
      <div className="text-[9px] uppercase tracking-widest text-white/20 mb-1">{label}</div>
      <div className={`text-[12px] font-semibold text-white/70 ${mono ? "font-mono" : ""}`}>
        {value}
      </div>
    </div>
  );
}

export default function FlightDetailPanel({ flight, onClose }: FlightDetailPanelProps) {
  const hasRoute = flight.origin.code !== "---" && flight.destination.code !== "---";
  const lastContactDate = flight.lastContact
    ? new Date(flight.lastContact * 1000)
    : null;
  const lastContactStr = lastContactDate
    ? `${lastContactDate.getUTCHours().toString().padStart(2, "0")}:${lastContactDate.getUTCMinutes().toString().padStart(2, "0")}:${lastContactDate.getUTCSeconds().toString().padStart(2, "0")}Z`
    : "---";

  return (
    <div className="detail-panel-slide fixed top-0 right-0 bottom-0 z-40 w-full sm:w-96 md:w-[420px] flex flex-col">
      <div
        className="fixed inset-0 z-[-1] sm:hidden"
        style={{ background: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />

      <div className="flex-1 flex flex-col overflow-hidden glass-detail-panel">
        {/* Header */}
        <div className="shrink-0 px-5 pt-5 pb-4 border-b border-white/[0.04]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-[11px] font-bold tracking-wide"
                style={{
                  background: `linear-gradient(135deg, ${flight.airline.color}, ${flight.airline.color}88)`,
                  color: "#fff",
                  boxShadow: `0 4px 12px ${flight.airline.color}30`,
                }}
              >
                {flight.airline.code}
              </div>
              <div>
                <div className="text-lg font-bold text-glow-cyan">{flight.flightNumber}</div>
                <div className="text-[11px] text-white/30">{flight.airline.name}</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl glass-button text-white/30 hover:text-white/60"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <StatusIndicator status={flight.status} />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

          {/* Route (only if known) */}
          {hasRoute && (
            <section>
              <SectionLabel>Route</SectionLabel>
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <div className="text-2xl font-bold text-glow-white">{flight.origin.code}</div>
                  <div className="text-[10px] text-white/25 mt-0.5">{flight.origin.city}</div>
                </div>
                <div className="px-3 text-white/15">→</div>
                <div className="text-center flex-1">
                  <div className="text-2xl font-bold text-glow-white">{flight.destination.code}</div>
                  <div className="text-[10px] text-white/25 mt-0.5">{flight.destination.city}</div>
                </div>
              </div>
            </section>
          )}

          {/* Live Position */}
          <section>
            <SectionLabel>Live Position</SectionLabel>
            <div className="grid grid-cols-2 gap-1.5">
              <DataCell label="Latitude" value={`${flight.currentLat.toFixed(4)}°`} mono />
              <DataCell label="Longitude" value={`${flight.currentLng.toFixed(4)}°`} mono />
              <DataCell
                label="Baro Altitude"
                value={flight.altitude > 0 ? `${(flight.altitude / 1000).toFixed(1)}k ft` : "---"}
                mono
              />
              <DataCell
                label="Geo Altitude"
                value={flight.geoAltitude != null ? `${(flight.geoAltitude / 1000).toFixed(1)}k ft` : "---"}
                mono
              />
              <DataCell
                label="Ground Speed"
                value={flight.speed > 0 ? `${flight.speed} kts` : "---"}
                mono
              />
              <DataCell
                label="Heading"
                value={flight.heading > 0 ? `${Math.round(flight.heading)}°` : "---"}
                mono
              />
              <DataCell
                label="Vertical Rate"
                value={
                  flight.verticalRate != null
                    ? `${flight.verticalRate > 0 ? "+" : ""}${Math.round(flight.verticalRate * 196.85)} ft/min`
                    : "---"
                }
                mono
              />
              <DataCell
                label="Flight Level"
                value={flight.altitude > 0 ? `FL${Math.round(flight.altitude / 100)}` : "---"}
                mono
              />
            </div>
          </section>

          {/* Aircraft Identification */}
          <section>
            <SectionLabel>Aircraft Identification</SectionLabel>
            <div className="grid grid-cols-2 gap-1.5">
              <DataCell label="ICAO24 Address" value={flight.icao24.toUpperCase()} mono />
              <DataCell label="Callsign" value={flight.callsign || "---"} mono />
              <DataCell label="Squawk" value={flight.squawk || "---"} mono />
              <DataCell label="Country of Origin" value={flight.originCountry || "---"} />
              <DataCell label="Last Contact" value={lastContactStr} mono />
              <DataCell label="Source" value="ADS-B" />
            </div>
          </section>

          {/* Unavailable data notice */}
          <section>
            <div className="glass-detail rounded-2xl px-4 py-3 text-center">
              <div className="text-[10px] text-white/15 leading-relaxed">
                Gate assignments, scheduled times, aircraft type, and flight history
                require a premium data source (e.g. FlightAware AeroAPI) and are not
                available from the OpenSky Network.
              </div>
            </div>
          </section>

          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}

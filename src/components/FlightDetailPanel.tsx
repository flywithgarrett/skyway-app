"use client";

import { Flight } from "@/lib/types";

interface FlightDetailPanelProps {
  flight: Flight;
  onClose: () => void;
}

function fmtTime(iso: string | null): string {
  if (!iso) return "---";
  try {
    const d = new Date(iso);
    return `${d.getUTCHours().toString().padStart(2, "0")}:${d.getUTCMinutes().toString().padStart(2, "0")}Z`;
  } catch { return "---"; }
}

function StatusIndicator({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; glow: string }> = {
    "en-route": { label: "En Route", color: "#34d399", glow: "rgba(52,211,153,0.25)" },
    landed: { label: "Arrived", color: "#64748b", glow: "none" },
    scheduled: { label: "Scheduled", color: "#00e5ff", glow: "rgba(0,229,255,0.25)" },
    taxiing: { label: "Taxiing", color: "#fbbf24", glow: "rgba(251,191,36,0.25)" },
    unknown: { label: "Tracking", color: "#00e5ff", glow: "rgba(0,229,255,0.25)" },
  };
  const s = map[status] || map["unknown"];
  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: s.color, boxShadow: `0 0 8px ${s.glow}` }} />
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: s.color, textShadow: `0 0 8px ${s.glow}` }}>
        {s.label}
      </span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/20 mb-3">{children}</div>;
}

function DataCell({ label, value, mono, cyan }: { label: string; value: string; mono?: boolean; cyan?: boolean }) {
  return (
    <div className="glass-detail rounded-xl px-3 py-2.5">
      <div className="text-[9px] uppercase tracking-widest text-white/20 mb-1">{label}</div>
      <div className={`text-[12px] font-semibold ${cyan ? "text-glow-cyan" : "text-white/70"} ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

export default function FlightDetailPanel({ flight, onClose }: FlightDetailPanelProps) {
  const hasRoute = flight.origin.code !== "---" && flight.destination.code !== "---";
  const progressPercent = Math.round(flight.progress);

  return (
    <div className="detail-panel-slide fixed top-0 right-0 bottom-0 z-40 w-full sm:w-96 md:w-[420px] flex flex-col">
      <div className="fixed inset-0 z-[-1] sm:hidden" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} />

      <div className="flex-1 flex flex-col overflow-hidden glass-detail-panel">
        {/* Header */}
        <div className="shrink-0 px-5 pt-5 pb-4 border-b border-white/[0.04]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-[11px] font-bold tracking-wide"
                style={{ background: `linear-gradient(135deg, ${flight.airline.color}, ${flight.airline.color}88)`, color: "#fff", boxShadow: `0 4px 12px ${flight.airline.color}30` }}>
                {flight.airline.code}
              </div>
              <div>
                <div className="text-lg font-bold text-glow-cyan">{flight.flightNumber}</div>
                <div className="text-[11px] text-white/30">{flight.airline.name}</div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl glass-button text-white/30 hover:text-white/60">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <StatusIndicator status={flight.status} />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

          {/* Departure / Arrival Block */}
          {hasRoute && (
            <section>
              <SectionLabel>Route</SectionLabel>
              <div className="flex items-stretch gap-0">
                {/* Departure */}
                <div className="flex-1 text-center">
                  <div className="text-2xl font-bold text-glow-white">{flight.origin.code}</div>
                  <div className="text-[10px] text-white/25 mt-0.5">{flight.origin.city}</div>
                  {flight.origin.name && <div className="text-[10px] text-white/15 mt-0.5">{flight.origin.name}</div>}
                  <div className="mt-2 border-t border-white/[0.04] pt-2">
                    <div className="text-[9px] uppercase tracking-widest text-white/15 mb-0.5">Scheduled Dep</div>
                    <div className="text-[12px] font-mono text-white/40">{fmtTime(flight.scheduledDep)}</div>
                    {flight.actualDep && (
                      <>
                        <div className="text-[9px] uppercase tracking-widest text-white/15 mt-1.5 mb-0.5">Actual Dep</div>
                        <div className="text-[15px] font-mono font-semibold text-glow-cyan">{fmtTime(flight.actualDep)}</div>
                      </>
                    )}
                  </div>
                </div>

                {/* Progress */}
                <div className="flex flex-col items-center justify-center px-3 py-4 w-20">
                  {progressPercent > 0 ? (
                    <>
                      <div className="relative h-full w-[2px]">
                        <div className="absolute inset-0 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} />
                        <div className="absolute inset-x-0 top-0 rounded-full"
                          style={{ background: "linear-gradient(180deg, #3bb8e8, #00e5ff)", height: `${progressPercent}%`, boxShadow: "0 0 8px rgba(0,229,255,0.25)" }} />
                        <div className="absolute left-1/2 -translate-x-1/2" style={{ top: `${progressPercent}%`, transform: "translate(-50%,-50%)" }}>
                          <div className="w-3 h-3 rounded-full border border-cyan-400/40 flex items-center justify-center"
                            style={{ background: "rgba(10,18,32,0.9)", boxShadow: "0 0 8px rgba(0,229,255,0.3)" }}>
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                          </div>
                        </div>
                      </div>
                      <div className="text-[10px] font-mono text-white/25 mt-2">{progressPercent}%</div>
                    </>
                  ) : (
                    <div className="text-white/10">→</div>
                  )}
                </div>

                {/* Arrival */}
                <div className="flex-1 text-center">
                  <div className="text-2xl font-bold text-glow-white">{flight.destination.code}</div>
                  <div className="text-[10px] text-white/25 mt-0.5">{flight.destination.city}</div>
                  {flight.destination.name && <div className="text-[10px] text-white/15 mt-0.5">{flight.destination.name}</div>}
                  <div className="mt-2 border-t border-white/[0.04] pt-2">
                    <div className="text-[9px] uppercase tracking-widest text-white/15 mb-0.5">Scheduled Arr</div>
                    <div className="text-[12px] font-mono text-white/40">{fmtTime(flight.scheduledArr)}</div>
                    {(flight.estimatedArr || flight.actualArr) && (
                      <>
                        <div className="text-[9px] uppercase tracking-widest text-white/15 mt-1.5 mb-0.5">
                          {flight.actualArr ? "Actual Arr" : "Estimated Arr"}
                        </div>
                        <div className="text-[15px] font-mono font-semibold text-glow-cyan">
                          {fmtTime(flight.actualArr || flight.estimatedArr)}
                        </div>
                      </>
                    )}
                  </div>
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
              <DataCell label="Altitude" value={flight.altitude > 0 ? `${(flight.altitude / 1000).toFixed(1)}k ft` : "---"} mono />
              <DataCell label="Flight Level" value={flight.altitude > 0 ? `FL${Math.round(flight.altitude / 100)}` : "---"} mono />
              <DataCell label="Ground Speed" value={flight.speed > 0 ? `${flight.speed} kts` : "---"} mono />
              <DataCell label="Heading" value={flight.heading > 0 ? `${Math.round(flight.heading)}°` : "---"} mono />
            </div>
          </section>

          {/* Aircraft Details */}
          <section>
            <SectionLabel>Aircraft</SectionLabel>
            <div className="grid grid-cols-2 gap-1.5">
              <DataCell label="Aircraft Type" value={flight.aircraft || "---"} mono />
              <DataCell label="Registration" value={flight.registration || "---"} mono />
              <DataCell label="Callsign" value={flight.callsign || "---"} mono />
              {flight.routeDistance && (
                <DataCell label="Route Distance" value={`${flight.routeDistance.toLocaleString()} nm`} mono />
              )}
            </div>
          </section>

          {/* Data source */}
          <section>
            <div className="glass-detail rounded-2xl px-4 py-3 text-center">
              <div className="text-[10px] text-white/15 leading-relaxed">
                Data provided by FlightAware AeroAPI
              </div>
            </div>
          </section>

          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}

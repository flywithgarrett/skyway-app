"use client";

import { Flight } from "@/lib/types";
import { FlightDetail } from "@/lib/api";
import { fmtAltitude, fmtHeading, fmtSpeed, fmtTime } from "@/lib/format";

interface FlightDetailPanelProps {
  flight: Flight;
  detail: FlightDetail | null;
  onClose: () => void;
  onShowOnMap?: () => void;
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

function Pill({ label, color }: { label: string; color?: string }) {
  return (
    <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-medium"
      style={{
        background: color ? `${color}10` : "rgba(0,229,255,0.06)",
        color: color || "rgba(0,229,255,0.6)",
        border: `1px solid ${color ? `${color}20` : "rgba(0,229,255,0.1)"}`,
      }}>
      {label}
    </span>
  );
}

function guessWeightClass(ac: string | null): string | null {
  if (!ac) return null;
  const upper = ac.toUpperCase();
  if (upper.startsWith("A38")) return "Super";
  const heavy = ["B74", "B77", "B78", "A33", "A34", "A35"];
  if (heavy.some((h) => upper.startsWith(h))) return "Heavy";
  const medium = ["B73", "B75", "A31", "A32", "A21", "E17", "E19", "CRJ"];
  if (medium.some((m) => upper.startsWith(m))) return "Medium";
  return "Light";
}

function computeTimes(flight: Flight) {
  const dep = flight.actualDep || flight.scheduledDep;
  const arr = flight.estimatedArr || flight.scheduledArr;
  if (!dep || !arr) return { elapsed: null, remaining: null, total: null };
  const depMs = new Date(dep).getTime();
  const arrMs = new Date(arr).getTime();
  const nowMs = Date.now();
  const totalMin = Math.max(0, Math.round((arrMs - depMs) / 60000));
  const elapsedMin = Math.max(0, Math.round((nowMs - depMs) / 60000));
  const remainingMin = Math.max(0, totalMin - elapsedMin);
  const fmt = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;
  return { elapsed: fmt(elapsedMin), remaining: fmt(remainingMin), total: fmt(totalMin) };
}

export default function FlightDetailPanel({ flight, detail, onClose, onShowOnMap }: FlightDetailPanelProps) {
  const hasRoute = flight.origin.code !== "---" && flight.destination.code !== "---";
  const progressPercent = Math.round(flight.progress);
  const aircraft = flight.aircraft || detail?.aircraftType || null;
  const registration = flight.registration || detail?.registration || null;
  const weightClass = guessWeightClass(aircraft);
  const times = computeTimes(flight);

  return (
    <div className="detail-panel-slide fixed top-0 right-0 bottom-0 z-40 w-full sm:w-96 md:w-[420px] flex flex-col">
      <div className="fixed inset-0 z-[-1] sm:hidden" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} />

      <div className="flex-1 flex flex-col overflow-hidden glass-detail-panel">
        {/* Header */}
        <div className="shrink-0 px-5 pt-5 pb-4 border-b border-white/[0.04]">
          <div className="flex items-center justify-between mb-2">
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

          {/* Status + Pill tags */}
          <div className="flex items-center justify-between">
            <StatusIndicator status={flight.status} />
            <div className="flex flex-wrap gap-1">
              {registration && <Pill label={registration} />}
              {aircraft && <Pill label={aircraft} />}
              {weightClass && <Pill label={weightClass} color={weightClass === "Super" || weightClass === "Heavy" ? "#f97316" : undefined} />}
            </div>
          </div>
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
                  {detail?.origin?.gate && (
                    <div className="text-[9px] font-mono text-cyan-400/40 mt-1">
                      Gate {detail.origin.terminal ? `${detail.origin.terminal}/` : ""}{detail.origin.gate}
                    </div>
                  )}
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
                  {detail?.destination?.gate && (
                    <div className="text-[9px] font-mono text-cyan-400/40 mt-1">
                      Gate {detail.destination.terminal ? `${detail.destination.terminal}/` : ""}{detail.destination.gate}
                    </div>
                  )}
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

          {/* Flight Time Summary */}
          {times.elapsed && (
            <section>
              <SectionLabel>Flight Time</SectionLabel>
              <div className="grid grid-cols-3 gap-1.5">
                <DataCell label="Elapsed" value={times.elapsed || "—"} mono cyan />
                <DataCell label="Total" value={times.total || "—"} mono />
                <DataCell label="Remaining" value={times.remaining || "—"} mono cyan />
              </div>
            </section>
          )}

          {/* Show on Map Button */}
          {onShowOnMap && (
            <button
              onClick={onShowOnMap}
              className="w-full py-3 rounded-2xl text-sm font-semibold tracking-wide"
              style={{
                background: "linear-gradient(135deg, rgba(0,180,216,0.15) 0%, rgba(0,119,182,0.15) 100%)",
                border: "1px solid rgba(0,229,255,0.2)",
                color: "#00e5ff",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              ✈ Show Route on Map
            </button>
          )}

          {/* Live Position */}
          <section>
            <SectionLabel>Live Position</SectionLabel>
            <div className="grid grid-cols-2 gap-1.5">
              <DataCell label="Latitude" value={`${flight.currentLat.toFixed(4)}°`} mono />
              <DataCell label="Longitude" value={`${flight.currentLng.toFixed(4)}°`} mono />
              <DataCell label="Altitude" value={fmtAltitude(flight.altitude)} mono />
              <DataCell label="Ground Speed" value={fmtSpeed(flight.speed)} mono />
              <DataCell label="Heading" value={fmtHeading(flight.heading)} mono />
              {flight.verticalRate != null && (
                <DataCell label="Vert Rate" value={`${flight.verticalRate > 0 ? "+" : ""}${flight.verticalRate} fpm`} mono />
              )}
              {flight.squawk && (
                <DataCell label="Squawk" value={flight.squawk} mono cyan={flight.squawk === "7700" || flight.squawk === "7600" || flight.squawk === "7500"} />
              )}
              {flight.geoAltitude != null && (
                <DataCell label="Geo Altitude" value={`${flight.geoAltitude.toLocaleString()} ft`} mono />
              )}
            </div>
          </section>

          {/* Aircraft Details */}
          <section>
            <SectionLabel>Aircraft</SectionLabel>
            <div className="grid grid-cols-2 gap-1.5">
              <DataCell label="Aircraft Type" value={aircraft || "---"} mono />
              <DataCell label="Registration" value={registration || "---"} mono />
              <DataCell label="Callsign" value={flight.callsign || "---"} mono />
              {flight.routeDistance && (
                <DataCell label="Route Distance" value={`${flight.routeDistance.toLocaleString()} nm`} mono />
              )}
            </div>
          </section>

          {/* Filed Flight Plan */}
          {detail?.waypoints && (
            <section>
              <SectionLabel>Filed Flight Plan</SectionLabel>
              <div className="glass-detail rounded-xl px-3 py-3">
                {(detail.filedAirspeed || detail.filedAltitude) && (
                  <div className="flex gap-3 mb-2">
                    {detail.filedAltitude && (
                      <span className="text-[9px] font-mono text-white/30">
                        Alt: <span className="text-white/50">{fmtAltitude(detail.filedAltitude)}</span>
                      </span>
                    )}
                    {detail.filedAirspeed && (
                      <span className="text-[9px] font-mono text-white/30">
                        Spd: <span className="text-white/50">{detail.filedAirspeed} kts</span>
                      </span>
                    )}
                  </div>
                )}
                <div className="text-[10px] font-mono text-white/40 leading-relaxed break-all">
                  {detail.waypoints}
                </div>
              </div>
            </section>
          )}

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

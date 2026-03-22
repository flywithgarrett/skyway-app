"use client";

import { Flight } from "@/lib/types";
import { FlightDetail } from "@/lib/api";
import { fmtAltitude, fmtHeading, fmtSpeed, fmtTime } from "@/lib/format";

interface PanelProps {
  flight: Flight;
  detail: FlightDetail | null;
  detailLoading: boolean;
  onClose: () => void;
  onViewDetails: (flight: Flight) => void;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; glow: string }> = {
    "en-route": { bg: "rgba(52,211,153,0.08)", text: "#34d399", glow: "0 0 8px rgba(52,211,153,0.15)" },
    landed: { bg: "rgba(100,116,139,0.08)", text: "#64748b", glow: "none" },
    scheduled: { bg: "rgba(0,229,255,0.08)", text: "#00e5ff", glow: "0 0 8px rgba(0,229,255,0.15)" },
    taxiing: { bg: "rgba(251,191,36,0.08)", text: "#fbbf24", glow: "0 0 8px rgba(251,191,36,0.15)" },
    unknown: { bg: "rgba(0,229,255,0.08)", text: "#00e5ff", glow: "0 0 8px rgba(0,229,255,0.15)" },
  };
  const s = styles[status] || styles["unknown"];
  return (
    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
      style={{ background: s.bg, color: s.text, boxShadow: s.glow }}>
      {status}
    </span>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-medium"
      style={{ background: "rgba(0,229,255,0.06)", color: "rgba(0,229,255,0.5)", border: "1px solid rgba(0,229,255,0.08)" }}>
      {label}
    </span>
  );
}

// Weight class heuristic from ICAO aircraft designator
function guessWeightClass(ac: string | null): string | null {
  if (!ac) return null;
  const heavy = ["B744", "B748", "B772", "B773", "B77L", "B77W", "B788", "B789", "B78X", "A332", "A333", "A338", "A339", "A342", "A343", "A345", "A346", "A359", "A35K", "A380", "A388"];
  const medium = ["B737", "B738", "B739", "B38M", "B39M", "A319", "A320", "A20N", "A321", "A21N", "B752", "B753", "E170", "E175", "E190", "E195", "CRJ7", "CRJ9", "CRJX"];
  const upper = ac.toUpperCase().slice(0, 4);
  if (heavy.some((h) => upper.startsWith(h.slice(0, 3)))) return "Heavy";
  if (ac.toUpperCase().startsWith("A38")) return "Super";
  if (medium.some((m) => upper.startsWith(m.slice(0, 3)))) return "Medium";
  return null;
}

export default function Panel({ flight, detail, detailLoading, onClose, onViewDetails }: PanelProps) {
  const hasRoute = flight.origin.code !== "---" && flight.destination.code !== "---";
  const progressPercent = flight.progress || 0;
  const depTime = flight.actualDep || flight.scheduledDep;
  const arrTime = flight.estimatedArr || flight.scheduledArr;
  const aircraft = flight.aircraft || detail?.aircraftType || null;
  const registration = flight.registration || detail?.registration || null;
  const weightClass = guessWeightClass(aircraft);

  return (
    <div className="absolute bottom-14 left-0 right-0 sm:left-auto sm:right-4 sm:bottom-16 sm:w-80 z-30">
      <div className="mx-2 sm:mx-0 overflow-hidden glass-panel">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold tracking-wide"
              style={{ background: `linear-gradient(135deg, ${flight.airline.color}, ${flight.airline.color}88)`, color: "#fff", boxShadow: `0 2px 8px ${flight.airline.color}30` }}>
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
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Pill tags */}
        <div className="px-4 pb-2 flex flex-wrap gap-1">
          {registration && <Pill label={registration} />}
          {aircraft && <Pill label={aircraft} />}
          {weightClass && <Pill label={weightClass} />}
        </div>

        {/* Route */}
        <div className="px-4 py-3">
          {detailLoading && !detail && !hasRoute ? (
            <div className="text-center py-2">
              <div className="text-[10px] uppercase tracking-widest text-cyan-400/40 animate-pulse">Loading route data...</div>
            </div>
          ) : hasRoute ? (
            <div className="flex items-center justify-between">
              <div className="text-center">
                <div className="text-xl font-bold text-glow-white">{flight.origin.code}</div>
                <div className="text-[10px] text-white/25 mt-0.5">{flight.origin.city}</div>
                <div className="text-[10px] font-mono mt-1 text-glow-cyan">{fmtTime(depTime)}</div>
              </div>
              <div className="flex-1 mx-4">
                {progressPercent > 0 ? (
                  <>
                    <div className="relative h-[2px]">
                      <div className="absolute inset-0 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} />
                      <div className="absolute inset-y-0 left-0 rounded-full"
                        style={{ background: "linear-gradient(90deg, #3bb8e8, #00e5ff)", width: `${progressPercent}%`, boxShadow: "0 0 8px rgba(0,229,255,0.3)" }} />
                      <div className="absolute top-1/2" style={{ left: `${progressPercent}%`, transform: "translate(-50%,-50%)" }}>
                        <div className="w-3 h-3 rounded-full border border-cyan-400/40 flex items-center justify-center"
                          style={{ background: "rgba(10,18,32,0.9)", boxShadow: "0 0 8px rgba(0,229,255,0.3)" }}>
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        </div>
                      </div>
                    </div>
                    <div className="text-center text-[10px] mt-2 text-white/25 font-mono">{Math.round(progressPercent)}%</div>
                  </>
                ) : (
                  <div className="text-center text-white/15 text-[10px]">→</div>
                )}
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-glow-white">{flight.destination.code}</div>
                <div className="text-[10px] text-white/25 mt-0.5">{flight.destination.city}</div>
                <div className="text-[10px] font-mono mt-1 text-glow-cyan">{fmtTime(arrTime)}</div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-widest text-white/15 mb-1">Position</div>
              <div className="text-sm font-mono text-white/50">{flight.currentLat.toFixed(4)}°, {flight.currentLng.toFixed(4)}°</div>
            </div>
          )}
        </div>

        {/* Gate info from FlightAware */}
        {detail && (detail.origin?.gate || detail.destination?.gate) && (
          <div className="px-4 pb-2">
            <div className="flex justify-between text-[9px] font-mono text-white/30">
              {detail.origin?.gate && <span>Gate {detail.origin.terminal ? `${detail.origin.terminal}/` : ""}{detail.origin.gate}</span>}
              {detail.destination?.gate && <span>Gate {detail.destination.terminal ? `${detail.destination.terminal}/` : ""}{detail.destination.gate}</span>}
            </div>
          </div>
        )}

        {/* Details grid — aviation formatting */}
        <div className="px-4 pb-3">
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: "Altitude", value: fmtAltitude(flight.altitude) },
              { label: "Speed", value: fmtSpeed(flight.speed) },
              { label: "Heading", value: fmtHeading(flight.heading) },
            ].map((item) => (
              <div key={item.label} className="rounded-xl px-2 py-2 text-center glass-detail">
                <div className="text-[9px] uppercase tracking-widest mb-0.5 text-white/20">{item.label}</div>
                <div className="text-[11px] font-semibold text-white/60 font-mono">{item.value}</div>
              </div>
            ))}
          </div>
          {flight.routeDistance && (
            <div className="mt-1.5 text-center text-[9px] text-white/20 font-mono">{flight.routeDistance} nm</div>
          )}
        </div>

        <div className="px-4 pb-4">
          <button onClick={() => onViewDetails(flight)}
            className="w-full py-2 rounded-xl text-[11px] font-semibold tracking-wide transition-all duration-300 detail-view-btn">
            View Full Details
          </button>
        </div>
      </div>
    </div>
  );
}

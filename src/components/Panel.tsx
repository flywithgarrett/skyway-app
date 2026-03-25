"use client";

import { Flight } from "@/lib/types";
import { FlightDetail } from "@/lib/api";

interface PanelProps {
  flight: Flight;
  detail: FlightDetail | null;
  detailLoading: boolean;
  onClose: () => void;
  onViewDetails: (flight: Flight) => void;
}

function fmtLocalTime(iso: string | null): string {
  if (!iso) return "--:--";
  try {
    const d = new Date(iso);
    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
  } catch { return "--:--"; }
}

function computeFlightInfo(flight: Flight) {
  const dep = flight.actualDep || flight.scheduledDep;
  const arr = flight.estimatedArr || flight.scheduledArr;
  if (!dep || !arr) return { remaining: null, total: null, status: "" };
  const depMs = new Date(dep).getTime();
  const arrMs = new Date(arr).getTime();
  const nowMs = Date.now();
  const totalMin = Math.max(0, Math.round((arrMs - depMs) / 60000));
  const remainingMin = Math.max(0, Math.round((arrMs - nowMs) / 60000));

  const fmtDur = (m: number) => {
    const h = Math.floor(m / 60);
    const mins = m % 60;
    return h > 0 ? `${h}h ${mins}m` : `${mins}m`;
  };

  let status = "";
  if (flight.status === "en-route") {
    status = `Lands in ${fmtDur(remainingMin)}`;
  } else if (flight.status === "taxiing") {
    status = "Taxiing to gate";
  } else if (flight.status === "landed") {
    status = "Arrived";
  } else if (flight.status === "scheduled") {
    status = "Scheduled";
  }

  return { remaining: fmtDur(remainingMin), total: fmtDur(totalMin), status };
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string; dot: string }> = {
    "en-route": { bg: "rgba(52,199,89,0.12)", text: "#34C759", dot: "#34C759" },
    landed: { bg: "rgba(255,255,255,0.06)", text: "rgba(255,255,255,0.55)", dot: "rgba(255,255,255,0.40)" },
    scheduled: { bg: "rgba(10,132,255,0.12)", text: "#0A84FF", dot: "#0A84FF" },
    taxiing: { bg: "rgba(255,149,0,0.12)", text: "#FF9500", dot: "#FF9500" },
    unknown: { bg: "rgba(255,255,255,0.06)", text: "rgba(255,255,255,0.55)", dot: "rgba(255,255,255,0.40)" },
  };
  const c = colors[status] || colors["unknown"];
  const labels: Record<string, string> = {
    "en-route": "En Route", landed: "Arrived", scheduled: "Scheduled",
    taxiing: "Taxiing", unknown: "Tracking",
  };
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20,
      background: c.bg, fontSize: 10, fontWeight: 600,
    }}>
      <div style={{ width: 5, height: 5, borderRadius: 3, background: c.dot, boxShadow: `0 0 6px ${c.dot}60` }} />
      <span style={{ color: c.text, letterSpacing: "0.03em" }}>{labels[status] || "Tracking"}</span>
    </div>
  );
}

export default function Panel({ flight, detail, detailLoading, onClose, onViewDetails }: PanelProps) {
  const hasRoute = flight.origin.code !== "---" && flight.destination.code !== "---";
  const progressPercent = flight.progress || 0;
  const depTime = flight.actualDep || flight.scheduledDep;
  const arrTime = flight.estimatedArr || flight.scheduledArr;
  const info = computeFlightInfo(flight);
  const aircraft = flight.aircraft || detail?.aircraftType || null;

  return (
    <div className="absolute bottom-14 left-0 right-0 sm:left-auto sm:right-4 sm:bottom-16 sm:w-[340px] z-30"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', sans-serif" }}>
      <div className="mx-2 sm:mx-0 overflow-hidden" style={{
        background: "rgba(17,17,24,0.92)",
        backdropFilter: "blur(20px) saturate(1.3)",
        WebkitBackdropFilter: "blur(20px) saturate(1.3)",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 12px 48px rgba(0,0,0,0.5)",
      }}>
        {/* Header: airline + close */}
        <div style={{ padding: "16px 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 700, color: "#fff", letterSpacing: "0.05em",
              background: `linear-gradient(135deg, ${flight.airline.color}, ${flight.airline.color}99)`,
              boxShadow: `0 2px 8px ${flight.airline.color}40`,
            }}>
              {flight.airline.code}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: "-0.01em" }}>
                {flight.flightNumber}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>
                {flight.airline.name}{aircraft ? ` · ${aircraft}` : ""}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.06)", border: "none", width: 28, height: 28,
            borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "rgba(255,255,255,0.3)", transition: "background 0.15s",
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Status line */}
        <div style={{ padding: "8px 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <StatusPill status={flight.status} />
          {info.status && (
            <span style={{ fontSize: 11, fontWeight: 600, color: flight.status === "en-route" ? "#34d399" : "rgba(255,255,255,0.3)" }}>
              {info.status}
            </span>
          )}
        </div>

        {/* Route Block — Flighty style */}
        {hasRoute && (
          <div style={{ padding: "0 16px 16px" }}>
            {/* Progress bar */}
            {progressPercent > 0 && (
              <div style={{ position: "relative", height: 3, borderRadius: 2, background: "rgba(255,255,255,0.04)", marginBottom: 16 }}>
                <div style={{
                  position: "absolute", top: 0, left: 0, bottom: 0,
                  width: `${progressPercent}%`, borderRadius: 2,
                  background: "linear-gradient(90deg, #34d399, #22d3ee)",
                }} />
                {/* Plane dot on progress bar */}
                <div style={{
                  position: "absolute", top: "50%", left: `${progressPercent}%`,
                  transform: "translate(-50%, -50%)",
                  width: 9, height: 9, borderRadius: 5,
                  background: "#fff", border: "2px solid #34d399",
                  boxShadow: "0 0 8px rgba(52,211,153,0.5)",
                }} />
              </div>
            )}

            {/* Airport codes + times */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              {/* Origin */}
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: "-0.02em", lineHeight: 1 }}>
                    {flight.origin.code}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
                  {flight.origin.city}
                </div>
                {detail?.origin?.gate && (
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 3, fontFamily: "'SF Mono', Menlo, monospace" }}>
                    Terminal {detail.origin.terminal || "–"} · Gate {detail.origin.gate}
                  </div>
                )}
                <div style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginTop: 6, fontFamily: "'SF Mono', Menlo, monospace" }}>
                  {fmtLocalTime(depTime)}
                </div>
              </div>

              {/* Center: route info */}
              <div style={{ textAlign: "center", paddingTop: 4, minWidth: 60 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" style={{ margin: "0 auto" }}>
                  <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                </svg>
                {flight.routeDistance && (
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", marginTop: 4, fontFamily: "'SF Mono', Menlo, monospace" }}>
                    {flight.routeDistance} nm
                  </div>
                )}
              </div>

              {/* Destination */}
              <div style={{ textAlign: "right" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, justifyContent: "flex-end" }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: "-0.02em", lineHeight: 1 }}>
                    {flight.destination.code}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
                  {flight.destination.city}
                </div>
                {detail?.destination?.gate && (
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 3, fontFamily: "'SF Mono', Menlo, monospace" }}>
                    Terminal {detail.destination.terminal || "–"} · Gate {detail.destination.gate}
                  </div>
                )}
                <div style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.7)", marginTop: 6, fontFamily: "'SF Mono', Menlo, monospace" }}>
                  {fmtLocalTime(arrTime)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No route — show coordinates */}
        {!hasRoute && (
          <div style={{ padding: "0 16px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>Position</div>
            <div style={{ fontSize: 13, fontFamily: "'SF Mono', Menlo, monospace", color: "rgba(255,255,255,0.5)" }}>
              {flight.currentLat.toFixed(4)}°, {flight.currentLng.toFixed(4)}°
            </div>
          </div>
        )}

        {/* Data grid */}
        <div style={{ padding: "0 16px 12px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          {[
            { label: "ALT", value: flight.altitude >= 18000 ? `FL${Math.round(flight.altitude / 100)}` : flight.altitude > 0 ? `${flight.altitude.toLocaleString()} ft` : "---" },
            { label: "SPD", value: flight.speed > 0 ? `${flight.speed} kts` : "---" },
            { label: "HDG", value: flight.heading > 0 ? `${Math.round(flight.heading)}°` : "---" },
          ].map((item) => (
            <div key={item.label} style={{
              background: "rgba(255,255,255,0.02)",
              borderRadius: 10,
              padding: "8px 0",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.15)", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 3 }}>{item.label}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.55)", fontFamily: "'SF Mono', Menlo, monospace" }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* View Details button */}
        <div style={{ padding: "0 16px 16px" }}>
          <button
            onClick={() => onViewDetails(flight)}
            style={{
              width: "100%",
              padding: "10px 0",
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "inherit",
              letterSpacing: "0.02em",
              background: "rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.5)",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
          >
            View Full Details
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { Flight } from "@/lib/types";
import { FlightDetail, useDelayPrediction, DelayPrediction, InboundLeg } from "@/lib/api";

interface FlightDetailPanelProps {
  flight: Flight;
  detail: FlightDetail | null;
  onClose: () => void;
  onShowOnMap?: () => void;
}

/* ── Time helpers ── */
function fmtLocalTime(iso: string | null): string {
  if (!iso) return "--:--";
  try {
    const d = new Date(iso);
    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
  } catch { return "--:--"; }
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
  } catch { return ""; }
}

function computeTimes(flight: Flight) {
  const dep = flight.actualDep || flight.scheduledDep;
  const arr = flight.estimatedArr || flight.scheduledArr;
  if (!dep || !arr) return { remaining: null, elapsed: null, total: null };
  const depMs = new Date(dep).getTime();
  const arrMs = new Date(arr).getTime();
  const nowMs = Date.now();
  const totalMin = Math.max(0, Math.round((arrMs - depMs) / 60000));
  const elapsedMin = Math.max(0, Math.round((nowMs - depMs) / 60000));
  const remainingMin = Math.max(0, totalMin - elapsedMin);
  const fmt = (m: number) => { const h = Math.floor(m / 60); return h > 0 ? `${h}h ${m % 60}m` : `${m}m`; };
  return { remaining: fmt(remainingMin), elapsed: fmt(elapsedMin), total: fmt(totalMin) };
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

function getTimezoneAbbr(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("en-US", { timeZoneName: "short" }).split(" ").pop() || "";
  } catch { return ""; }
}

/* ── Status colors ── */
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  "en-route": { label: "En Route", color: "#34C759" },
  landed: { label: "Arrived", color: "#94a3b8" },
  scheduled: { label: "Scheduled", color: "#60a5fa" },
  taxiing: { label: "Taxiing", color: "#FF9500" },
  unknown: { label: "Tracking", color: "#94a3b8" },
};

/* ── Delay Prediction Banner ── */
function DelayBanner({ prediction }: { prediction: DelayPrediction }) {
  return (
    <div style={{ padding: "0 20px 16px" }}>
      <div style={{
        background: "rgba(255,59,48,0.10)",
        border: "1px solid rgba(255,59,48,0.25)",
        borderRadius: 14,
        padding: "14px 16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 14 }}>⚠</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#FF3B30", letterSpacing: "-0.01em" }}>
            RUNNING LATE
          </span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 6 }}>
          {prediction.delayMinutes}m delay predicted
        </div>
        {prediction.reasons.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <div style={{ width: 4, height: 4, borderRadius: 2, background: "#FF3B30", flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
              {r.label} — +{r.minutes}m
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Where's My Plane? Section ── */
function WheresMyPlane({ flight, prediction, aircraft, registration }: {
  flight: Flight; prediction: DelayPrediction; aircraft: string | null; registration: string | null;
}) {
  const inbound = prediction.inboundChain[0];
  if (!inbound) return null;

  const acType = aircraft || prediction.aircraft.type;
  const reg = registration || prediction.aircraft.registration;

  // Compute inbound status text
  let inboundStatus = "";
  if (inbound.actualArr) {
    inboundStatus = "Arrived at gate";
  } else if (inbound.estimatedArr) {
    const mins = Math.max(0, Math.round((new Date(inbound.estimatedArr).getTime() - Date.now()) / 60000));
    if (mins <= 0) inboundStatus = "Landing now";
    else {
      const h = Math.floor(mins / 60);
      inboundStatus = h > 0 ? `Landing in ${h}h ${mins % 60}m` : `Landing in ${mins}m`;
    }
  } else {
    inboundStatus = inbound.status || "En route";
  }

  return (
    <div style={{ padding: "0 20px 16px" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.30)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 10 }}>
        Where&apos;s My Plane?
      </div>
      <div style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 14,
        padding: 16,
      }}>
        {/* Aircraft info */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "rgba(10,132,255,0.10)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22,
          }}>✈️</div>
          <div>
            {acType && (
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>
                {formatAircraftType(acType)}
              </div>
            )}
            {reg && (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", fontVariantNumeric: "tabular-nums" }}>
                {reg}
              </div>
            )}
          </div>
        </div>

        {/* Inbound flight info */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          borderRadius: 10,
          padding: "10px 12px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.55)" }}>
              Inbound: {inbound.flightNumber}
            </span>
            {inbound.arrivalDelay > 0 && (
              <span style={{ fontSize: 11, fontWeight: 600, color: "#FF3B30" }}>
                {inbound.arrivalDelay}m late
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.40)" }}>
            {inbound.origin.code} → {inbound.destination.code}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: inbound.actualArr ? "#34C759" : "#0A84FF", marginTop: 4 }}>
            {inboundStatus}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Inbound Chain Timeline ── */
function InboundChainView({ flight, prediction }: { flight: Flight; prediction: DelayPrediction }) {
  const chain = prediction.inboundChain;
  if (chain.length === 0) return null;

  return (
    <div style={{ padding: "0 20px 16px" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.30)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 10 }}>
        Aircraft Route Chain
      </div>
      <div style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 14,
        padding: "14px 16px",
      }}>
        {/* Current flight at top */}
        <ChainLeg
          label={flight.flightNumber}
          origin={flight.origin.code}
          destination={flight.destination.code}
          statusText={flight.status === "en-route" ? "Current flight" : flight.status}
          delayMin={prediction.delayMinutes}
          isCurrent
          isFirst
        />

        {/* Inbound chain legs */}
        {chain.map((leg, i) => {
          let statusText = "";
          if (leg.actualArr) {
            try {
              const d = new Date(leg.actualArr);
              statusText = `Arrived ${d.getHours() % 12 || 12}:${d.getMinutes().toString().padStart(2, "0")} ${d.getHours() >= 12 ? "PM" : "AM"}`;
            } catch { statusText = "Arrived"; }
          } else if (leg.estimatedArr) {
            const mins = Math.max(0, Math.round((new Date(leg.estimatedArr).getTime() - Date.now()) / 60000));
            const h = Math.floor(mins / 60);
            statusText = h > 0 ? `Landing in ${h}h ${mins % 60}m` : `Landing in ${mins}m`;
          } else {
            statusText = leg.status;
          }
          return (
            <ChainLeg
              key={i}
              label={leg.flightNumber}
              origin={leg.origin.code}
              destination={leg.destination.code}
              statusText={statusText}
              delayMin={leg.arrivalDelay}
              isCurrent={false}
              isFirst={false}
            />
          );
        })}
      </div>
    </div>
  );
}

function ChainLeg({ label, origin, destination, statusText, delayMin, isCurrent, isFirst }: {
  label: string; origin: string; destination: string; statusText: string;
  delayMin: number; isCurrent: boolean; isFirst: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 12, position: "relative" }}>
      {/* Timeline line + dot */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 16, flexShrink: 0 }}>
        {!isFirst && (
          <div style={{ width: 1, height: 8, background: "rgba(255,255,255,0.10)" }} />
        )}
        <div style={{
          width: isCurrent ? 10 : 8,
          height: isCurrent ? 10 : 8,
          borderRadius: "50%",
          background: isCurrent ? "#0A84FF" : delayMin > 0 ? "#FF3B30" : "#34C759",
          border: isCurrent ? "2px solid rgba(10,132,255,0.3)" : "none",
          flexShrink: 0,
        }} />
        <div style={{ width: 1, flex: 1, background: "rgba(255,255,255,0.06)" }} />
      </div>

      {/* Content */}
      <div style={{ paddingBottom: 14, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: isCurrent ? "#fff" : "rgba(255,255,255,0.70)" }}>
            {label}
          </span>
          {delayMin > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: "#FF3B30",
              background: "rgba(255,59,48,0.10)", padding: "2px 8px", borderRadius: 6,
            }}>
              {delayMin}m {isCurrent ? "Delay Predicted" : "Late"}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", marginTop: 2 }}>
          {origin} → {destination}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", marginTop: 2 }}>
          {statusText}
        </div>
      </div>
    </div>
  );
}

function formatAircraftType(code: string): string {
  const map: Record<string, string> = {
    "A319": "Airbus A319", "A320": "Airbus A320", "A321": "Airbus A321neo",
    "A332": "Airbus A330-200", "A333": "Airbus A330-300", "A339": "Airbus A330-900neo",
    "A346": "Airbus A340-600", "A350": "Airbus A350",
    "A359": "Airbus A350-900", "A35K": "Airbus A350-1000",
    "A388": "Airbus A380-800",
    "B737": "Boeing 737", "B738": "Boeing 737-800", "B739": "Boeing 737-900",
    "B38M": "Boeing 737 MAX 8", "B39M": "Boeing 737 MAX 9",
    "B744": "Boeing 747-400", "B748": "Boeing 747-8",
    "B752": "Boeing 757-200", "B753": "Boeing 757-300",
    "B763": "Boeing 767-300", "B764": "Boeing 767-400",
    "B772": "Boeing 777-200", "B77L": "Boeing 777-200LR",
    "B77W": "Boeing 777-300ER", "B778": "Boeing 777X",
    "B788": "Boeing 787-8", "B789": "Boeing 787-9", "B78X": "Boeing 787-10",
    "E170": "Embraer E170", "E175": "Embraer E175",
    "E190": "Embraer E190", "E195": "Embraer E195",
    "CRJ2": "Bombardier CRJ-200", "CRJ7": "Bombardier CRJ-700", "CRJ9": "Bombardier CRJ-900",
  };
  return map[code.toUpperCase()] || code;
}

/* ── Component ── */
export default function FlightDetailPanel({ flight, detail, onClose, onShowOnMap }: FlightDetailPanelProps) {
  const hasRoute = flight.origin.code !== "---" && flight.destination.code !== "---";
  const progressPercent = Math.round(flight.progress);
  const aircraft = flight.aircraft || detail?.aircraftType || null;
  const registration = flight.registration || detail?.registration || null;
  const weightClass = guessWeightClass(aircraft);
  const times = computeTimes(flight);
  const depTime = flight.actualDep || flight.scheduledDep;
  const arrTime = flight.estimatedArr || flight.scheduledArr;
  const statusInfo = STATUS_MAP[flight.status] || STATUS_MAP["unknown"];
  const dateStr = fmtDate(depTime);

  // Delay prediction + inbound chain
  const depLat = detail?.origin?.lat || 0;
  const depLng = detail?.origin?.lng || 0;
  const arrLat = detail?.destination?.lat || 0;
  const arrLng = detail?.destination?.lng || 0;
  const { prediction } = useDelayPrediction(
    flight.callsign || null, registration, depLat, depLng, arrLat, arrLng
  );

  return (
    <div className="fixed top-0 right-0 bottom-0 z-40 w-full sm:w-96 md:w-[420px] flex flex-col"
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', sans-serif",
        animation: "slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
      }}>
      <style>{`
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>

      {/* Background overlay on mobile */}
      <div className="fixed inset-0 z-[-1] sm:hidden" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} />

      <div className="flex-1 flex flex-col overflow-hidden" style={{
        background: "rgba(8,8,10,0.94)",
        backdropFilter: "blur(40px) saturate(1.5)",
        WebkitBackdropFilter: "blur(40px) saturate(1.5)",
        borderLeft: "1px solid rgba(255,255,255,0.06)",
      }}>
        {/* ── Header ── */}
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", flexShrink: 0 }}>
          {/* Date + flight number */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {dateStr && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{dateStr}</span>}
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.15)" }}>·</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>{flight.flightNumber}</span>
            </div>
            <button onClick={onClose} style={{
              background: "rgba(255,255,255,0.06)", border: "none", width: 30, height: 30,
              borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "rgba(255,255,255,0.3)",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Route title */}
          {hasRoute && (
            <div style={{ fontSize: 18, fontWeight: 700, color: "rgba(255,255,255,0.85)", letterSpacing: "-0.02em", marginBottom: 8 }}>
              {flight.origin.city} to {flight.destination.city}
            </div>
          )}

          {/* Status + Tags */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "3px 10px", borderRadius: 20,
              background: `${statusInfo.color}15`, fontSize: 10, fontWeight: 600,
            }}>
              <div style={{ width: 5, height: 5, borderRadius: 3, background: statusInfo.color, boxShadow: `0 0 6px ${statusInfo.color}60` }} />
              <span style={{ color: statusInfo.color }}>{statusInfo.label}</span>
            </div>

            {/* Airline badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "3px 10px", borderRadius: 20,
              background: `${flight.airline.color}15`,
            }}>
              <div style={{ width: 12, height: 12, borderRadius: 4, background: flight.airline.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 6, fontWeight: 800, color: "#fff" }}>{flight.airline.code}</span>
              </div>
              <span style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.5)" }}>{flight.airline.name}</span>
            </div>

            {aircraft && (
              <span style={{
                padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 500,
                background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.3)",
                fontFamily: "'SF Mono', Menlo, monospace",
              }}>{aircraft}</span>
            )}
          </div>

          {/* Flight status line */}
          {flight.status === "en-route" && times.remaining && (
            <div style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: "#34C759" }}>
              Lands in {times.remaining}
            </div>
          )}
          {flight.status === "taxiing" && (
            <div style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: "#FF9500" }}>
              Taxiing to gate
            </div>
          )}
        </div>

        {/* ── Scrollable Content ── */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>

          {/* ── Route Timeline — Flighty style ── */}
          {hasRoute && (
            <div style={{ padding: "24px 20px" }}>
              {/* Progress bar */}
              {progressPercent > 0 && (
                <div style={{ position: "relative", height: 4, borderRadius: 2, background: "rgba(255,255,255,0.04)", marginBottom: 28 }}>
                  <div style={{
                    position: "absolute", top: 0, left: 0, bottom: 0,
                    width: `${progressPercent}%`, borderRadius: 2,
                    background: "linear-gradient(90deg, #34C759, #22d3ee)",
                  }} />
                  <div style={{
                    position: "absolute", top: "50%", left: `${progressPercent}%`,
                    transform: "translate(-50%, -50%)",
                    width: 10, height: 10, borderRadius: 5,
                    background: "#fff", border: "2.5px solid #34C759",
                    boxShadow: "0 0 10px rgba(52,199,89,0.5)",
                  }} />
                </div>
              )}

              {/* Origin */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 32 }}>
                {/* Timeline dot */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 4, width: 16 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 5, background: "#34C759", boxShadow: "0 0 8px rgba(52,199,89,0.4)" }} />
                  <div style={{ width: 2, flex: 1, background: "rgba(255,255,255,0.06)", marginTop: 4, minHeight: 60 }} />
                </div>
                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 32, fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: "-0.02em", lineHeight: 1 }}>
                        {flight.origin.code}
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
                        {flight.origin.name || flight.origin.city}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 22, fontWeight: 600, color: "rgba(255,255,255,0.7)", fontFamily: "'SF Mono', Menlo, monospace", lineHeight: 1 }}>
                        {fmtLocalTime(depTime)}
                      </div>
                      {getTimezoneAbbr(depTime) && (
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", marginTop: 2 }}>{getTimezoneAbbr(depTime)}</div>
                      )}
                    </div>
                  </div>

                  {/* Gate info */}
                  {detail?.origin && (
                    <div style={{ marginTop: 8, display: "flex", gap: 12 }}>
                      {detail.origin.terminal && (
                        <div>
                          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", letterSpacing: "0.08em" }}>Terminal</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>{detail.origin.terminal}</div>
                        </div>
                      )}
                      {detail.origin.gate && (
                        <div>
                          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", letterSpacing: "0.08em" }}>Gate</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>{detail.origin.gate}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Scheduled vs Actual */}
                  {flight.actualDep && flight.scheduledDep && (
                    <div style={{ marginTop: 6, fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
                      Sched. {fmtLocalTime(flight.scheduledDep)}
                    </div>
                  )}
                </div>
              </div>

              {/* Flight duration in the middle */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32, paddingLeft: 32 }}>
                <div style={{
                  fontSize: 11, color: "rgba(255,255,255,0.2)",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  {times.total && <span>Total: {times.total}</span>}
                  {flight.routeDistance && (
                    <>
                      <span style={{ color: "rgba(255,255,255,0.08)" }}>·</span>
                      <span>{flight.routeDistance.toLocaleString()} nm</span>
                    </>
                  )}
                </div>
              </div>

              {/* Destination */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 4, width: 16 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: 5,
                    border: "2px solid rgba(255,255,255,0.15)",
                    background: flight.status === "landed" ? "#94a3b8" : "transparent",
                  }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 32, fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: "-0.02em", lineHeight: 1 }}>
                        {flight.destination.code}
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
                        {flight.destination.name || flight.destination.city}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 22, fontWeight: 600, color: "rgba(255,255,255,0.7)", fontFamily: "'SF Mono', Menlo, monospace", lineHeight: 1 }}>
                        {fmtLocalTime(arrTime)}
                      </div>
                      {getTimezoneAbbr(arrTime) && (
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", marginTop: 2 }}>{getTimezoneAbbr(arrTime)}</div>
                      )}
                    </div>
                  </div>
                  {detail?.destination && (
                    <div style={{ marginTop: 8, display: "flex", gap: 12 }}>
                      {detail.destination.terminal && (
                        <div>
                          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", letterSpacing: "0.08em" }}>Terminal</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>{detail.destination.terminal}</div>
                        </div>
                      )}
                      {detail.destination.gate && (
                        <div>
                          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", letterSpacing: "0.08em" }}>Gate</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>{detail.destination.gate}</div>
                        </div>
                      )}
                    </div>
                  )}
                  {flight.estimatedArr && flight.scheduledArr && (
                    <div style={{ marginTop: 6, fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
                      Sched. {fmtLocalTime(flight.scheduledArr)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Show on Map ── */}
          {onShowOnMap && (
            <div style={{ padding: "0 20px 20px" }}>
              <button onClick={onShowOnMap} style={{
                width: "100%", padding: "12px 0", borderRadius: 14, border: "none",
                cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                background: "rgba(52,199,89,0.08)", color: "#34C759",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(52,199,89,0.15)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(52,199,89,0.08)"; }}
              >
                Show Route on Map
              </button>
            </div>
          )}

          {/* ── Live Position ── */}
          <div style={{ padding: "0 20px 20px" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.15)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
              Live Position
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[
                { label: "Altitude", value: flight.altitude >= 18000 ? `FL${Math.round(flight.altitude / 100)}` : flight.altitude > 0 ? `${flight.altitude.toLocaleString()} ft` : "---" },
                { label: "Ground Speed", value: flight.speed > 0 ? `${flight.speed} kts` : "---" },
                { label: "Heading", value: flight.heading > 0 ? `${Math.round(flight.heading)}°` : "---" },
                { label: "Coordinates", value: `${flight.currentLat.toFixed(3)}°, ${flight.currentLng.toFixed(3)}°` },
                ...(flight.verticalRate != null ? [{ label: "Vert Rate", value: `${flight.verticalRate > 0 ? "+" : ""}${flight.verticalRate} fpm` }] : []),
                ...(flight.squawk ? [{ label: "Squawk", value: flight.squawk }] : []),
              ].map((item) => (
                <div key={item.label} style={{
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: 10, padding: "10px 12px",
                }}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", letterSpacing: "0.08em", marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.55)", fontFamily: "'SF Mono', Menlo, monospace" }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Aircraft ── */}
          <div style={{ padding: "0 20px 20px" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.15)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
              Aircraft
            </div>
            <div style={{
              display: "flex", gap: 16, padding: "14px 16px",
              background: "rgba(255,255,255,0.02)", borderRadius: 14,
            }}>
              {aircraft && (
                <div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", letterSpacing: "0.08em" }}>Type</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{aircraft}</div>
                </div>
              )}
              {registration && (
                <div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", letterSpacing: "0.08em" }}>Registration</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.6)", fontFamily: "'SF Mono', Menlo, monospace", marginTop: 2 }}>{registration}</div>
                </div>
              )}
              {weightClass && (
                <div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.15)", letterSpacing: "0.08em" }}>Class</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{weightClass}</div>
                </div>
              )}
            </div>
          </div>

          {/* ── Good to Know ── */}
          {hasRoute && (
            <div style={{ padding: "0 20px 20px" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.15)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
                Good to Know
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {/* Timezone change */}
                {(() => {
                  const origTz = getTimezoneAbbr(depTime);
                  const destTz = getTimezoneAbbr(arrTime);
                  if (origTz && destTz && origTz !== destTz) {
                    return (
                      <div style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 12,
                      }}>
                        <span style={{ fontSize: 16 }}>🕐</span>
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                          Timezone Change: {origTz} → {destTz}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Route distance */}
                {flight.routeDistance && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 12,
                  }}>
                    <span style={{ fontSize: 16 }}>📏</span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                      Distance: {flight.routeDistance.toLocaleString()} nautical miles
                    </span>
                  </div>
                )}

                {/* Weight class */}
                {weightClass && (weightClass === "Heavy" || weightClass === "Super") && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 12,
                  }}>
                    <span style={{ fontSize: 16 }}>✈️</span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                      {weightClass} aircraft — {aircraft}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Delay Prediction Banner ── */}
          {prediction && prediction.delayMinutes > 0 && (
            <DelayBanner prediction={prediction} />
          )}

          {/* ── Where's My Plane? ── */}
          {prediction && prediction.inboundChain.length > 0 && (
            <WheresMyPlane flight={flight} prediction={prediction} aircraft={aircraft} registration={registration} />
          )}

          {/* ── Inbound Chain ── */}
          {prediction && prediction.inboundChain.length > 0 && (
            <InboundChainView flight={flight} prediction={prediction} />
          )}

          {/* ── Filed Flight Plan ── */}
          {detail?.waypoints && (
            <div style={{ padding: "0 20px 20px" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.15)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>
                Flight Plan
              </div>
              <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 14, padding: "12px 14px" }}>
                {(detail.filedAirspeed || detail.filedAltitude) && (
                  <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
                    {detail.filedAltitude && (
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'SF Mono', Menlo, monospace" }}>
                        FL{Math.round(detail.filedAltitude / 100)}
                      </span>
                    )}
                    {detail.filedAirspeed && (
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'SF Mono', Menlo, monospace" }}>
                        {detail.filedAirspeed} kts
                      </span>
                    )}
                  </div>
                )}
                <div style={{ fontSize: 10, fontFamily: "'SF Mono', Menlo, monospace", color: "rgba(255,255,255,0.25)", lineHeight: 1.6, wordBreak: "break-all" }}>
                  {detail.waypoints}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ padding: "12px 20px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.1)" }}>
              Data provided by FlightAware AeroAPI
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

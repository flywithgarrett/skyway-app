"use client";

import { useState } from "react";
import { Flight } from "@/lib/types";
import { FlightDetail, useDelayPrediction, DelayPrediction } from "@/lib/api";

interface FlightDetailPanelProps {
  flight: Flight;
  detail: FlightDetail | null;
  onClose: () => void;
  onShowOnMap?: () => void;
  isSaved?: boolean;
  onSave?: () => void;
  onUnsave?: () => void;
}

// ═══ Helpers ═══

function fmtTime(iso: string | null): string {
  if (!iso) return "--:--";
  try {
    const d = new Date(iso);
    return `${(d.getHours() % 12 || 12).toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  } catch { return "--:--"; }
}

function fmtAmPm(iso: string | null): string {
  if (!iso) return "";
  try { return new Date(iso).getHours() >= 12 ? "PM" : "AM"; } catch { return ""; }
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

function computeETE(flight: Flight): string | null {
  const dep = flight.actualDep || flight.scheduledDep;
  const arr = flight.estimatedArr || flight.scheduledArr;
  if (!dep || !arr) return null;
  const remaining = Math.max(0, Math.round((new Date(arr).getTime() - Date.now()) / 60000));
  const h = Math.floor(remaining / 60);
  return h > 0 ? `${h}h${remaining % 60}m` : `${remaining}m`;
}

function formatAircraftType(code: string): string {
  const map: Record<string, string> = {
    "A319": "Airbus A319", "A320": "Airbus A320", "A321": "Airbus A321neo",
    "A332": "Airbus A330-200", "A333": "Airbus A330-300", "A339": "Airbus A330-900neo",
    "A350": "Airbus A350", "A359": "Airbus A350-900", "A35K": "Airbus A350-1000",
    "A388": "Airbus A380-800",
    "B737": "Boeing 737", "B738": "Boeing 737-800", "B739": "Boeing 737-900",
    "B38M": "Boeing 737 MAX 8", "B39M": "Boeing 737 MAX 9",
    "B744": "Boeing 747-400", "B748": "Boeing 747-8",
    "B752": "Boeing 757-200", "B753": "Boeing 757-300",
    "B763": "Boeing 767-300", "B772": "Boeing 777-200",
    "B77W": "Boeing 777-300ER", "B778": "Boeing 777X",
    "B788": "Boeing 787-8", "B789": "Boeing 787-9", "B78X": "Boeing 787-10",
    "E170": "Embraer E170", "E175": "Embraer E175",
    "E190": "Embraer E190", "E195": "Embraer E195",
    "CRJ7": "Bombardier CRJ-700", "CRJ9": "Bombardier CRJ-900",
  };
  return map[code.toUpperCase()] || code;
}

const S = {
  font: "-apple-system, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif",
  bg: "#0A0A0F",
  card: "rgba(28,28,40,0.5)",
  border: "rgba(255,255,255,0.08)",
  muted: "rgba(255,255,255,0.40)",
  dim: "rgba(255,255,255,0.55)",
  faint: "rgba(255,255,255,0.25)",
  green: "#34C759",
  amber: "#FF9500",
  red: "#FF3B30",
  blue: "#0A84FF",
};

// ═══ Section Components ═══

function StatusBadge({ flight, prediction }: { flight: Flight; prediction: DelayPrediction | null }) {
  const delayed = prediction && prediction.delayMinutes > 0;
  let label: string, color: string, icon: string;

  if (flight.status === "landed") {
    label = "Arrived"; color = S.dim; icon = "●";
  } else if (delayed) {
    label = `Delayed ${prediction.delayMinutes}m`; color = S.amber; icon = "▲";
  } else if (flight.status === "en-route") {
    label = "On Time"; color = S.green; icon = "●";
  } else if (flight.status === "taxiing") {
    label = "Taxiing"; color = S.amber; icon = "●";
  } else if (flight.status === "scheduled") {
    label = "Scheduled"; color = S.blue; icon = "●";
  } else {
    label = "Tracking"; color = S.dim; icon = "●";
  }

  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "5px 14px", borderRadius: 20,
      background: `${color}18`, border: `1px solid ${color}40`,
    }}>
      <span style={{ fontSize: 10, color }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color, letterSpacing: "0.01em" }}>{label}</span>
    </div>
  );
}

function RouteVisualization({ flight, detail }: { flight: Flight; detail: FlightDetail | null }) {
  const progress = Math.min(100, Math.max(0, flight.progress));
  const depTime = flight.actualDep || flight.scheduledDep;
  const arrTime = flight.estimatedArr || flight.scheduledArr;
  const originName = detail?.origin?.name || flight.origin.name || "";
  const destName = detail?.destination?.name || flight.destination.name || "";
  const depGate = detail?.origin?.gate;
  const depTerminal = detail?.origin?.terminal;
  const arrGate = detail?.destination?.gate;
  const arrTerminal = detail?.destination?.terminal;
  const isDelayed = false; // Would check actual vs scheduled

  return (
    <div style={{ padding: "0 20px 20px" }}>
      {/* Airport codes + times */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        {/* Origin */}
        <div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
            {flight.origin.code !== "---" ? flight.origin.code : "???"}
          </div>
          <div style={{ fontSize: 11, color: S.muted, marginTop: 2, maxWidth: 120, lineHeight: 1.3 }}>
            {originName || flight.origin.city || "Origin"}
          </div>
        </div>

        {/* Center — plane path */}
        <div style={{ flex: 1, padding: "10px 16px", position: "relative" }}>
          {/* Track line */}
          <div style={{ height: 2, background: S.border, borderRadius: 1, position: "relative" }}>
            {/* Progress fill */}
            <div style={{ position: "absolute", left: 0, top: 0, height: 2, width: `${progress}%`, background: S.green, borderRadius: 1, transition: "width 1s ease" }} />
            {/* Dashed remainder */}
            <div style={{ position: "absolute", left: `${progress}%`, right: 0, top: 0, height: 2, backgroundImage: `repeating-linear-gradient(90deg, ${S.faint} 0, ${S.faint} 4px, transparent 4px, transparent 8px)` }} />
          </div>
          {/* Plane icon at progress position */}
          <div style={{
            position: "absolute", top: 2,
            left: `calc(${Math.max(5, Math.min(95, progress))}% - 8px)`,
            fontSize: 16, transition: "left 1s ease",
          }}>
            ✈
          </div>
        </div>

        {/* Destination */}
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
            {flight.destination.code !== "---" ? flight.destination.code : "???"}
          </div>
          <div style={{ fontSize: 11, color: S.muted, marginTop: 2, maxWidth: 120, lineHeight: 1.3 }}>
            {destName || flight.destination.city || "Destination"}
          </div>
        </div>
      </div>

      {/* Times row */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: isDelayed ? S.amber : S.green, fontVariantNumeric: "tabular-nums" }}>
            {fmtTime(depTime)} <span style={{ fontSize: 12, fontWeight: 500 }}>{fmtAmPm(depTime)}</span>
          </div>
          {depGate && (
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: S.amber, background: `${S.amber}18`, padding: "2px 8px", borderRadius: 4 }}>
                {depGate}
              </span>
              {depTerminal && <span style={{ fontSize: 10, color: S.muted }}>Terminal {depTerminal}</span>}
            </div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontVariantNumeric: "tabular-nums" }}>
            {fmtTime(arrTime)} <span style={{ fontSize: 12, fontWeight: 500 }}>{fmtAmPm(arrTime)}</span>
          </div>
          {arrGate && (
            <div style={{ display: "flex", gap: 6, marginTop: 6, justifyContent: "flex-end" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: S.amber, background: `${S.amber}18`, padding: "2px 8px", borderRadius: 4 }}>
                {arrGate}
              </span>
              {arrTerminal && <span style={{ fontSize: 10, color: S.muted }}>Terminal {arrTerminal}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LiveStatsRow({ flight }: { flight: Flight }) {
  const ete = computeETE(flight);
  const stats = [
    { value: flight.altitude >= 1000 ? `FL${Math.round(flight.altitude / 100)}` : `${flight.altitude}ft`, label: "ALT" },
    { value: `${flight.speed}kts`, label: "SPEED" },
    { value: `${flight.heading}°`, label: "TRACK" },
    { value: ete || "--", label: "ETE" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, padding: "0 20px 20px" }}>
      {stats.map(s => (
        <div key={s.label} style={{
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${S.border}`,
          borderRadius: 12, padding: "12px 10px", textAlign: "center",
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: S.muted, letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 4 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function WheresMyPlane({ prediction, aircraft, registration }: {
  prediction: DelayPrediction; aircraft: string | null; registration: string | null;
}) {
  const inbound = prediction.inboundChain[0];
  if (!inbound) return null;
  const acType = aircraft ? formatAircraftType(aircraft) : prediction.aircraft.type || "";
  const reg = registration || prediction.aircraft.registration;

  let status = "";
  if (inbound.actualArr) status = "Aircraft at gate";
  else if (inbound.estimatedArr) {
    const mins = Math.max(0, Math.round((new Date(inbound.estimatedArr).getTime() - Date.now()) / 60000));
    status = mins <= 0 ? "Landing now" : `Landing in ${Math.floor(mins / 60) > 0 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`}`;
  }

  return (
    <div style={{ padding: "0 20px 20px" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: S.faint, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 10 }}>
        Where&apos;s My Plane?
      </div>
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{acType}</div>
        {reg && <div style={{ fontSize: 12, color: S.dim, marginTop: 2 }}>{reg}</div>}

        <div style={{ marginTop: 12, background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: S.dim }}>Inbound: {inbound.flightNumber}</span>
            {inbound.arrivalDelay > 0 && (
              <span style={{ fontSize: 11, fontWeight: 600, color: S.red }}>{inbound.arrivalDelay}m late</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: S.muted }}>{inbound.origin.code} → {inbound.destination.code}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: inbound.actualArr ? S.green : S.blue, marginTop: 4 }}>{status}</div>
        </div>

        {inbound.arrivalDelay > 0 && inbound.arrivalDelay > 45 && (
          <div style={{ marginTop: 10, background: `${S.amber}12`, border: `1px solid ${S.amber}30`, borderRadius: 10, padding: "8px 12px" }}>
            <span style={{ fontSize: 12, color: S.amber, fontWeight: 600 }}>
              ⚠ Late inbound may cause ~{inbound.arrivalDelay - 45}m delay
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function DelayChain({ flight, prediction }: { flight: Flight; prediction: DelayPrediction }) {
  if (prediction.delayMinutes === 0 && prediction.inboundChain.every(l => l.arrivalDelay === 0)) return null;

  return (
    <div style={{ padding: "0 20px 20px" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: S.faint, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 10 }}>
        Delay Analysis
      </div>
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: "14px 16px" }}>
        {/* Current flight */}
        <ChainNode
          label={flight.flightNumber}
          route={`${flight.origin.code} → ${flight.destination.code}`}
          status="Your flight"
          delay={prediction.delayMinutes}
          isCurrent
          isFirst
        />
        {prediction.inboundChain.map((leg, i) => (
          <ChainNode
            key={i}
            label={leg.flightNumber}
            route={`${leg.origin.code} → ${leg.destination.code}`}
            status={leg.actualArr ? "Arrived" : leg.status}
            delay={leg.arrivalDelay}
            isCurrent={false}
            isFirst={false}
          />
        ))}
      </div>
    </div>
  );
}

function ChainNode({ label, route, status, delay, isCurrent, isFirst }: {
  label: string; route: string; status: string; delay: number; isCurrent: boolean; isFirst: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 14 }}>
        {!isFirst && <div style={{ width: 1, height: 8, background: "rgba(255,255,255,0.08)" }} />}
        <div style={{
          width: isCurrent ? 10 : 8, height: isCurrent ? 10 : 8, borderRadius: "50%",
          background: isCurrent ? S.blue : delay > 0 ? S.red : S.green, flexShrink: 0,
        }} />
        <div style={{ width: 1, flex: 1, background: "rgba(255,255,255,0.06)" }} />
      </div>
      <div style={{ paddingBottom: 12, flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: isCurrent ? "#fff" : "rgba(255,255,255,0.70)" }}>{label}</span>
          {delay > 0 && (
            <span style={{ fontSize: 11, fontWeight: 600, color: S.red, background: `${S.red}15`, padding: "2px 8px", borderRadius: 6 }}>
              {delay}m {isCurrent ? "predicted" : "late"}
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: S.muted, marginTop: 2 }}>{route}</div>
        <div style={{ fontSize: 11, color: S.faint, marginTop: 1 }}>{status}</div>
      </div>
    </div>
  );
}

function DelayBanner({ prediction }: { prediction: DelayPrediction }) {
  return (
    <div style={{ padding: "0 20px 16px" }}>
      <div style={{ background: `${S.red}12`, border: `1px solid ${S.red}30`, borderRadius: 14, padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 13 }}>⚠</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: S.red }}>RUNNING LATE</span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>
          {prediction.delayMinutes}m delay predicted
        </div>
        {prediction.reasons.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <div style={{ width: 4, height: 4, borderRadius: 2, background: S.red }} />
            <span style={{ fontSize: 12, color: S.dim }}>{r.label} — +{r.minutes}m</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══ Main Component ═══

export default function FlightDetailPanel({ flight, detail, onClose, onShowOnMap, isSaved, onSave, onUnsave }: FlightDetailPanelProps) {
  const [bookingRef, setBookingRef] = useState("");
  const [seatInfo, setSeatInfo] = useState("");

  const aircraft = flight.aircraft || detail?.aircraftType || null;
  const registration = flight.registration || detail?.registration || null;
  const acTypeName = aircraft ? formatAircraftType(aircraft) : null;
  const dateStr = fmtDate(flight.actualDep || flight.scheduledDep);

  const depLat = detail?.origin?.lat || 0;
  const depLng = detail?.origin?.lng || 0;
  const arrLat = detail?.destination?.lat || 0;
  const arrLng = detail?.destination?.lng || 0;
  const { prediction } = useDelayPrediction(flight.callsign || null, registration, depLat, depLng, arrLat, arrLng);

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 40,
      width: "100%", maxWidth: 420,
      display: "flex", flexDirection: "column",
      fontFamily: S.font,
      animation: "sheetSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
    }}>
      <style>{`
        @keyframes sheetSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>

      {/* Background overlay on mobile */}
      <div style={{ position: "fixed", inset: 0, zIndex: -1, background: "rgba(0,0,0,0.5)" }} onClick={onClose} />

      <div style={{
        flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
        background: "rgba(10,10,15,0.96)",
        backdropFilter: "blur(28px) saturate(200%)",
        WebkitBackdropFilter: "blur(28px) saturate(200%)",
        borderLeft: `1px solid ${S.border}`,
      }}>
        {/* ══ SECTION 1 — Flight Header ══ */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${S.border}`, flexShrink: 0 }}>
          {/* Top row: date + close */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {dateStr && <span style={{ fontSize: 11, color: S.muted }}>{dateStr}</span>}
              <span style={{ fontSize: 11, color: S.faint }}>·</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: S.dim }}>{flight.flightNumber}</span>
            </div>
            <button onClick={onClose} style={{
              background: "rgba(255,255,255,0.06)", border: "none", width: 32, height: 32,
              borderRadius: 10, cursor: "pointer", color: S.muted,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Airline logo + flight info */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: `linear-gradient(135deg, ${flight.airline.color}, ${flight.airline.color}88)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 700, color: "#fff", letterSpacing: "0.04em",
            }}>
              {flight.airline.code}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{flight.airline.name}</div>
              {acTypeName && (
                <div style={{ fontSize: 12, color: S.dim, marginTop: 1 }}>
                  {acTypeName}{registration ? ` · ${registration}` : ""}
                </div>
              )}
            </div>
          </div>

          {/* Status badge */}
          <div style={{ textAlign: "center" }}>
            <StatusBadge flight={flight} prediction={prediction} />
          </div>
        </div>

        {/* ══ Scrollable Content ══ */}
        <div style={{ flex: 1, overflow: "auto" }}>

          {/* ══ SECTION 2 — Route Visualization ══ */}
          <div style={{ paddingTop: 20 }}>
            <RouteVisualization flight={flight} detail={detail} />
          </div>

          {/* ══ SECTION 3 — Live Stats ══ */}
          {flight.status === "en-route" && <LiveStatsRow flight={flight} />}

          {/* ══ SECTION 4 — Delay Banner ══ */}
          {prediction && prediction.delayMinutes > 0 && <DelayBanner prediction={prediction} />}

          {/* ══ SECTION 5 — Where's My Plane ══ */}
          {prediction && prediction.inboundChain.length > 0 && (
            <WheresMyPlane prediction={prediction} aircraft={aircraft} registration={registration} />
          )}

          {/* ══ SECTION 6 — Delay Chain ══ */}
          {prediction && <DelayChain flight={flight} prediction={prediction} />}

          {/* ══ SECTION 7 — Flight Plan ══ */}
          {detail?.waypoints && (
            <div style={{ padding: "0 20px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: S.faint, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 10 }}>
                Flight Plan
              </div>
              <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 14, padding: "12px 14px" }}>
                {(detail.filedAltitude || detail.filedAirspeed) && (
                  <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                    {detail.filedAltitude && (
                      <span style={{ fontSize: 11, color: S.muted, fontVariantNumeric: "tabular-nums" }}>FL{Math.round(detail.filedAltitude / 100)}</span>
                    )}
                    {detail.filedAirspeed && (
                      <span style={{ fontSize: 11, color: S.muted, fontVariantNumeric: "tabular-nums" }}>{detail.filedAirspeed} kts</span>
                    )}
                  </div>
                )}
                <div style={{ fontSize: 10, color: S.faint, lineHeight: 1.6, wordBreak: "break-all", fontFamily: "'SF Mono', Menlo, monospace" }}>
                  {detail.waypoints}
                </div>
              </div>
            </div>
          )}

          {/* ══ SECTION 8 — Booking Info ══ */}
          <div style={{ padding: "0 20px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: S.faint, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 10 }}>
              My Booking
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                placeholder="Booking ref"
                value={bookingRef}
                onChange={e => setBookingRef(e.target.value)}
                style={{
                  flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${S.border}`,
                  borderRadius: 10, padding: "8px 12px", color: "#fff", fontSize: 13, outline: "none",
                }}
              />
              <input
                placeholder="Seat"
                value={seatInfo}
                onChange={e => setSeatInfo(e.target.value)}
                style={{
                  width: 70, background: "rgba(255,255,255,0.04)", border: `1px solid ${S.border}`,
                  borderRadius: 10, padding: "8px 12px", color: "#fff", fontSize: 13, outline: "none",
                }}
              />
            </div>
          </div>

          {/* ══ Bottom Actions ══ */}
          <div style={{ padding: "0 20px 32px", display: "flex", gap: 8 }}>
            <button
              onClick={isSaved ? onUnsave : onSave}
              style={{
                flex: 1, padding: "12px 16px", borderRadius: 12, cursor: "pointer",
                background: isSaved ? `${S.blue}20` : S.blue,
                border: isSaved ? `1px solid ${S.blue}40` : "none",
                color: isSaved ? S.blue : "#fff",
                fontSize: 14, fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              {isSaved ? "Saved" : "Save Flight"}
            </button>
            {onShowOnMap && (
              <button
                onClick={onShowOnMap}
                style={{
                  padding: "12px 16px", borderRadius: 12, cursor: "pointer",
                  background: "rgba(255,255,255,0.06)", border: `1px solid ${S.border}`,
                  color: "#fff", fontSize: 14, fontWeight: 600,
                }}
              >
                Show on Map
              </button>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: "0 20px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 10, color: S.faint }}>Data provided by FlightAware AeroAPI</div>
          </div>
        </div>
      </div>
    </div>
  );
}

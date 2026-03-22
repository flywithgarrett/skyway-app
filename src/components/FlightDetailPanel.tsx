"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Flight, FlightDetail, FlightHistoryEntry } from "@/lib/types";
import { generateFlightDetail } from "@/lib/data";

interface FlightDetailPanelProps {
  flight: Flight;
  onClose: () => void;
}

// --- Shared sub-components ---

function StatusIndicator({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; glow: string }> = {
    "en-route": { label: "En Route and On Time", color: "#34d399", glow: "rgba(52,211,153,0.25)" },
    "on-time": { label: "On Time", color: "#00e5ff", glow: "rgba(0,229,255,0.25)" },
    delayed: { label: "Delayed", color: "#ef4444", glow: "rgba(239,68,68,0.25)" },
    landed: { label: "Arrived", color: "#64748b", glow: "none" },
    boarding: { label: "Boarding", color: "#fbbf24", glow: "rgba(251,191,36,0.25)" },
  };
  const s = map[status] || map["on-time"];
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

function HistoryRow({ entry }: { entry: FlightHistoryEntry }) {
  const statusColor: Record<string, string> = {
    "en-route": "#34d399",
    "on-time": "#00e5ff",
    delayed: "#ef4444",
    landed: "#64748b",
    boarding: "#fbbf24",
  };
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/[0.03] last:border-0">
      <div className="text-[11px] font-mono text-glow-cyan w-16 shrink-0">{entry.flightNumber}</div>
      <div className="text-[10px] text-white/30 w-20 shrink-0">{entry.date}</div>
      <div className="text-[11px] text-white/50 flex-1">
        {entry.origin} → {entry.destination}
      </div>
      <div className="text-[10px] font-mono text-white/30 w-24 text-right">
        {entry.departureTime} – {entry.arrivalTime}
      </div>
      <div
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: statusColor[entry.status] || "#64748b" }}
      />
    </div>
  );
}

// Custom tooltip for the telemetry chart
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  if (!active || !payload) return null;
  return (
    <div className="glass-panel px-3 py-2 text-[10px]" style={{ borderRadius: 10 }}>
      <div className="text-white/40 font-mono mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: p.dataKey === "altitude" ? "#00e5ff" : "#a855f7" }}
          />
          <span className="text-white/60">
            {p.dataKey === "altitude"
              ? `${(p.value / 1000).toFixed(1)}k ft`
              : `${p.value} kts`}
          </span>
        </div>
      ))}
    </div>
  );
}

// --- Main component ---

export default function FlightDetailPanel({ flight, onClose }: FlightDetailPanelProps) {
  const detail: FlightDetail = useMemo(() => generateFlightDetail(flight), [flight]);
  const progressPercent = Math.round(flight.progress * 100);

  return (
    <div className="detail-panel-slide fixed top-0 right-0 bottom-0 z-40 w-full sm:w-96 md:w-[420px] flex flex-col">
      {/* Backdrop click area (mobile only) */}
      <div
        className="fixed inset-0 z-[-1] sm:hidden"
        style={{ background: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />

      <div className="flex-1 flex flex-col overflow-hidden glass-detail-panel">
        {/* Sticky header */}
        <div className="shrink-0 px-5 pt-5 pb-4 border-b border-white/[0.04]">
          {/* Close + flight ID row */}
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

          {/* Status */}
          <StatusIndicator status={flight.status} />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

          {/* === Departure / Arrival Block === */}
          <section>
            <SectionLabel>Route</SectionLabel>
            <div className="flex items-stretch gap-0">
              {/* Departure */}
              <div className="flex-1 text-center">
                <div className="text-2xl font-bold text-glow-white">{flight.origin.code}</div>
                <div className="text-[10px] text-white/25 mt-0.5">{flight.origin.city}</div>
                <div className="text-[10px] text-white/15 mt-0.5">{flight.origin.name}</div>
                <div className="mt-2 space-y-0.5">
                  <div className="text-[10px] text-white/20">
                    Gate <span className="text-white/50 font-mono">{detail.departure.gate.gate}</span>
                  </div>
                  <div className="text-[10px] text-white/20">
                    Rwy <span className="text-white/50 font-mono">{detail.departure.runway}</span>
                  </div>
                </div>
                <div className="mt-2 border-t border-white/[0.04] pt-2">
                  <div className="text-[9px] uppercase tracking-widest text-white/15 mb-0.5">Scheduled Dep</div>
                  <div className="text-[12px] font-mono text-white/40">{detail.departure.times.scheduled}</div>
                  {detail.departure.times.actual && (
                    <>
                      <div className="text-[9px] uppercase tracking-widest text-white/15 mt-1.5 mb-0.5">Actual Dep</div>
                      <div className="text-[15px] font-mono font-semibold text-glow-cyan">{detail.departure.times.actual}</div>
                    </>
                  )}
                </div>
              </div>

              {/* Progress bar between */}
              <div className="flex flex-col items-center justify-center px-3 py-4 w-20">
                <div className="relative h-full w-[2px]">
                  <div className="absolute inset-0 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} />
                  <div
                    className="absolute inset-x-0 top-0 rounded-full"
                    style={{
                      background: "linear-gradient(180deg, #3bb8e8, #00e5ff)",
                      height: `${progressPercent}%`,
                      boxShadow: "0 0 8px rgba(0, 229, 255, 0.25)",
                    }}
                  />
                  <div
                    className="absolute left-1/2 -translate-x-1/2"
                    style={{ top: `${progressPercent}%`, transform: "translate(-50%, -50%)" }}
                  >
                    <div className="w-3 h-3 rounded-full border border-cyan-400/40 flex items-center justify-center"
                         style={{ background: "rgba(10,18,32,0.9)", boxShadow: "0 0 8px rgba(0,229,255,0.3)" }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    </div>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-white/25 mt-2">{progressPercent}%</div>
              </div>

              {/* Arrival */}
              <div className="flex-1 text-center">
                <div className="text-2xl font-bold text-glow-white">{flight.destination.code}</div>
                <div className="text-[10px] text-white/25 mt-0.5">{flight.destination.city}</div>
                <div className="text-[10px] text-white/15 mt-0.5">{flight.destination.name}</div>
                <div className="mt-2 space-y-0.5">
                  <div className="text-[10px] text-white/20">
                    Gate <span className="text-white/50 font-mono">{detail.arrival.gate.gate}</span>
                  </div>
                  <div className="text-[10px] text-white/20">
                    Rwy <span className="text-white/50 font-mono">{detail.arrival.runway}</span>
                  </div>
                </div>
                <div className="mt-2 border-t border-white/[0.04] pt-2">
                  <div className="text-[9px] uppercase tracking-widest text-white/15 mb-0.5">Scheduled Arr</div>
                  <div className="text-[12px] font-mono text-white/40">{detail.arrival.times.scheduled}</div>
                  {(detail.arrival.times.estimated || detail.arrival.times.actual) && (
                    <>
                      <div className="text-[9px] uppercase tracking-widest text-white/15 mt-1.5 mb-0.5">
                        {detail.arrival.times.actual ? "Actual Arr" : "Estimated Arr"}
                      </div>
                      <div className="text-[15px] font-mono font-semibold text-glow-cyan">
                        {detail.arrival.times.actual || detail.arrival.times.estimated}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* === Live Telemetry Graph === */}
          <section>
            <SectionLabel>Live Telemetry</SectionLabel>
            <div className="glass-detail rounded-2xl p-3">
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={detail.telemetry} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis
                      dataKey="timestamp"
                      tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 9 }}
                      axisLine={{ stroke: "rgba(255,255,255,0.04)" }}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      yAxisId="alt"
                      tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      yAxisId="spd"
                      orientation="right"
                      tick={{ fill: "rgba(255,255,255,0.15)", fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                      hide
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Line
                      yAxisId="alt"
                      type="monotone"
                      dataKey="altitude"
                      stroke="#00e5ff"
                      strokeWidth={2}
                      dot={false}
                      style={{ filter: "drop-shadow(0 0 4px rgba(0,229,255,0.4))" }}
                    />
                    <Line
                      yAxisId="spd"
                      type="monotone"
                      dataKey="speed"
                      stroke="#a855f7"
                      strokeWidth={1.5}
                      dot={false}
                      strokeDasharray="4 2"
                      style={{ filter: "drop-shadow(0 0 4px rgba(168,85,247,0.3))" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-5 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 rounded-full bg-cyan-400" />
                  <span className="text-[9px] text-white/30">Altitude</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 rounded-full bg-purple-400" style={{ borderStyle: "dashed" }} />
                  <span className="text-[9px] text-white/30">Speed</span>
                </div>
              </div>
            </div>
          </section>

          {/* === Aircraft Details Grid === */}
          <section>
            <SectionLabel>Aircraft &amp; Telemetry</SectionLabel>
            <div className="grid grid-cols-2 gap-1.5">
              <DataCell label="Aircraft Type" value={detail.aircraftInfo.type} />
              <DataCell label="Registration" value={detail.aircraftInfo.registration} mono />
              <DataCell label="Altitude" value={flight.altitude > 0 ? `${(flight.altitude / 1000).toFixed(1)}k ft` : "---"} mono />
              <DataCell label="Ground Speed" value={flight.speed > 0 ? `${flight.speed} kts` : "---"} mono />
              <DataCell label="Distance" value={`${detail.distanceNm.toLocaleString()} nm`} mono />
              <DataCell label="Remaining" value={`${detail.distanceRemaining.toLocaleString()} nm`} mono />
              <DataCell label="Flight Time" value={detail.flightTimeTotal} mono />
              <DataCell label="Time Remaining" value={detail.flightTimeRemaining} mono />
              <DataCell label="Filed Alt" value={`FL${Math.round(detail.filedAltitude / 100)}`} mono />
              <DataCell label="Squawk" value={detail.squawk} mono />
              <DataCell label="ICAO24" value={detail.aircraftInfo.icao24} mono />
              <DataCell label="Aircraft Age" value={`${detail.aircraftInfo.age} years`} />
            </div>
            <div className="mt-1.5">
              <DataCell label="Seat Configuration" value={detail.aircraftInfo.seatConfig} />
            </div>
          </section>

          {/* === Flight History === */}
          <section>
            <SectionLabel>Recent Flights — {detail.aircraftInfo.registration}</SectionLabel>
            <div className="glass-detail rounded-2xl px-3 py-2">
              {detail.flightHistory.map((entry, i) => (
                <HistoryRow key={i} entry={entry} />
              ))}
            </div>
          </section>

          {/* === Upcoming Flights === */}
          <section>
            <SectionLabel>Upcoming Flights</SectionLabel>
            <div className="glass-detail rounded-2xl px-3 py-2">
              {detail.upcomingFlights.map((entry, i) => (
                <HistoryRow key={i} entry={entry} />
              ))}
            </div>
          </section>

          {/* Bottom spacer */}
          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Airport, Flight } from "@/lib/types";

interface AirportViewProps {
  airports: Airport[];
  flights: Flight[];
  onSelectAirport: (airport: Airport) => void;
  onSelectFlight: (flight: Flight) => void;
}

// ═══ Types ═══

interface AirportStatus {
  code: string;
  depAvgDelay: number;
  arrAvgDelay: number;
  depDelayPct: number;
  arrDelayPct: number;
  depCancelPct: number;
  arrCancelPct: number;
  groundStop: boolean;
  groundDelay: boolean;
  advisories: { type: string; reason: string; detail: string; avgDelay: string | null }[];
}

type SortMode = "delay" | "alpha" | "region";
type ViewMode = "live" | "today";

const REGIONS: Record<string, string> = {
  na: "NORTH AMERICA", eu: "EUROPE", apac: "ASIA-PACIFIC",
  me: "MIDDLE EAST", latam: "LATIN AMERICA",
};

const AIRPORT_REGIONS: Record<string, string> = {};
// Populated from API response

// ═══ Helpers ═══

function delayColor(minutes: number): string {
  if (minutes >= 30) return "#FF3B30";
  if (minutes >= 5) return "#FF9500";
  return "#34C759";
}

function borderColor(status: AirportStatus): string {
  if (status.groundStop) return "#FF3B30";
  if (status.depAvgDelay >= 30 || status.arrAvgDelay >= 30) return "#FF9500";
  if (status.depAvgDelay >= 5 || status.arrAvgDelay >= 5) return "#FFD60A";
  return "#34C759";
}

function fmtDelay(min: number): string {
  if (min < 1) return "On time";
  if (min < 60) return `${min}m avg`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m avg` : `${h}h avg`;
}

// ═══ Delay Bar ═══

function DelayBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ flex: 1, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", borderRadius: 3, background: color, transition: "width 0.5s ease" }} />
    </div>
  );
}

// ═══ Airport Row ═══

function AirportRow({ status, airport, onTap }: { status: AirportStatus; airport?: Airport; onTap: () => void }) {
  const border = borderColor(status);
  const name = airport ? `${airport.city} · ${airport.name}` : status.code;

  return (
    <button
      onClick={onTap}
      style={{
        width: "100%", textAlign: "left", padding: "14px 16px", cursor: "pointer",
        background: "rgba(28,28,40,0.5)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderLeft: `3px solid ${border}`,
        borderRadius: 12, marginBottom: 6,
        transition: "background 0.15s ease",
        display: "block",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <span style={{ fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>{status.code}</span>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", marginTop: 2 }}>{name}</div>
        </div>
        {/* Pills */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {status.groundStop && (
            <span style={{ fontSize: 10, fontWeight: 600, color: "#FF3B30", background: "rgba(255,59,48,0.12)", padding: "2px 8px", borderRadius: 4 }}>
              Ground Stop
            </span>
          )}
          {status.groundDelay && !status.groundStop && (
            <span style={{ fontSize: 10, fontWeight: 600, color: "#FF9500", background: "rgba(255,149,0,0.12)", padding: "2px 8px", borderRadius: 4 }}>
              Ground Delay
            </span>
          )}
          {status.depCancelPct >= 5 && (
            <span style={{ fontSize: 10, fontWeight: 600, color: "#FF3B30", background: "rgba(255,59,48,0.08)", padding: "2px 8px", borderRadius: 4 }}>
              Cancellations
            </span>
          )}
        </div>
      </div>

      {/* Delay bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", width: 72, flexShrink: 0 }}>Departures</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: delayColor(status.depAvgDelay), width: 70, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
            {fmtDelay(status.depAvgDelay)}
          </span>
          <DelayBar pct={status.depDelayPct} color={delayColor(status.depAvgDelay)} />
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.30)", width: 55, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
            {status.depDelayPct}% delayed
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", width: 72, flexShrink: 0 }}>Arrivals</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: delayColor(status.arrAvgDelay), width: 70, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
            {fmtDelay(status.arrAvgDelay)}
          </span>
          <DelayBar pct={status.arrDelayPct} color={delayColor(status.arrAvgDelay)} />
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.30)", width: 55, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
            {status.arrDelayPct}% delayed
          </span>
        </div>
      </div>
    </button>
  );
}

// ═══ Airport Detail Page ═══

function AirportDetail({ status, airport, flights, onBack, onSelectFlight }: {
  status: AirportStatus; airport: Airport; flights: Flight[];
  onBack: () => void; onSelectFlight: (f: Flight) => void;
}) {
  const departures = flights.filter(f => f.origin.code === airport.code);
  const arrivals = flights.filter(f => f.destination.code === airport.code);
  const border = borderColor(status);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
      }}>
        <button onClick={onBack} style={{
          background: "rgba(255,255,255,0.06)", border: "none", width: 32, height: 32,
          borderRadius: 10, cursor: "pointer", color: "rgba(255,255,255,0.55)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>{airport.code}</span>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: border }} />
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.40)" }}>{airport.name} · {airport.city}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
        {/* Delay Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          <StatCard label="Dep Avg Delay" value={fmtDelay(status.depAvgDelay)} color={delayColor(status.depAvgDelay)} />
          <StatCard label="Arr Avg Delay" value={fmtDelay(status.arrAvgDelay)} color={delayColor(status.arrAvgDelay)} />
          <StatCard label="Dep Delayed" value={`${status.depDelayPct}%`} color={delayColor(status.depAvgDelay)} />
          <StatCard label="Arr Delayed" value={`${status.arrDelayPct}%`} color={delayColor(status.arrAvgDelay)} />
          <StatCard label="Dep Cancelled" value={`${status.depCancelPct}%`} color={status.depCancelPct > 3 ? "#FF3B30" : "#34C759"} />
          <StatCard label="Arr Cancelled" value={`${status.arrCancelPct}%`} color={status.arrCancelPct > 3 ? "#FF3B30" : "#34C759"} />
        </div>

        {/* Advisories */}
        {status.advisories.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.30)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8 }}>
              Active Advisories
            </div>
            {status.advisories.map((a, i) => {
              const isStop = a.type === "ground_stop";
              return (
                <div key={i} style={{
                  background: isStop ? "rgba(255,59,48,0.08)" : "rgba(255,149,0,0.08)",
                  border: `1px solid ${isStop ? "rgba(255,59,48,0.20)" : "rgba(255,149,0,0.20)"}`,
                  borderRadius: 12, padding: 14, marginBottom: 6,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: isStop ? "#FF3B30" : "#FF9500" }}>
                    {isStop ? "Ground Stop" : "Ground Delay Program"}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>{a.reason}</div>
                  {a.detail && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{a.detail}</div>}
                </div>
              );
            })}
          </div>
        )}

        {/* Recent Flights */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.30)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8 }}>
            Departures ({departures.length})
          </div>
          {departures.slice(0, 15).map(f => (
            <FlightRow key={f.id} flight={f} onTap={() => onSelectFlight(f)} />
          ))}
          {departures.length === 0 && <Empty text="No tracked departures" />}
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.30)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8 }}>
            Arrivals ({arrivals.length})
          </div>
          {arrivals.slice(0, 15).map(f => (
            <FlightRow key={f.id} flight={f} onTap={() => onSelectFlight(f)} />
          ))}
          {arrivals.length === 0 && <Empty text="No tracked arrivals" />}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: "rgba(28,28,40,0.5)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.30)", letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

function FlightRow({ flight, onTap }: { flight: Flight; onTap: () => void }) {
  const statusColor = flight.status === "en-route" ? "#34C759" : flight.status === "taxiing" ? "#FF9500" : "rgba(255,255,255,0.40)";
  return (
    <button onClick={onTap} style={{
      width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 10,
      padding: "8px 10px", borderRadius: 8, marginBottom: 2, cursor: "pointer",
      background: "transparent", border: "none",
      transition: "background 0.1s ease",
    }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#0A84FF", width: 65, fontVariantNumeric: "tabular-nums" }}>{flight.flightNumber}</span>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", flex: 1 }}>{flight.origin.code} → {flight.destination.code}</span>
      <div style={{ width: 6, height: 6, borderRadius: 3, background: statusColor }} />
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", width: 60, textAlign: "right" }}>
        {flight.status === "en-route" ? `FL${Math.round(flight.altitude / 100)}` : flight.status}
      </span>
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return <div style={{ fontSize: 12, color: "rgba(255,255,255,0.20)", padding: "12px 0" }}>{text}</div>;
}

// ═══ Main AirportView ═══

export default function AirportView({ airports, flights, onSelectAirport, onSelectFlight }: AirportViewProps) {
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("delay");
  const [viewMode, setViewMode] = useState<ViewMode>("live");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<AirportStatus[]>([]);
  const [regions, setRegions] = useState<{ code: string; region: string }[]>([]);

  // Fetch airport status data
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/airport-status");
      if (res.ok) {
        const json = await res.json();
        setStatuses(json.airports || []);
        if (json.regions) setRegions(json.regions);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 120000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Build region map
  useEffect(() => {
    for (const r of regions) AIRPORT_REGIONS[r.code] = r.region;
  }, [regions]);

  const airportMap = useMemo(() => {
    const map = new Map<string, Airport>();
    for (const a of airports) map.set(a.code, a);
    return map;
  }, [airports]);

  const statusMap = useMemo(() => {
    const map = new Map<string, AirportStatus>();
    for (const s of statuses) map.set(s.code, s);
    return map;
  }, [statuses]);

  // Filter + sort
  const q = query.toLowerCase().trim();
  const displayList = useMemo(() => {
    let list = statuses;
    if (q) {
      list = list.filter(s => {
        const a = airportMap.get(s.code);
        return s.code.toLowerCase().includes(q) ||
          a?.name.toLowerCase().includes(q) ||
          a?.city.toLowerCase().includes(q);
      });
    }
    if (sortMode === "delay") {
      list = [...list].sort((a, b) => Math.max(b.depAvgDelay, b.arrAvgDelay) - Math.max(a.depAvgDelay, a.arrAvgDelay));
    } else if (sortMode === "alpha") {
      list = [...list].sort((a, b) => a.code.localeCompare(b.code));
    }
    return list;
  }, [statuses, q, sortMode, airportMap]);

  // Group by region if sort mode is "region"
  const groupedByRegion = useMemo(() => {
    if (sortMode !== "region") return null;
    const groups: Record<string, AirportStatus[]> = {};
    for (const s of displayList) {
      const region = AIRPORT_REGIONS[s.code] || "na";
      if (!groups[region]) groups[region] = [];
      groups[region].push(s);
    }
    return groups;
  }, [displayList, sortMode]);

  // Selected airport detail
  const selectedStatus = selectedCode ? statusMap.get(selectedCode) : null;
  const selectedAirport = selectedCode ? airportMap.get(selectedCode) : null;

  if (selectedStatus && selectedAirport) {
    return (
      <div className="view-fade-in" style={{
        position: "absolute", inset: 0, zIndex: 30,
        top: 52, bottom: 68,
        background: "rgba(10,10,15,0.95)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        fontFamily: "-apple-system, 'SF Pro Display', system-ui, sans-serif",
      }}>
        <AirportDetail
          status={selectedStatus}
          airport={selectedAirport}
          flights={flights}
          onBack={() => setSelectedCode(null)}
          onSelectFlight={(f) => { onSelectFlight(f); }}
        />
      </div>
    );
  }

  return (
    <div className="view-fade-in" style={{
      position: "absolute", inset: 0, zIndex: 10,
      top: 52, bottom: 68,
      display: "flex", flexDirection: "column",
      background: "rgba(10,10,15,0.92)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      fontFamily: "-apple-system, 'SF Pro Display', system-ui, sans-serif",
    }}>
      {/* ── Header ── */}
      <div style={{ padding: "16px 20px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", margin: 0 }}>
            Airport Intelligence
          </h2>
          {/* View mode toggle */}
          <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: 2 }}>
            {(["live", "today"] as ViewMode[]).map(m => (
              <button key={m} onClick={() => setViewMode(m)} style={{
                padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em",
                background: viewMode === m ? "#0A84FF" : "transparent",
                color: viewMode === m ? "#fff" : "rgba(255,255,255,0.40)",
              }}>
                {m === "live" ? "LIVE" : "TODAY"}
              </button>
            ))}
          </div>
        </div>

        {/* Search + Sort */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search airports..."
            style={{
              flex: 1, background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10, padding: "8px 12px",
              color: "#fff", fontSize: 14, outline: "none",
            }}
          />
          <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: 2 }}>
            {([["delay", "Most Delayed"], ["alpha", "A-Z"], ["region", "Region"]] as [SortMode, string][]).map(([mode, label]) => (
              <button key={mode} onClick={() => setSortMode(mode)} style={{
                padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                fontSize: 11, fontWeight: 500,
                background: sortMode === mode ? "rgba(255,255,255,0.10)" : "transparent",
                color: sortMode === mode ? "#fff" : "rgba(255,255,255,0.35)",
              }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Airport List ── */}
      <div style={{ flex: 1, overflow: "auto", padding: "0 20px 20px" }}>
        {sortMode === "region" && groupedByRegion ? (
          Object.entries(REGIONS).map(([key, label]) => {
            const group = groupedByRegion[key];
            if (!group || group.length === 0) return null;
            return (
              <div key={key} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.25)", letterSpacing: "0.06em", marginBottom: 8 }}>
                  {label}
                </div>
                {group.map(s => (
                  <AirportRow
                    key={s.code}
                    status={s}
                    airport={airportMap.get(s.code)}
                    onTap={() => {
                      setSelectedCode(s.code);
                      const a = airportMap.get(s.code);
                      if (a) onSelectAirport(a);
                    }}
                  />
                ))}
              </div>
            );
          })
        ) : (
          displayList.map(s => (
            <AirportRow
              key={s.code}
              status={s}
              airport={airportMap.get(s.code)}
              onTap={() => {
                setSelectedCode(s.code);
                const a = airportMap.get(s.code);
                if (a) onSelectAirport(a);
              }}
            />
          ))
        )}

        {displayList.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.30)" }}>
              {q ? "No airports match your search" : "Loading airport data..."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

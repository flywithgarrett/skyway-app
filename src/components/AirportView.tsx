"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Airport, Flight } from "@/lib/types";

interface AirportViewProps {
  airports: Airport[];
  flights: Flight[];
  onSelectAirport: (airport: Airport) => void;
  onSelectFlight: (flight: Flight) => void;
}

function getFlightsForAirport(flights: Flight[], code: string) {
  const departures = flights.filter((f) => f.origin.code === code);
  const arrivals = flights.filter((f) => f.destination.code === code);
  const onGround = flights.filter(
    (f) => f.onGround && (f.origin.code === code || f.destination.code === code)
  );
  return { departures, arrivals, onGround };
}

function fmtTime(iso: string | null): string {
  if (!iso) return "--:--";
  try {
    const d = new Date(iso);
    const h = d.getHours();
    const m = d.getMinutes();
    return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  } catch { return "--:--"; }
}

export default function AirportView({ airports, flights, onSelectAirport, onSelectFlight }: AirportViewProps) {
  const [query, setQuery] = useState("");
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
  const [activeTab, setActiveTab] = useState<"departures" | "arrivals" | "ground">("departures");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const q = query.toLowerCase().trim();
  const filteredAirports = useMemo(() => {
    if (!q) return airports.slice(0, 30);
    return airports.filter((a) =>
      a.code.toLowerCase().includes(q) ||
      a.icao.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q)
    ).slice(0, 30);
  }, [airports, q]);

  const airportTraffic = useMemo(() => {
    if (!selectedAirport) return null;
    return getFlightsForAirport(flights, selectedAirport.code);
  }, [selectedAirport, flights]);

  const handleSelectAirport = (airport: Airport) => {
    setSelectedAirport(airport);
    setQuery("");
    onSelectAirport(airport);
  };

  // Count traffic per airport for the list
  const airportCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of flights) {
      if (f.origin.code !== "---") counts.set(f.origin.code, (counts.get(f.origin.code) || 0) + 1);
      if (f.destination.code !== "---") counts.set(f.destination.code, (counts.get(f.destination.code) || 0) + 1);
    }
    return counts;
  }, [flights]);

  if (selectedAirport && airportTraffic) {
    const tabs = [
      { id: "departures" as const, label: "Departures", count: airportTraffic.departures.length },
      { id: "arrivals" as const, label: "Arrivals", count: airportTraffic.arrivals.length },
      { id: "ground" as const, label: "Ground", count: airportTraffic.onGround.length },
    ];
    const currentFlights = activeTab === "departures" ? airportTraffic.departures
      : activeTab === "arrivals" ? airportTraffic.arrivals
      : airportTraffic.onGround;

    return (
      <div className="absolute inset-0 z-30 flex flex-col" style={{
        background: "rgba(8,8,10,0.94)",
        backdropFilter: "blur(40px)",
        WebkitBackdropFilter: "blur(40px)",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 20px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <button onClick={() => setSelectedAirport(null)} style={{
              background: "rgba(255,255,255,0.06)", border: "none", width: 32, height: 32,
              borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "rgba(255,255,255,0.4)",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: "-0.02em" }}>
                {selectedAirport.code}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                {selectedAirport.name}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.15)" }}>
                {selectedAirport.city}, {selectedAirport.country}
              </div>
            </div>
            <button onClick={() => onSelectAirport(selectedAirport)} style={{
              background: "rgba(52,211,153,0.08)", border: "none",
              padding: "8px 14px", borderRadius: 10, cursor: "pointer",
              fontSize: 11, fontWeight: 600, color: "#34d399", fontFamily: "inherit",
            }}>
              View on Map
            </button>
          </div>

          {/* Traffic summary */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
            <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 12, padding: "10px 0", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>{airportTraffic.departures.length}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em" }}>DEPARTURES</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 12, padding: "10px 0", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>{airportTraffic.arrivals.length}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em" }}>ARRIVALS</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 12, padding: "10px 0", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>{airportTraffic.onGround.length}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em" }}>ON GROUND</div>
            </div>
          </div>

          {/* Tab bar */}
          <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 3 }}>
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 11, fontWeight: 600, fontFamily: "inherit",
                background: activeTab === tab.id ? "rgba(255,255,255,0.08)" : "transparent",
                color: activeTab === tab.id ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)",
                transition: "all 0.15s",
              }}>
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Flight list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {currentFlights.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "rgba(255,255,255,0.15)", fontSize: 13 }}>
              No {activeTab} found
            </div>
          )}
          {currentFlights.map((f) => (
            <button key={f.id} onClick={() => onSelectFlight(f)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12,
              padding: "12px 20px", background: "transparent", border: "none",
              borderBottom: "1px solid rgba(255,255,255,0.03)", cursor: "pointer",
              textAlign: "left", fontFamily: "inherit", transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              {/* Airline badge */}
              <div style={{
                width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 700, color: "#fff",
                background: `linear-gradient(135deg, ${f.airline.color}, ${f.airline.color}88)`,
              }}>
                {f.airline.code}
              </div>
              {/* Flight info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{f.flightNumber}</span>
                  {f.aircraft && (
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "'SF Mono', Menlo, monospace" }}>{f.aircraft}</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
                  {activeTab === "departures" ? `→ ${f.destination.code} ${f.destination.city}` :
                   activeTab === "arrivals" ? `← ${f.origin.code} ${f.origin.city}` :
                   `${f.origin.code} → ${f.destination.code}`}
                </div>
              </div>
              {/* Status + time */}
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", fontFamily: "'SF Mono', Menlo, monospace" }}>
                  {activeTab === "departures" ? fmtTime(f.actualDep || f.scheduledDep) :
                   fmtTime(f.estimatedArr || f.scheduledArr)}
                </div>
                <div style={{
                  fontSize: 9, fontWeight: 600, marginTop: 2,
                  color: f.status === "en-route" ? "#34d399" : f.status === "taxiing" ? "#fbbf24" : f.status === "landed" ? "#94a3b8" : "#60a5fa",
                }}>
                  {f.status === "en-route" ? "EN ROUTE" : f.status === "taxiing" ? "TAXIING" : f.status === "landed" ? "ARRIVED" : "SCHED"}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Spacer for bottom nav */}
        <div style={{ height: 70, flexShrink: 0 }} />
      </div>
    );
  }

  // Airport list view
  return (
    <div className="absolute inset-0 z-30 flex flex-col" style={{
      background: "rgba(8,8,10,0.94)",
      backdropFilter: "blur(40px)",
      WebkitBackdropFilter: "blur(40px)",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
    }}>
      {/* Header */}
      <div style={{ padding: "20px 20px 12px", flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,0.85)", letterSpacing: "-0.02em", marginBottom: 16 }}>
          Airports
        </div>

        {/* Search */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "rgba(255,255,255,0.04)", borderRadius: 12,
          padding: "0 14px", border: "1px solid rgba(255,255,255,0.04)",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search airports..."
            style={{
              flex: 1, background: "transparent", border: "none",
              padding: "12px 0", fontSize: 14, color: "rgba(255,255,255,0.7)",
              outline: "none", fontFamily: "inherit",
            }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{
              background: "rgba(255,255,255,0.1)", border: "none",
              width: 18, height: 18, borderRadius: 9,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "rgba(255,255,255,0.3)", fontSize: 10,
            }}>×</button>
          )}
        </div>
      </div>

      {/* Airport list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filteredAirports.map((airport) => {
          const count = airportCounts.get(airport.code) || 0;
          return (
            <button key={airport.code} onClick={() => handleSelectAirport(airport)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 14,
              padding: "14px 20px", background: "transparent", border: "none",
              borderBottom: "1px solid rgba(255,255,255,0.03)", cursor: "pointer",
              textAlign: "left", fontFamily: "inherit", transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              {/* IATA code */}
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(255,255,255,0.04)",
                fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.7)",
                letterSpacing: "0.04em",
              }}>
                {airport.code}
              </div>
              {/* Name */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.75)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {airport.name}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
                  {airport.city}, {airport.country} · {airport.icao}
                </div>
              </div>
              {/* Traffic count */}
              {count > 0 && (
                <div style={{
                  padding: "4px 10px", borderRadius: 20,
                  background: "rgba(52,211,153,0.08)",
                  fontSize: 11, fontWeight: 600, color: "#34d399",
                  flexShrink: 0,
                }}>
                  {count} flights
                </div>
              )}
              {/* Chevron */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          );
        })}
      </div>

      {/* Spacer for bottom nav */}
      <div style={{ height: 70, flexShrink: 0 }} />
    </div>
  );
}

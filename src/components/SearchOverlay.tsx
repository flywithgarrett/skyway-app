"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Flight, Airport } from "@/lib/types";

interface SearchOverlayProps {
  flights: Flight[];
  airports: Airport[];
  onSelect: (flight: Flight) => void;
  onSelectAirport: (airport: Airport) => void;
  onClose: () => void;
}

export default function SearchOverlay({ flights, airports, onSelect, onSelectAirport, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const q = query.toLowerCase().trim();

  const airportResults = useMemo(() => {
    if (q.length < 1) return [];
    return airports.filter((a) =>
      a.code.toLowerCase().includes(q) ||
      a.icao.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [airports, q]);

  const flightResults = useMemo(() => {
    if (q.length < 1) return [];
    return flights.filter((f) =>
      f.flightNumber.toLowerCase().includes(q) ||
      f.callsign.toLowerCase().includes(q) ||
      f.airline.name.toLowerCase().includes(q) ||
      f.origin.code.toLowerCase().includes(q) ||
      f.destination.code.toLowerCase().includes(q) ||
      f.origin.city.toLowerCase().includes(q) ||
      f.destination.city.toLowerCase().includes(q) ||
      (f.registration || "").toLowerCase().includes(q)
    ).slice(0, 20);
  }, [flights, q]);

  const hasResults = airportResults.length > 0 || flightResults.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{
      background: "rgba(8,8,10,0.96)",
      backdropFilter: "blur(40px)",
      WebkitBackdropFilter: "blur(40px)",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
    }}>
      {/* Search bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search flights, airports..."
          style={{
            flex: 1, background: "transparent", border: "none",
            fontSize: 15, color: "rgba(255,255,255,0.8)",
            outline: "none", fontFamily: "inherit",
          }}
        />
        <button onClick={onClose} style={{
          background: "rgba(255,255,255,0.06)", border: "none",
          padding: "6px 14px", borderRadius: 8, cursor: "pointer",
          fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", fontFamily: "inherit",
        }}>
          Cancel
        </button>
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {q.length > 0 && !hasResults && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
            No results for &quot;{query}&quot;
          </div>
        )}

        {/* Airport results */}
        {airportResults.length > 0 && (
          <div>
            <div style={{
              padding: "12px 16px 6px", fontSize: 10, fontWeight: 600,
              color: "rgba(255,255,255,0.15)", letterSpacing: "0.12em", textTransform: "uppercase",
            }}>
              Airports
            </div>
            {airportResults.map((airport) => (
              <button key={airport.code} onClick={() => { onSelectAirport(airport); onClose(); }} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "10px 16px", background: "transparent", border: "none",
                borderBottom: "1px solid rgba(255,255,255,0.02)", cursor: "pointer",
                textAlign: "left", fontFamily: "inherit", transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(52,211,153,0.06)",
                  fontSize: 12, fontWeight: 700, color: "#34d399",
                }}>
                  {airport.code}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{airport.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 1 }}>{airport.city}, {airport.country}</div>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            ))}
          </div>
        )}

        {/* Flight results */}
        {flightResults.length > 0 && (
          <div>
            <div style={{
              padding: "12px 16px 6px", fontSize: 10, fontWeight: 600,
              color: "rgba(255,255,255,0.15)", letterSpacing: "0.12em", textTransform: "uppercase",
            }}>
              Flights
            </div>
            {flightResults.map((flight) => (
              <button
                key={flight.id}
                onClick={() => { onSelect(flight); onClose(); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 16px", background: "transparent", border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.02)", cursor: "pointer",
                  textAlign: "left", fontFamily: "inherit", transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 700, color: "#fff",
                  background: `linear-gradient(135deg, ${flight.airline.color}, ${flight.airline.color}88)`,
                }}>
                  {flight.airline.code}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{flight.flightNumber}</span>
                    {flight.aircraft && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{flight.aircraft}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 1 }}>
                    {flight.origin.code !== "---" ? `${flight.origin.code} → ${flight.destination.code}` : flight.originCountry}
                    {" · "}
                    {flight.altitude > 0 ? `${(flight.altitude / 1000).toFixed(1)}k ft` : "GND"}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "'SF Mono', Menlo, monospace" }}>{flight.speed} kts</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {q.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" strokeLinecap="round" style={{ margin: "0 auto 12px" }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.2)" }}>Search flights and airports</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.1)", marginTop: 4 }}>Try a flight number, airport code, or city name</div>
          </div>
        )}
      </div>
    </div>
  );
}

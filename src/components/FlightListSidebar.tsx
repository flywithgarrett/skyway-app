"use client";

import { useMemo } from "react";
import { Flight } from "@/lib/types";

interface AviationStatsProps {
  flights: Flight[];
}

export default function FlightListSidebar({ flights }: AviationStatsProps) {
  const stats = useMemo(() => {
    const airborne = flights.filter((f) => !f.onGround && f.currentLat !== 0);
    const onGround = flights.filter((f) => f.onGround);
    const avgAlt = airborne.length > 0
      ? Math.round(airborne.reduce((s, f) => s + f.altitude, 0) / airborne.length)
      : 0;
    const avgSpeed = airborne.length > 0
      ? Math.round(airborne.reduce((s, f) => s + f.speed, 0) / airborne.length)
      : 0;
    const maxAlt = airborne.length > 0
      ? Math.max(...airborne.map((f) => f.altitude))
      : 0;

    // Count unique aircraft types
    const types = new Set(airborne.map((f) => f.aircraft).filter(Boolean));

    // Count unique airlines
    const airlines = new Set(airborne.map((f) => f.airline.code).filter((c) => c !== "??"));

    // Squawk 7700/7600/7500 emergencies
    const emergencies = flights.filter((f) =>
      f.squawk === "7700" || f.squawk === "7600" || f.squawk === "7500"
    );

    // Highest flight
    const highest = airborne.length > 0
      ? airborne.reduce((a, b) => a.altitude > b.altitude ? a : b)
      : null;

    // Fastest flight
    const fastest = airborne.length > 0
      ? airborne.reduce((a, b) => a.speed > b.speed ? a : b)
      : null;

    return { airborne: airborne.length, onGround: onGround.length, avgAlt, avgSpeed, maxAlt, types: types.size, airlines: airlines.size, emergencies: emergencies.length, highest, fastest };
  }, [flights]);

  return (
    <div className="absolute top-14 left-3 z-20 pointer-events-auto hidden sm:block" style={{ width: 220 }}>
      <div className="glass-panel" style={{ padding: 0, overflow: "hidden" }}>

        {/* Active flights — hero stat */}
        <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "rgba(255,255,255,0.25)", fontWeight: 600, marginBottom: 4 }}>
            ACTIVE FLIGHTS
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: "#fff", fontFamily: "'SF Pro Display', -apple-system, sans-serif", letterSpacing: "-1px" }}>
              {stats.airborne.toLocaleString()}
            </span>
            <span style={{ fontSize: 11, color: "rgba(0,229,255,0.5)", fontFamily: "monospace" }}>
              airborne
            </span>
          </div>
        </div>

        {/* Stat grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
          <StatCell label="AVG ALT" value={stats.avgAlt >= 1000 ? `FL${Math.round(stats.avgAlt / 100)}` : `${stats.avgAlt.toLocaleString()} ft`} />
          <StatCell label="AVG SPD" value={`${stats.avgSpeed} kts`} />
          <StatCell label="AIRLINES" value={String(stats.airlines)} />
          <StatCell label="ACFT TYPES" value={String(stats.types)} />
          <StatCell label="ON GROUND" value={String(stats.onGround)} />
          <StatCell label="MAX ALT" value={stats.maxAlt >= 1000 ? `FL${Math.round(stats.maxAlt / 100)}` : `${stats.maxAlt.toLocaleString()} ft`} />
        </div>

        {/* Emergency status */}
        <div style={{
          padding: "8px 16px",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: 3,
            background: stats.emergencies > 0 ? "#ef4444" : "#22c55e",
            boxShadow: stats.emergencies > 0 ? "0 0 8px rgba(239,68,68,0.6)" : "0 0 6px rgba(34,197,94,0.4)",
          }} />
          <span style={{ fontSize: 10, color: stats.emergencies > 0 ? "#ef4444" : "rgba(255,255,255,0.3)", fontWeight: 600, letterSpacing: "0.08em" }}>
            {stats.emergencies > 0 ? `${stats.emergencies} EMERGENCY` : "NO EMERGENCIES"}
          </span>
        </div>

        {/* Notable flights */}
        {stats.highest && (
          <div style={{ padding: "6px 16px 10px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ fontSize: 9, letterSpacing: "0.12em", color: "rgba(255,255,255,0.2)", fontWeight: 600, marginBottom: 4 }}>
              HIGHEST
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(0,229,255,0.7)", fontFamily: "monospace" }}>
                {stats.highest.callsign || stats.highest.flightNumber}
              </span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>
                FL{Math.round(stats.highest.altitude / 100)}
              </span>
            </div>
            {stats.fastest && stats.fastest.id !== stats.highest.id && (
              <>
                <div style={{ fontSize: 9, letterSpacing: "0.12em", color: "rgba(255,255,255,0.2)", fontWeight: 600, marginBottom: 4, marginTop: 6 }}>
                  FASTEST
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(0,229,255,0.7)", fontFamily: "monospace" }}>
                    {stats.fastest.callsign || stats.fastest.flightNumber}
                  </span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>
                    {stats.fastest.speed} kts
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      padding: "8px 16px",
      borderBottom: "1px solid rgba(255,255,255,0.03)",
      borderRight: "1px solid rgba(255,255,255,0.03)",
    }}>
      <div style={{ fontSize: 8, letterSpacing: "0.12em", color: "rgba(255,255,255,0.18)", fontWeight: 600, marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.6)", fontFamily: "monospace" }}>
        {value}
      </div>
    </div>
  );
}

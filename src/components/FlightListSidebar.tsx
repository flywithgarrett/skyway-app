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

    const types = new Set(airborne.map((f) => f.aircraft).filter(Boolean));
    const airlines = new Set(airborne.map((f) => f.airline.code).filter((c) => c !== "??"));
    const emergencies = flights.filter((f) =>
      f.squawk === "7700" || f.squawk === "7600" || f.squawk === "7500"
    );
    const highest = airborne.length > 0
      ? airborne.reduce((a, b) => a.altitude > b.altitude ? a : b)
      : null;
    const fastest = airborne.length > 0
      ? airborne.reduce((a, b) => a.speed > b.speed ? a : b)
      : null;

    return { airborne: airborne.length, onGround: onGround.length, avgAlt, avgSpeed, maxAlt, types: types.size, airlines: airlines.size, emergencies: emergencies.length, highest, fastest };
  }, [flights]);

  return (
    <div className="absolute top-14 left-3 z-20 pointer-events-auto hidden sm:block" style={{ width: 220 }}>
      <div className="glass-panel" style={{ padding: 0, overflow: "hidden" }}>

        {/* Active flights — hero stat */}
        <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.04em", color: "rgba(255,255,255,0.30)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>
            ACTIVE FLIGHTS
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
              {stats.airborne.toLocaleString()}
            </span>
            <span style={{ fontSize: 11, color: "#34C759", fontWeight: 600 }}>
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
          borderTop: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: 3,
            background: stats.emergencies > 0 ? "#FF3B30" : "#34C759",
          }} />
          <span style={{ fontSize: 11, color: stats.emergencies > 0 ? "#FF3B30" : "rgba(255,255,255,0.30)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {stats.emergencies > 0 ? `${stats.emergencies} EMERGENCY` : "NO EMERGENCIES"}
          </span>
        </div>

        {/* Notable flights */}
        {stats.highest && (
          <div style={{ padding: "6px 16px 10px", borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.04em", color: "rgba(255,255,255,0.30)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>
              HIGHEST
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0A84FF", fontVariantNumeric: "tabular-nums" }}>
                {stats.highest.callsign || stats.highest.flightNumber}
              </span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                FL{Math.round(stats.highest.altitude / 100)}
              </span>
            </div>
            {stats.fastest && stats.fastest.id !== stats.highest.id && (
              <>
                <div style={{ fontSize: 11, letterSpacing: "0.04em", color: "rgba(255,255,255,0.30)", fontWeight: 600, textTransform: "uppercase", marginBottom: 4, marginTop: 6 }}>
                  FASTEST
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0A84FF", fontVariantNumeric: "tabular-nums" }}>
                    {stats.fastest.callsign || stats.fastest.flightNumber}
                  </span>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
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
      borderBottom: "1px solid rgba(255,255,255,0.05)",
      borderRight: "1px solid rgba(255,255,255,0.05)",
    }}>
      <div style={{ fontSize: 10, letterSpacing: "0.04em", color: "rgba(255,255,255,0.30)", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
    </div>
  );
}

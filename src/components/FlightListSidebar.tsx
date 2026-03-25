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
    const avgAlt = airborne.length > 0 ? Math.round(airborne.reduce((s, f) => s + f.altitude, 0) / airborne.length) : 0;
    const avgSpeed = airborne.length > 0 ? Math.round(airborne.reduce((s, f) => s + f.speed, 0) / airborne.length) : 0;
    const maxAlt = airborne.length > 0 ? Math.max(...airborne.map((f) => f.altitude)) : 0;
    const types = new Set(airborne.map((f) => f.aircraft).filter(Boolean));
    const airlines = new Set(airborne.map((f) => f.airline.code).filter((c) => c !== "??"));
    const emergencies = flights.filter((f) => f.squawk === "7700" || f.squawk === "7600" || f.squawk === "7500");
    const highest = airborne.length > 0 ? airborne.reduce((a, b) => a.altitude > b.altitude ? a : b) : null;
    const fastest = airborne.length > 0 ? airborne.reduce((a, b) => a.speed > b.speed ? a : b) : null;
    return { airborne: airborne.length, onGround: onGround.length, avgAlt, avgSpeed, maxAlt, types: types.size, airlines: airlines.size, emergencies: emergencies.length, highest, fastest };
  }, [flights]);

  return (
    <div className="hidden sm:block" style={{ position: "absolute", top: 62, left: 12, zIndex: 20, pointerEvents: "auto", width: 220 }}>
      <div style={{
        background: "rgba(17,17,24,0.85)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: 16,
        overflow: "hidden",
      }}>
        {/* ACTIVE FLIGHTS label */}
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.30)", marginBottom: 6 }}>
          ACTIVE FLIGHTS
        </div>

        {/* Big number */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 36, fontWeight: 700, color: "#fff", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
            {stats.airborne.toLocaleString()}
          </span>
          <span style={{ fontSize: 12, color: "#34C759", fontWeight: 500 }}>airborne</span>
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
          <StatItem label="AVG ALT" value={stats.avgAlt >= 1000 ? `FL${Math.round(stats.avgAlt / 100)}` : `${stats.avgAlt} ft`} />
          <StatItem label="AVG SPD" value={`${stats.avgSpeed} kts`} />
          <StatItem label="AIRLINES" value={String(stats.airlines)} />
          <StatItem label="ACFT TYPES" value={String(stats.types)} />
          <StatItem label="ON GROUND" value={String(stats.onGround)} />
          <StatItem label="MAX ALT" value={stats.maxAlt >= 1000 ? `FL${Math.round(stats.maxAlt / 100)}` : `${stats.maxAlt} ft`} />
        </div>

        {/* Emergency status */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{
            width: 6, height: 6, borderRadius: 3,
            background: stats.emergencies > 0 ? "#FF3B30" : "#34C759",
            boxShadow: stats.emergencies > 0 ? "0 0 6px rgba(255,59,48,0.6)" : "0 0 6px rgba(52,199,89,0.4)",
            animation: stats.emergencies > 0 ? "emergencyPulse 1.5s ease-in-out infinite" : "none",
          }} />
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: stats.emergencies > 0 ? "#FF3B30" : "#34C759",
          }}>
            {stats.emergencies > 0 ? `${stats.emergencies} EMERGENCY` : "NO EMERGENCIES"}
          </span>
        </div>

        {/* Notable flights */}
        {stats.highest && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.30)", marginBottom: 4 }}>HIGHEST</div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0A84FF", fontVariantNumeric: "tabular-nums" }}>{stats.highest.callsign || stats.highest.flightNumber}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.55)", fontVariantNumeric: "tabular-nums" }}>FL{Math.round(stats.highest.altitude / 100)}</span>
            </div>
            {stats.fastest && stats.fastest.id !== stats.highest.id && (
              <>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.30)", marginBottom: 4, marginTop: 8 }}>FASTEST</div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0A84FF", fontVariantNumeric: "tabular-nums" }}>{stats.fastest.callsign || stats.fastest.flightNumber}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.55)", fontVariantNumeric: "tabular-nums" }}>{stats.fastest.speed} kts</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.30)" }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

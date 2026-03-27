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

  const statItems: [string, string][] = [
    ["AVG ALT", stats.avgAlt >= 1000 ? `FL${Math.round(stats.avgAlt / 100)}` : `${stats.avgAlt} ft`],
    ["AVG SPD", `${stats.avgSpeed} kts`],
    ["AIRLINES", String(stats.airlines)],
    ["ACFT TYPES", String(stats.types)],
    ["ON GROUND", String(stats.onGround)],
    ["MAX ALT", stats.maxAlt >= 1000 ? `FL${Math.round(stats.maxAlt / 100)}` : `${stats.maxAlt} ft`],
  ];

  return (
    <>
    {/* Mobile stats pill */}
    <div className="mobile-only" style={{
      position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)",
      zIndex: 100, pointerEvents: "auto",
      background: "rgba(0,0,0,0.65)",
      backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
      borderRadius: 20, padding: "6px 16px",
      display: "flex", alignItems: "center", gap: 8,
      border: "1px solid rgba(255,255,255,0.08)",
    }}>
      <div style={{ width: 6, height: 6, borderRadius: 3, background: "#34C759" }} />
      <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", fontVariantNumeric: "tabular-nums" }}>
        {stats.airborne.toLocaleString()}
      </span>
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>airborne</span>
    </div>

    {/* Desktop stats panel */}
    <div id="stats-panel" style={{
      position: "fixed", top: 64, left: 16,
      background: "rgba(17,17,24,0.88)",
      backdropFilter: "blur(20px) saturate(180%)",
      WebkitBackdropFilter: "blur(20px) saturate(180%)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16, padding: 16,
      width: 184, zIndex: 100,
      fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif",
    }}>
      {/* ACTIVE FLIGHTS */}
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: "0.08em",
        textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 4,
      }}>Active Flights</div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 36, fontWeight: 700, color: "#FFFFFF", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          {stats.airborne.toLocaleString()}
        </span>
        <span style={{ fontSize: 12, color: "#34C759" }}>airborne</span>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
        {statItems.map(([label, value]) => (
          <div key={label}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.30)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#FFFFFF", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Emergency status */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        marginTop: 14, paddingTop: 14,
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: "50%",
          background: stats.emergencies > 0 ? "#FF3B30" : "#34C759",
          flexShrink: 0, display: "inline-block",
        }} />
        <span style={{
          fontSize: 11, fontWeight: 600, letterSpacing: "0.02em",
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
    </>
  );
}

"use client";

import { useState } from "react";
import { Flight } from "@/lib/types";
import { SavedFlight } from "@/lib/supabase/hooks";

interface MyFlightsViewProps {
  savedFlights: SavedFlight[];
  liveFights: Flight[];
  onSelectFlight: (flight: Flight) => void;
  onUnsave: (callsign: string) => void;
  onAddFlight: () => void;
  isSignedIn: boolean;
  onSignIn: () => void;
}

export default function MyFlightsView({ savedFlights, liveFights, onSelectFlight, onUnsave, onAddFlight, isSignedIn, onSignIn }: MyFlightsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const liveMap = new Map<string, Flight>();
  for (const f of liveFights) liveMap.set(f.callsign, f);

  // Search through live flights
  const searchResults = searchQuery.length >= 2
    ? liveFights.filter(f =>
        f.flightNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.callsign.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 10)
    : [];

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 10, top: 52, bottom: 68,
      display: "flex", flexDirection: "column",
      background: "rgba(10,10,15,0.92)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      fontFamily: "-apple-system, 'SF Pro Display', system-ui, sans-serif",
    }}>
      {/* Header */}
      <div style={{ padding: "16px 20px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", margin: 0 }}>My Flights</h2>
          {isSignedIn && (
            <button onClick={onAddFlight} style={{
              background: "#0A84FF", border: "none", borderRadius: 10,
              padding: "7px 14px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>+ Add Flight</button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "0 20px 20px" }}>
        {/* ═══ Not signed in ═══ */}
        {!isSignedIn && (
          <div style={{ textAlign: "center", padding: "40px 24px" }}>
            <div style={{ fontSize: 56, marginBottom: 20, color: "#0A84FF" }}>✈</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
              Track Your Flights
            </div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", marginTop: 10, maxWidth: 280, margin: "10px auto 24px", lineHeight: 1.5 }}>
              Sign in to save flights, get instant alerts, and never miss a gate change.
            </div>
            <button onClick={onSignIn} style={{
              background: "#0A84FF", border: "none", borderRadius: 14,
              padding: "14px 32px", color: "#fff", fontSize: 16, fontWeight: 600, cursor: "pointer",
              width: "100%", maxWidth: 280,
            }}>
              Sign In
            </button>

            {/* Search any flight */}
            <div style={{ marginTop: 28, textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.30)", marginBottom: 10 }}>Or search for any flight</div>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Flight number (e.g. UA452)"
                style={{
                  width: "100%", maxWidth: 280, height: 44, borderRadius: 10,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)",
                  color: "#fff", fontSize: 14, padding: "0 14px", outline: "none", textAlign: "center",
                }}
              />
              {searchResults.map(f => (
                <button key={f.id} onClick={() => onSelectFlight(f)} style={{
                  width: "100%", maxWidth: 280, textAlign: "left", display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", marginTop: 6, borderRadius: 10, cursor: "pointer",
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#0A84FF" }}>{f.flightNumber}</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.40)" }}>{f.origin.code} → {f.destination.code}</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginLeft: "auto" }}>FL{Math.round(f.altitude / 100)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ═══ Signed in, no saved flights ═══ */}
        {isSignedIn && savedFlights.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 24px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "rgba(255,255,255,0.55)" }}>No saved flights</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.30)", marginTop: 6, marginBottom: 20 }}>
              Search for a flight and tap the bookmark icon to save it
            </div>
            <button onClick={onAddFlight} style={{
              background: "#0A84FF", border: "none", borderRadius: 12,
              padding: "12px 24px", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer",
            }}>Search Flights</button>
          </div>
        )}

        {/* ═══ Saved flights list ═══ */}
        {savedFlights.map(saved => {
          const live = liveMap.get(saved.callsign);
          const isActive = !!live;
          const statusColor = live?.status === "en-route" ? "#34C759" : live?.status === "taxiing" ? "#FF9500" : "rgba(255,255,255,0.30)";
          const statusLabel = live?.status === "en-route" ? "En Route" : live?.status === "taxiing" ? "Taxiing" : live?.status === "landed" ? "Arrived" : "Scheduled";

          return (
            <button
              key={saved.id}
              onClick={() => live && onSelectFlight(live)}
              style={{
                width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 14,
                padding: "14px 16px", marginBottom: 6, borderRadius: 14, cursor: live ? "pointer" : "default",
                background: "rgba(28,28,40,0.5)", border: "1px solid rgba(255,255,255,0.06)",
                borderLeft: `3px solid ${isActive ? statusColor : "rgba(255,255,255,0.06)"}`,
                opacity: isActive ? 1 : 0.5,
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: `linear-gradient(135deg, ${live?.airline.color || "#555"}, ${live?.airline.color || "#555"}88)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, color: "#fff",
              }}>{saved.airlineCode || "??"}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{saved.flightNumber}</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.30)" }}>{saved.airlineName}</span>
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", marginTop: 3 }}>
                  {saved.originCode || "---"} → {saved.destinationCode || "---"}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                {isActive && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: 3, background: statusColor }} />
                    <span style={{ fontSize: 11, color: statusColor, fontWeight: 600 }}>{statusLabel}</span>
                  </div>
                )}
                <button onClick={(e) => { e.stopPropagation(); onUnsave(saved.callsign); }} style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "rgba(255,255,255,0.20)", fontSize: 10, padding: "2px 4px",
                }}>Remove</button>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

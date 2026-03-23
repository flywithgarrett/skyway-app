"use client";

import { useState, useEffect, useRef } from "react";

/* ── Types ── */
interface SatPosition {
  name: string;
  id: number;
  lat: number;
  lng: number;
  alt: number;
  velocity: number;
  inclination: number;
  period: number;
}

type SatGroup = "stations" | "starlink";

/* ── Satellite card ── */
function SatCard({ sat, selected, onClick }: { sat: SatPosition; selected: boolean; onClick: () => void }) {
  const isISS = sat.name.includes("ISS") || sat.id === 25544;
  const isStarlink = sat.name.startsWith("STARLINK");

  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 12,
      width: "100%", padding: "12px 16px", textAlign: "left",
      background: selected ? "rgba(0,229,255,0.08)" : "transparent",
      border: "none", cursor: "pointer",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
      borderLeft: selected ? "3px solid #00e5ff" : "3px solid transparent",
      transition: "all 0.15s ease",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: isISS ? "linear-gradient(135deg, #fbbf24, #f59e0b)"
          : isStarlink ? "linear-gradient(135deg, #3b82f6, #1d4ed8)"
          : "linear-gradient(135deg, #6366f1, #4f46e5)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
      }}>
        {isISS ? "🛸" : isStarlink ? "🌐" : "🛰"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {sat.name}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 1 }}>
          ALT {sat.alt.toFixed(0)} km · {(sat.velocity * 3600).toFixed(0)} km/h
        </div>
      </div>
      <div style={{ fontSize: 10, color: "rgba(0,229,255,0.5)", fontFamily: "monospace" }}>#{sat.id}</div>
    </button>
  );
}

/* ── Main ── */
export default function SatelliteView() {
  const [group, setGroup] = useState<SatGroup>("stations");
  const [positions, setPositions] = useState<SatPosition[]>([]);
  const [selected, setSelected] = useState<SatPosition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const selectedIdRef = useRef<number | null>(null);

  selectedIdRef.current = selected?.id ?? null;

  // Fetch positions from server (server does SGP4 propagation)
  useEffect(() => {
    setLoading(true);
    setError(null);
    setSelected(null);
    setPositions([]);

    let mounted = true;

    const fetchPositions = () => {
      fetch(`/api/satellites?group=${group}`)
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((data) => {
          if (!mounted) return;
          if (data.positions && data.positions.length > 0) {
            setPositions(data.positions);
            // Update selected if tracked
            const selId = selectedIdRef.current;
            if (selId) {
              const updated = data.positions.find((p: SatPosition) => p.id === selId);
              if (updated) setSelected(updated);
            }
          } else {
            setError("No satellite data available");
          }
          setLoading(false);
        })
        .catch((e) => {
          if (!mounted) return;
          console.error("Satellite fetch error:", e);
          setError("Failed to load satellite data");
          setLoading(false);
        });
    };

    fetchPositions();
    const interval = setInterval(fetchPositions, 3000);
    return () => { mounted = false; clearInterval(interval); };
  }, [group]);

  const filtered = search
    ? positions.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || String(s.id).includes(search))
    : positions;

  return (
    <div className="absolute inset-0 z-10 flex flex-col view-fade-in" style={{ background: "rgba(3, 8, 18, 0.97)", paddingBottom: 72 }}>

      {/* Header */}
      <div style={{ padding: "16px 20px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.3px" }}>Satellites</h1>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
              {positions.length} objects tracked · Live orbital data
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(52,211,153,0.1)", borderRadius: 12, padding: "6px 12px" }}>
            <div style={{ width: 6, height: 6, borderRadius: 3, background: "#34d399" }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "#34d399" }}>LIVE</span>
          </div>
        </div>

        {/* Group tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
          {([
            { id: "stations" as SatGroup, label: "Space Stations", icon: "🛸" },
            { id: "starlink" as SatGroup, label: "Starlink", icon: "🌐" },
          ]).map((g) => (
            <button key={g.id} onClick={() => setGroup(g.id)} style={{
              flex: 1, padding: "10px 0", fontSize: 13, fontWeight: 600,
              color: group === g.id ? "#00e5ff" : "rgba(255,255,255,0.35)",
              background: group === g.id ? "rgba(0,229,255,0.06)" : "transparent",
              border: group === g.id ? "1px solid rgba(0,229,255,0.15)" : "1px solid transparent",
              borderRadius: 10, cursor: "pointer", transition: "all 0.2s ease",
            }}>
              <span style={{ marginRight: 6 }}>{g.icon}</span>{g.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 12 }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search satellites..."
            style={{
              width: "100%", padding: "10px 12px 10px 36px",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10, color: "#fff", fontSize: 13, outline: "none",
            }}
          />
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.2)", fontSize: 14 }}>🔍</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* List */}
        <div style={{ width: selected ? "50%" : "100%", overflowY: "auto", transition: "width 0.3s ease" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🛰</div>
              <div>Loading orbital data...</div>
            </div>
          ) : error ? (
            <div style={{ padding: 40, textAlign: "center", color: "rgba(255,100,100,0.6)" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⚠</div>
              <div>{error}</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
              No satellites found
            </div>
          ) : (
            filtered.map((sat) => (
              <SatCard key={sat.id} sat={sat} selected={selected?.id === sat.id}
                onClick={() => setSelected(selected?.id === sat.id ? null : sat)} />
            ))
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{
            width: "50%", borderLeft: "1px solid rgba(255,255,255,0.06)",
            overflowY: "auto", padding: 20, background: "rgba(255,255,255,0.01)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{selected.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>NORAD #{selected.id}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>

            {/* Orbit viz */}
            <div style={{
              width: "100%", height: 160, borderRadius: 16,
              background: "radial-gradient(circle at 50% 50%, rgba(0,20,40,1) 30%, rgba(0,5,15,1) 100%)",
              position: "relative", overflow: "hidden", marginBottom: 20,
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{
                position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)",
                width: 60, height: 60, borderRadius: 30,
                background: "radial-gradient(circle at 40% 35%, #1a4a7a, #0a2a4a, #051525)",
                boxShadow: "0 0 30px rgba(30,100,180,0.2)",
              }} />
              <div style={{
                position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)",
                width: 120, height: 120, borderRadius: 60, border: "1px solid rgba(0,229,255,0.15)",
              }} />
              <div style={{
                position: "absolute",
                left: `${50 + 28 * Math.cos((selected.lng * Math.PI) / 180)}%`,
                top: `${50 - 28 * Math.sin((selected.lat * Math.PI) / 180)}%`,
                width: 8, height: 8, borderRadius: 4, background: "#00e5ff",
                boxShadow: "0 0 12px rgba(0,229,255,0.6)", transform: "translate(-50%,-50%)",
              }} />
              <div style={{ position: "absolute", bottom: 8, left: 12, fontSize: 10, color: "rgba(0,229,255,0.4)", fontFamily: "monospace" }}>
                Orbit: {selected.period.toFixed(1)} min · {selected.alt < 600 ? "LEO" : selected.alt < 2000 ? "MEO" : "GEO"}
              </div>
            </div>

            {/* Data grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "LATITUDE", value: `${selected.lat.toFixed(4)}°`, cyan: false },
                { label: "LONGITUDE", value: `${selected.lng.toFixed(4)}°`, cyan: false },
                { label: "ALTITUDE", value: `${selected.alt.toFixed(1)} km`, cyan: true },
                { label: "VELOCITY", value: `${(selected.velocity * 3600).toFixed(0)} km/h`, cyan: true },
                { label: "INCLINATION", value: `${selected.inclination.toFixed(1)}°`, cyan: false },
                { label: "ORBIT PERIOD", value: `${selected.period.toFixed(1)} min`, cyan: false },
              ].map((d) => (
                <div key={d.label} style={{
                  background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "10px 12px",
                  border: "1px solid rgba(255,255,255,0.04)",
                }}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.12em", marginBottom: 4 }}>{d.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "monospace", color: d.cyan ? "#00e5ff" : "rgba(255,255,255,0.7)" }}>{d.value}</div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: 16, padding: "12px 14px", borderRadius: 12,
              background: "rgba(0,229,255,0.04)", border: "1px solid rgba(0,229,255,0.08)",
            }}>
              <div style={{ fontSize: 10, color: "rgba(0,229,255,0.5)", letterSpacing: "0.12em", marginBottom: 6 }}>ORBIT CLASS</div>
              <div style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>
                {selected.alt < 600 ? "Low Earth Orbit (LEO)" : selected.alt < 2000 ? "MEO" : "GEO"}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                {selected.alt < 600 ? "ISS, Starlink, imaging satellites" : selected.alt < 2000 ? "Navigation satellites" : "Geostationary communications"}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

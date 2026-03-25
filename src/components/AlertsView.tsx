"use client";

import { useMemo } from "react";
import { Flight } from "@/lib/types";
import { EmergencyFlight, getEmergencyFlights } from "@/lib/emergencyData";
import { FlightAlert, ATCAdvisory, AlertSeverity } from "@/lib/alerts";

interface AlertsViewProps {
  onSelectFlight: (flight: Flight) => void;
  onSwitchToMap: () => void;
  flightAlerts?: FlightAlert[];
  atcAdvisories?: ATCAdvisory[];
  onMarkRead?: (id: string) => void;
}

function timeAgo(ts: number | string): string {
  const ms = typeof ts === "number" ? ts : new Date(ts).getTime();
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function dayLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  good: "#34C759",
  warning: "#FF9500",
  bad: "#FF3B30",
  info: "#0A84FF",
};

// ═══ Alert History Item ═══
function AlertHistoryItem({ alert, onTap }: { alert: FlightAlert; onTap: () => void }) {
  const stripe = SEVERITY_COLORS[alert.severity];
  return (
    <button
      onClick={onTap}
      style={{
        width: "100%", textAlign: "left", display: "flex", gap: 12,
        padding: "12px 14px 12px 16px", borderRadius: 14,
        background: alert.read ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
        cursor: "pointer", position: "relative", overflow: "hidden",
        transition: "background 0.2s ease",
      }}
    >
      {/* Left stripe */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0,
        width: 3, background: stripe,
      }} />

      {/* Airline badge */}
      <div style={{
        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
        background: `linear-gradient(135deg, ${alert.airlineColor}, ${alert.airlineColor}88)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, fontWeight: 700, color: "#fff",
      }}>
        {alert.airlineCode}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>
          {alert.title}
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>
          {alert.subtitle}
        </div>
      </div>

      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.30)", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
        {timeAgo(alert.timestamp)}
      </div>
    </button>
  );
}

// ═══ ATC Advisory Card ═══
function ATCCard({ advisory }: { advisory: ATCAdvisory }) {
  const bgColor = advisory.severity === "red"
    ? "rgba(255,59,48,0.08)"
    : advisory.severity === "amber"
    ? "rgba(255,149,0,0.08)"
    : "rgba(255,255,255,0.03)";
  const borderColor = advisory.severity === "red"
    ? "rgba(255,59,48,0.20)"
    : advisory.severity === "amber"
    ? "rgba(255,149,0,0.20)"
    : "rgba(255,255,255,0.08)";
  const titleColor = advisory.severity === "red" ? "#FF3B30"
    : advisory.severity === "amber" ? "#FF9500" : "#fff";

  return (
    <div style={{
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: 14,
      padding: 16,
      marginBottom: 8,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: titleColor }}>
          {advisory.title}
        </span>
        {advisory.avgDelay && (
          <span style={{ fontSize: 12, fontWeight: 600, color: titleColor, flexShrink: 0 }}>
            {advisory.avgDelay} delay
          </span>
        )}
      </div>

      {/* Reason + detail */}
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 4 }}>
        {advisory.reason}
      </div>
      {advisory.detail && (
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
          {advisory.detail}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
        <span style={{ fontSize: 13 }}>
          {advisory.type === "ground_stop" ? "🛑" : advisory.type === "weather" ? "⛈" : "⚠"}
        </span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.30)" }}>
          Advisory from Air Traffic Control
        </span>
      </div>
    </div>
  );
}

// ═══ Emergency Card (kept from original) ═══
function SquawkBadge({ type }: { type: EmergencyFlight["emergencyType"] }) {
  const labels: Record<string, { label: string; color: string; bg: string }> = {
    squawk7700: { label: "SQUAWK 7700", color: "#FF3B30", bg: "rgba(255,59,48,0.12)" },
    squawk7600: { label: "SQUAWK 7600", color: "#FF9500", bg: "rgba(255,149,0,0.12)" },
    squawk7500: { label: "SQUAWK 7500", color: "#FF3B30", bg: "rgba(255,59,48,0.15)" },
  };
  const s = labels[type] || labels.squawk7700;
  return (
    <span style={{
      padding: "2px 10px", borderRadius: 20,
      fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
      color: s.color, background: s.bg,
    }}>
      {s.label}
    </span>
  );
}

function EmergencyCard({ emergency, onSelect }: { emergency: EmergencyFlight; onSelect: () => void }) {
  const { flight, emergencyType, detectedAt, description, resolved } = emergency;
  return (
    <button
      onClick={onSelect}
      style={{
        width: "100%", textAlign: "left", borderRadius: 14, overflow: "hidden",
        background: resolved ? "rgba(17,17,24,0.5)" : "rgba(255,59,48,0.04)",
        border: resolved ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(255,59,48,0.12)",
        padding: "14px 16px", cursor: "pointer", transition: "background 0.2s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: `linear-gradient(135deg, ${flight.airline.color}, ${flight.airline.color}88)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, fontWeight: 700, color: "#fff",
          }}>
            {flight.airline.code}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{flight.flightNumber}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.30)" }}>{flight.airline.name}</div>
          </div>
        </div>
        <SquawkBadge type={emergencyType} />
      </div>

      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", marginBottom: 8 }}>{description}</div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.20)", fontVariantNumeric: "tabular-nums" }}>
          {timeAgo(new Date(detectedAt).getTime())}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 6, height: 6, borderRadius: 3,
            background: resolved ? "#34C759" : "#FF3B30",
          }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: resolved ? "rgba(52,199,89,0.6)" : "#FF3B30" }}>
            {resolved ? "Resolved" : "Active"}
          </span>
        </div>
      </div>
    </button>
  );
}

// ═══ Main AlertsView ═══
export default function AlertsView({ onSelectFlight, onSwitchToMap, flightAlerts = [], atcAdvisories = [], onMarkRead }: AlertsViewProps) {
  const { active, past24h } = useMemo(() => getEmergencyFlights(), []);

  // Group flight alerts by day
  const groupedAlerts = useMemo(() => {
    const groups: { label: string; alerts: FlightAlert[] }[] = [];
    const sorted = [...flightAlerts].sort((a, b) => b.timestamp - a.timestamp);
    let currentDay = "";
    for (const alert of sorted) {
      const day = dayLabel(alert.timestamp);
      if (day !== currentDay) {
        groups.push({ label: day, alerts: [] });
        currentDay = day;
      }
      groups[groups.length - 1].alerts.push(alert);
    }
    return groups;
  }, [flightAlerts]);

  return (
    <div className="view-fade-in absolute inset-0 z-10 flex flex-col" style={{ top: 48, bottom: 52 }}>
      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Header */}
        <div style={{ textAlign: "center", paddingTop: 8 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>Alerts</h2>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", marginTop: 4 }}>
            Flight changes, emergencies & ATC advisories
          </p>
        </div>

        {/* ── ATC Advisories ── */}
        {atcAdvisories.length > 0 && (
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 13 }}>🗼</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.30)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Direct from the Tower
              </span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>
                {atcAdvisories.length}
              </span>
            </div>
            {atcAdvisories.map((a, i) => (
              <ATCCard key={`${a.airport}-${a.type}-${i}`} advisory={a} />
            ))}
          </section>
        )}

        {/* ── Active Emergencies ── */}
        {active.length > 0 && (
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div className="emergency-pulse" style={{ width: 6, height: 6, borderRadius: 3, background: "#FF3B30" }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,59,48,0.70)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Active Emergencies
              </span>
              <span style={{ fontSize: 10, color: "rgba(255,59,48,0.40)", marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>
                {active.length}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {active.map((e) => (
                <EmergencyCard
                  key={e.flight.id}
                  emergency={e}
                  onSelect={() => { onSelectFlight(e.flight); onSwitchToMap(); }}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Flight Alert History ── */}
        {groupedAlerts.length > 0 && (
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.30)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Flight Alerts
              </span>
            </div>
            {groupedAlerts.map((group) => (
              <div key={group.label} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.20)", marginBottom: 8, letterSpacing: "0.02em" }}>
                  {group.label}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {group.alerts.map((a) => (
                    <AlertHistoryItem
                      key={a.id}
                      alert={a}
                      onTap={() => { onMarkRead?.(a.id); }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* ── Past 24h Emergencies ── */}
        {past24h.length > 0 && (
          <section>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.20)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Past 24 Hours
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {past24h.map((e) => (
                <EmergencyCard
                  key={e.flight.id}
                  emergency={e}
                  onSelect={() => { onSelectFlight(e.flight); onSwitchToMap(); }}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {active.length === 0 && groupedAlerts.length === 0 && atcAdvisories.length === 0 && (
          <div style={{
            textAlign: "center", padding: "40px 20px",
            background: "rgba(255,255,255,0.02)", borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✈️</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.55)" }}>All Clear</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.30)", marginTop: 4 }}>
              No active alerts or advisories
            </div>
          </div>
        )}

        <div style={{ height: 16 }} />
      </div>
    </div>
  );
}

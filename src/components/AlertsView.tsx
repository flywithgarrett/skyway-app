"use client";

import { useMemo } from "react";
import { Flight } from "@/lib/types";
import { EmergencyFlight, getEmergencyFlights } from "@/lib/emergencyData";
import { FlightAlert, ATCAdvisory, ALERT_CONFIG } from "@/lib/alerts";

interface AlertsViewProps {
  onSelectFlight: (flight: Flight) => void;
  onSwitchToMap: () => void;
  flightAlerts?: FlightAlert[];
  atcAdvisories?: ATCAdvisory[];
  atcLastUpdated?: number | null;
  onMarkRead?: (id: string) => void;
  onMarkAllRead?: () => void;
  unreadCount?: number;
  onAddFlight?: () => void;
  isSignedIn?: boolean;
  onSignIn?: () => void;
}

// ═══ Helpers ═══

function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function timeAgoShort(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function dayLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "TODAY";
  if (d.toDateString() === yesterday.toDateString()) return "YESTERDAY";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" }).toUpperCase();
}

// ═══ Alert Card ═══

function AlertCard({ alert, onTap }: { alert: FlightAlert; onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      style={{
        width: "100%", textAlign: "left", display: "flex", gap: 12,
        padding: "12px 14px",
        background: alert.read ? "rgba(28,28,40,0.4)" : "rgba(28,28,40,0.6)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderLeft: `3px solid ${alert.color}`,
        borderRadius: 12,
        cursor: "pointer", position: "relative",
        transition: "background 0.15s ease",
      }}
    >
      {/* Icon circle */}
      <div style={{
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        background: `${alert.color}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16,
      }}>
        {alert.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>
            {alert.title}
          </span>
          {/* Flight pill */}
          <span style={{
            fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.40)",
            background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4,
          }}>
            {alert.flightNumber}
          </span>
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 3 }}>
          {alert.body}
        </div>
      </div>

      {/* Time + unread dot */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", fontVariantNumeric: "tabular-nums" }}>
          {timeAgoShort(alert.timestamp)}
        </span>
        {!alert.read && (
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#0A84FF" }} />
        )}
      </div>
    </button>
  );
}

// ═══ ATC Advisory Card ═══

function ATCCard({ advisory }: { advisory: ATCAdvisory }) {
  const isGroundStop = advisory.type === "ground_stop";
  const bg = isGroundStop ? "rgba(255,59,48,0.08)" : "rgba(255,149,0,0.08)";
  const border = isGroundStop ? "rgba(255,59,48,0.20)" : "rgba(255,149,0,0.20)";
  const titleColor = isGroundStop ? "#FF3B30" : "#FF9500";

  return (
    <div style={{
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 14,
      padding: 16,
      marginBottom: 8,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>🗼</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: titleColor }}>
            {advisory.airport} {advisory.type === "ground_stop" ? "Ground Stop" : "Delays"}
          </span>
        </div>
        {advisory.avgDelay && (
          <span style={{ fontSize: 12, fontWeight: 600, color: titleColor }}>
            ↗ {advisory.avgDelay} delay
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: titleColor }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
            {isGroundStop
              ? `Flights to ${advisory.airport} Grounded`
              : `Ground Delay Program Active`}
          </span>
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginLeft: 12 }}>
          {advisory.reason}
          {advisory.detail ? ` · ${advisory.detail}` : ""}
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10 }}>
        <span style={{ fontSize: 13 }}>
          {isGroundStop ? "🛑" : "⚠"}
        </span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
          Advisory from Air Traffic Control
        </span>
      </div>
    </div>
  );
}

// ═══ Emergency Card ═══

function EmergencyCard({ emergency, onSelect }: { emergency: EmergencyFlight; onSelect: () => void }) {
  const { flight, emergencyType, detectedAt, description, resolved } = emergency;
  const squawkLabels: Record<string, { label: string; color: string }> = {
    squawk7700: { label: "7700 EMERGENCY", color: "#FF3B30" },
    squawk7600: { label: "7600 RADIO FAIL", color: "#FF9500" },
    squawk7500: { label: "7500 HIJACK", color: "#FF3B30" },
  };
  const sq = squawkLabels[emergencyType] || squawkLabels.squawk7700;

  return (
    <button
      onClick={onSelect}
      style={{
        width: "100%", textAlign: "left", borderRadius: 12, padding: "12px 14px",
        background: resolved ? "rgba(28,28,40,0.3)" : "rgba(255,59,48,0.06)",
        border: resolved ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(255,59,48,0.15)",
        borderLeft: `3px solid ${resolved ? "rgba(255,255,255,0.10)" : sq.color}`,
        cursor: "pointer", display: "flex", gap: 12,
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        background: `linear-gradient(135deg, ${flight.airline.color}, ${flight.airline.color}88)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, fontWeight: 700, color: "#fff",
      }}>
        {flight.airline.code}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{flight.flightNumber}</span>
          <span style={{
            fontSize: 9, fontWeight: 700, color: sq.color, letterSpacing: "0.04em",
            background: `${sq.color}18`, padding: "2px 8px", borderRadius: 4,
          }}>{sq.label}</span>
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.40)" }}>{description}</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.20)", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
          {timeAgo(new Date(detectedAt).getTime())}
          {resolved && <span style={{ color: "#34C759", marginLeft: 8 }}>Resolved</span>}
        </div>
      </div>
    </button>
  );
}

// ═══ Empty State ═══

function EmptyState({ onAddFlight }: { onAddFlight?: () => void }) {
  return (
    <div style={{
      textAlign: "center", padding: "48px 24px",
      background: "rgba(28,28,40,0.4)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 16,
    }}>
      {/* Bell icon */}
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 16px" }}>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      <div style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.55)", marginBottom: 6 }}>
        No alerts yet
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.30)", marginBottom: 20 }}>
        Save flights to start tracking them
      </div>
      {onAddFlight && (
        <button
          onClick={onAddFlight}
          style={{
            background: "#0A84FF", border: "none", borderRadius: 12,
            padding: "10px 20px", color: "#fff", fontSize: 14, fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Add a Flight
        </button>
      )}
    </div>
  );
}

// ═══ Main AlertsView ═══

export default function AlertsView({
  onSelectFlight, onSwitchToMap,
  flightAlerts = [], atcAdvisories = [], atcLastUpdated,
  onMarkRead, onMarkAllRead, unreadCount = 0, onAddFlight,
  isSignedIn = true, onSignIn,
}: AlertsViewProps) {
  const { active, past24h } = useMemo(() => getEmergencyFlights(), []);

  // Group alerts by day
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

  const hasContent = flightAlerts.length > 0 || atcAdvisories.length > 0 || active.length > 0;

  return (
    <div className="view-fade-in absolute inset-0 z-10 flex flex-col" style={{ top: 48, bottom: 68 }}>
      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 8 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
            Alerts
          </h2>
          {unreadCount > 0 && onMarkAllRead && (
            <button
              onClick={onMarkAllRead}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 13, color: "#0A84FF", fontWeight: 500,
              }}
            >
              Mark all read
            </button>
          )}
        </div>

        {/* ── Sign-in prompt ── */}
        {!isSignedIn && (
          <div style={{ textAlign: "center", padding: "40px 24px" }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#0A84FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 20px", display: "block" }}>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>Stay Informed</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", marginTop: 10, maxWidth: 280, margin: "10px auto 24px", lineHeight: 1.5 }}>
              Sign in to get real-time alerts for gate changes, delays, and ATC advisories.
            </div>
            {onSignIn && (
              <button onClick={onSignIn} style={{
                background: "#0A84FF", border: "none", borderRadius: 14,
                padding: "14px 32px", color: "#fff", fontSize: 16, fontWeight: 600, cursor: "pointer",
                width: "100%", maxWidth: 280,
              }}>Sign In</button>
            )}
          </div>
        )}

        {/* ── Empty state (signed in, no alerts) ── */}
        {isSignedIn && !hasContent && <EmptyState onAddFlight={onAddFlight} />}

        {/* ── ATC Advisories ── */}
        {atcAdvisories.length > 0 && (
          <section>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{
                fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.30)",
                letterSpacing: "0.04em", textTransform: "uppercase",
              }}>
                Air Traffic Control
              </span>
              {atcLastUpdated && (
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", fontVariantNumeric: "tabular-nums" }}>
                  Updated {timeAgo(atcLastUpdated)}
                </span>
              )}
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
              <span style={{
                fontSize: 11, fontWeight: 600, color: "rgba(255,59,48,0.70)",
                letterSpacing: "0.04em", textTransform: "uppercase",
              }}>
                Active Emergencies · {active.length}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
            {groupedAlerts.map((group) => (
              <div key={group.label} style={{ marginBottom: 16 }}>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.25)",
                  letterSpacing: "0.06em", marginBottom: 8,
                }}>
                  {group.label}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {group.alerts.map((a) => (
                    <AlertCard
                      key={a.id}
                      alert={a}
                      onTap={() => onMarkRead?.(a.id)}
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
            <div style={{
              fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.20)",
              letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 10,
            }}>
              Past 24 Hours
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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

        {/* ── No active ATC advisories ── */}
        {atcAdvisories.length === 0 && hasContent && (
          <div style={{
            background: "rgba(28,28,40,0.3)", border: "1px solid rgba(255,255,255,0.04)",
            borderRadius: 12, padding: "14px 16px", textAlign: "center",
          }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
              No active ATC advisories
            </span>
          </div>
        )}

        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}

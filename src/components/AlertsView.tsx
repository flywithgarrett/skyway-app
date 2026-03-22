"use client";

import { useMemo } from "react";
import { Flight } from "@/lib/types";
import { EmergencyFlight, getEmergencyFlights } from "@/lib/emergencyData";

interface AlertsViewProps {
  onSelectFlight: (flight: Flight) => void;
  onSwitchToMap: () => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SquawkBadge({ type }: { type: EmergencyFlight["emergencyType"] }) {
  const labels: Record<string, { label: string; color: string; bg: string }> = {
    squawk7700: { label: "SQUAWK 7700", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
    squawk7600: { label: "SQUAWK 7600", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    squawk7500: { label: "SQUAWK 7500", color: "#dc2626", bg: "rgba(220,38,38,0.15)" },
  };
  const s = labels[type] || labels.squawk7700;
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{
        color: s.color,
        background: s.bg,
        boxShadow: `0 0 12px ${s.color}30`,
        textShadow: `0 0 6px ${s.color}40`,
      }}
    >
      {s.label}
    </span>
  );
}

function EmergencyCard({
  emergency,
  onSelect,
}: {
  emergency: EmergencyFlight;
  onSelect: () => void;
}) {
  const { flight, emergencyType, detectedAt, description, resolved } = emergency;

  return (
    <button
      onClick={onSelect}
      className="w-full text-left rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.01] emergency-card"
      style={{
        background: resolved
          ? "rgba(10, 18, 32, 0.5)"
          : "rgba(239, 68, 68, 0.04)",
        border: resolved
          ? "1px solid rgba(255,255,255,0.04)"
          : "1px solid rgba(239, 68, 68, 0.12)",
        boxShadow: resolved
          ? "none"
          : "0 0 20px rgba(239, 68, 68, 0.06), inset 0 1px 0 rgba(255,255,255,0.03)",
      }}
    >
      <div className="px-4 py-3.5">
        {/* Top row: airline badge + flight number + squawk badge */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold tracking-wide"
              style={{
                background: `linear-gradient(135deg, ${flight.airline.color}, ${flight.airline.color}88)`,
                color: "#fff",
                boxShadow: `0 2px 8px ${flight.airline.color}30`,
              }}
            >
              {flight.airline.code}
            </div>
            <div>
              <div className="text-sm font-bold text-glow-white">{flight.flightNumber}</div>
              <div className="text-[10px] text-white/25">{flight.airline.name}</div>
            </div>
          </div>
          <SquawkBadge type={emergencyType} />
        </div>

        {/* Aircraft + location */}
        <div className="flex items-center gap-4 mb-2">
          {flight.aircraft && (
            <div className="text-[10px] text-white/30">
              <span className="text-white/50 font-mono">{flight.aircraft}</span>
            </div>
          )}
          <div className="text-[10px] text-white/30">
            {flight.originCountry}
          </div>
          {!resolved && flight.altitude > 0 && (
            <div className="text-[10px] font-mono text-white/30">
              FL{Math.round(flight.altitude / 100)} · {flight.speed} kts
            </div>
          )}
        </div>

        {/* Description */}
        <div className="text-[11px] text-white/35 leading-relaxed mb-2">
          {description}
        </div>

        {/* Footer: time + status */}
        <div className="flex items-center justify-between">
          <div className="text-[10px] text-white/20 font-mono">
            {timeAgo(detectedAt)}
          </div>
          {resolved ? (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
              <span className="text-[10px] text-emerald-400/60 font-medium">Resolved</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 emergency-pulse" />
              <span className="text-[10px] text-red-400 font-medium">Active</span>
            </div>
          )}
        </div>
      </div>

      {/* Click hint */}
      {!resolved && (
        <div className="px-4 py-2 border-t border-white/[0.03] text-center">
          <span className="text-[10px] text-cyan-400/40">Tap to locate on globe</span>
        </div>
      )}
    </button>
  );
}

export default function AlertsView({ onSelectFlight, onSwitchToMap }: AlertsViewProps) {
  const { active, past24h } = useMemo(() => getEmergencyFlights(), []);

  const handleSelectEmergency = (emergency: EmergencyFlight) => {
    if (!emergency.resolved) {
      onSelectFlight(emergency.flight);
      onSwitchToMap();
    }
  };

  return (
    <div className="view-fade-in absolute inset-0 z-10 flex flex-col" style={{ top: 48, bottom: 52 }}>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Header */}
        <div className="text-center pt-2">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-red-500 emergency-pulse" />
            <h2 className="text-lg font-bold text-glow-white">Emergency Alerts</h2>
          </div>
          <p className="text-[11px] text-white/20">Global emergency aircraft monitoring</p>
        </div>

        {/* Active Emergencies */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 emergency-pulse" />
            <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-red-400/70">
              Active Emergencies
            </span>
            <span className="text-[10px] font-mono text-red-400/40 ml-auto">{active.length}</span>
          </div>
          {active.length === 0 ? (
            <div className="glass-detail rounded-2xl px-4 py-8 text-center">
              <div className="text-[11px] text-white/20">No active emergencies</div>
              <div className="text-[10px] text-white/10 mt-1">All clear</div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {active.map((e) => (
                <EmergencyCard
                  key={e.flight.id}
                  emergency={e}
                  onSelect={() => handleSelectEmergency(e)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Past 24 Hours */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
            <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-white/25">
              Past 24 Hours
            </span>
            <span className="text-[10px] font-mono text-white/15 ml-auto">{past24h.length}</span>
          </div>
          <div className="space-y-2">
            {past24h.map((e) => (
              <EmergencyCard
                key={e.flight.id}
                emergency={e}
                onSelect={() => handleSelectEmergency(e)}
              />
            ))}
          </div>
        </section>

        <div className="h-4" />
      </div>
    </div>
  );
}

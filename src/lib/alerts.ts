"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Flight } from "./types";

// ═══ Alert Types & Colors ═══

export type AlertType = "gate_change" | "delay" | "boarding" | "departure" | "landing" | "cancelled" | "baggage" | "atc";

export const ALERT_CONFIG: Record<AlertType, { icon: string; color: string }> = {
  gate_change: { icon: "🚪", color: "#FF9500" },
  delay:       { icon: "⏱",  color: "#FF9500" },
  boarding:    { icon: "✈",  color: "#34C759" },
  departure:   { icon: "🛫", color: "#34C759" },
  landing:     { icon: "🛬", color: "#34C759" },
  cancelled:   { icon: "✕",  color: "#FF3B30" },
  baggage:     { icon: "🧳", color: "#0A84FF" },
  atc:         { icon: "🗼", color: "#FF3B30" },
};

export interface FlightAlert {
  id: string;
  flightId: string;
  flightNumber: string;
  airlineCode: string;
  airlineColor: string;
  origin: string;
  destination: string;
  type: AlertType;
  title: string;
  body: string;
  color: string;
  icon: string;
  timestamp: number;
  read: boolean;
}

export interface ATCAdvisory {
  airport: string;
  type: "ground_stop" | "ground_delay" | "airspace_flow" | "weather";
  severity: "red" | "amber" | "yellow";
  title: string;
  reason: string;
  detail: string;
  avgDelay: string | null;
  endTime: string | null;
}

// ═══ LocalStorage persistence ═══

const LS_KEY = "skyway_alerts";

function loadAlerts(): FlightAlert[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
}

function saveAlerts(alerts: FlightAlert[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(alerts.slice(0, 200)));
  } catch {}
}

// ═══ Flight Change Detection ═══

interface FlightSnapshot {
  status: string;
  altitude: number;
  speed: number;
  onGround: boolean;
  scheduledDep: string | null;
  estimatedArr: string | null;
}

function routeLabel(f: Flight): string {
  if (f.origin.code !== "---" && f.destination.code !== "---") {
    return `${f.origin.code} → ${f.destination.code}`;
  }
  return f.flightNumber;
}

function detectChanges(
  prev: FlightSnapshot,
  curr: Flight,
): { type: AlertType; title: string; body: string }[] {
  const changes: { type: AlertType; title: string; body: string }[] = [];
  const route = routeLabel(curr);

  // Departure delay
  if (curr.scheduledDep && curr.actualDep) {
    const delayMin = Math.round(
      (new Date(curr.actualDep).getTime() - new Date(curr.scheduledDep).getTime()) / 60000
    );
    if (delayMin >= 15 && prev.status === "scheduled") {
      const newTime = new Date(curr.actualDep).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      changes.push({
        type: "delay",
        title: `Delayed ${delayMin}m`,
        body: `${curr.flightNumber} · New departure ${newTime}`,
      });
    }
  }

  // Status transitions
  if (prev.status !== curr.status) {
    if (curr.status === "en-route" && (prev.status === "scheduled" || prev.status === "taxiing")) {
      changes.push({
        type: "departure",
        title: "Departed",
        body: `${curr.flightNumber} · ${route}`,
      });
    }

    if (curr.status === "taxiing" && prev.status === "scheduled") {
      changes.push({
        type: "boarding",
        title: "Boarding now",
        body: `${curr.flightNumber} · ${route}`,
      });
    }

    if (curr.status === "landed" && prev.status === "en-route") {
      changes.push({
        type: "landing",
        title: "Landed",
        body: `${curr.flightNumber} · ${route}`,
      });
    }
  }

  // Altitude-based landing detection (backup)
  if (!prev.onGround && curr.onGround && prev.altitude > 1000) {
    if (!changes.some(c => c.type === "landing")) {
      changes.push({
        type: "landing",
        title: "Landed",
        body: `${curr.flightNumber} has arrived`,
      });
    }
  }

  return changes;
}

// ═══ Flight Alert Monitor Hook ═══

export function useFlightAlerts(flights: Flight[], savedCallsigns: Set<string>) {
  const [alerts, setAlerts] = useState<FlightAlert[]>(() => loadAlerts());
  const [newAlerts, setNewAlerts] = useState<FlightAlert[]>([]);
  const snapshotsRef = useRef<Map<string, FlightSnapshot>>(new Map());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (flights.length === 0 || savedCallsigns.size === 0) return;

    const watched = flights.filter(f => savedCallsigns.has(f.callsign));
    if (watched.length === 0) return;

    if (!initializedRef.current) {
      for (const f of watched) {
        snapshotsRef.current.set(f.id, {
          status: f.status, altitude: f.altitude, speed: f.speed,
          onGround: f.onGround, scheduledDep: f.scheduledDep, estimatedArr: f.estimatedArr,
        });
      }
      initializedRef.current = true;
      return;
    }

    const batch: FlightAlert[] = [];

    for (const f of watched) {
      const prev = snapshotsRef.current.get(f.id);
      if (!prev) {
        snapshotsRef.current.set(f.id, {
          status: f.status, altitude: f.altitude, speed: f.speed,
          onGround: f.onGround, scheduledDep: f.scheduledDep, estimatedArr: f.estimatedArr,
        });
        continue;
      }

      const changes = detectChanges(prev, f);
      for (const change of changes) {
        const cfg = ALERT_CONFIG[change.type];
        batch.push({
          id: `${f.id}-${change.type}-${Date.now()}`,
          flightId: f.id,
          flightNumber: f.flightNumber,
          airlineCode: f.airline.code,
          airlineColor: f.airline.color,
          origin: f.origin.code,
          destination: f.destination.code,
          type: change.type,
          title: change.title,
          body: change.body,
          color: cfg.color,
          icon: cfg.icon,
          timestamp: Date.now(),
          read: false,
        });
      }

      snapshotsRef.current.set(f.id, {
        status: f.status, altitude: f.altitude, speed: f.speed,
        onGround: f.onGround, scheduledDep: f.scheduledDep, estimatedArr: f.estimatedArr,
      });
    }

    if (batch.length > 0) {
      setAlerts(prev => {
        const updated = [...batch, ...prev].slice(0, 200);
        saveAlerts(updated);
        return updated;
      });
      setNewAlerts(batch);
    }
  }, [flights, savedCallsigns]);

  const dismissToast = useCallback((id: string) => {
    setNewAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const markRead = useCallback((id: string) => {
    setAlerts(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, read: true } : a);
      saveAlerts(updated);
      return updated;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setAlerts(prev => {
      const updated = prev.map(a => ({ ...a, read: true }));
      saveAlerts(updated);
      return updated;
    });
  }, []);

  const unreadCount = alerts.filter(a => !a.read).length;

  return { alerts, newAlerts, dismissToast, markRead, markAllRead, unreadCount };
}

// ═══ ATC Advisory Hook ═══

export function useATCAdvisories(pollingMs = 300000) {
  const [advisories, setAdvisories] = useState<ATCAdvisory[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  useEffect(() => {
    const fetchAdvisories = async () => {
      try {
        const res = await fetch("/api/atc-status");
        if (res.ok) {
          const json = await res.json();
          setAdvisories(json.advisories || []);
          setLastUpdated(Date.now());
        }
      } catch {}
    };

    fetchAdvisories();
    const interval = setInterval(fetchAdvisories, pollingMs);
    return () => clearInterval(interval);
  }, [pollingMs]);

  return { advisories, lastUpdated };
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Flight } from "./types";

// ═══ Alert Types ═══

export type AlertSeverity = "good" | "warning" | "bad" | "info";

export interface FlightAlert {
  id: string;
  flightId: string;
  flightNumber: string;
  airlineCode: string;
  airlineColor: string;
  origin: string;
  destination: string;
  type: string;
  title: string;
  subtitle: string;
  severity: AlertSeverity;
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

// ═══ Flight Change Detection ═══

interface FlightSnapshot {
  status: string;
  altitude: number;
  speed: number;
  onGround: boolean;
  scheduledDep: string | null;
  estimatedArr: string | null;
}

function detectChanges(
  prev: FlightSnapshot,
  curr: Flight,
): { type: string; title: string; subtitle: string; severity: AlertSeverity }[] {
  const changes: { type: string; title: string; subtitle: string; severity: AlertSeverity }[] = [];

  // Departure delay detection
  if (curr.scheduledDep && curr.actualDep) {
    const schedMs = new Date(curr.scheduledDep).getTime();
    const actualMs = new Date(curr.actualDep).getTime();
    const delayMin = Math.round((actualMs - schedMs) / 60000);
    if (delayMin >= 15 && prev.status === "scheduled") {
      const newTime = new Date(curr.actualDep).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      changes.push({
        type: "delay",
        title: `${curr.origin.code} ✈ ${curr.destination.code} · Delayed ${delayMin}m`,
        subtitle: `New departure ${newTime}`,
        severity: delayMin >= 60 ? "bad" : "warning",
      });
    }
  }

  // Status transitions
  if (prev.status !== curr.status) {
    // Departed (was scheduled/taxiing, now en-route)
    if (curr.status === "en-route" && (prev.status === "scheduled" || prev.status === "taxiing")) {
      changes.push({
        type: "departure",
        title: `${curr.origin.code} → ${curr.destination.code} · Departed`,
        subtitle: `Taxiing for takeoff`,
        severity: "good",
      });
    }

    // Taxiing (was scheduled, now taxiing)
    if (curr.status === "taxiing" && prev.status === "scheduled") {
      changes.push({
        type: "boarding",
        title: `${curr.flightNumber} · Boarding`,
        subtitle: `Departing ${curr.origin.code} → ${curr.destination.code}`,
        severity: "info",
      });
    }

    // Landed
    if (curr.status === "landed" && prev.status === "en-route") {
      changes.push({
        type: "landing",
        title: `Landed at ${curr.destination.code}`,
        subtitle: `${curr.origin.code} → ${curr.destination.code} complete`,
        severity: "good",
      });
    }
  }

  // Descending detection (approaching landing)
  if (!prev.onGround && curr.onGround && prev.altitude > 1000) {
    changes.push({
      type: "landing",
      title: `Landed at ${curr.destination.code}`,
      subtitle: `${curr.flightNumber} has arrived`,
      severity: "good",
    });
  }

  return changes;
}

// ═══ Flight Alert Monitor Hook ═══

export function useFlightAlerts(flights: Flight[], pollingMs = 90000) {
  const [alerts, setAlerts] = useState<FlightAlert[]>([]);
  const [newAlerts, setNewAlerts] = useState<FlightAlert[]>([]); // For toast display
  const snapshotsRef = useRef<Map<string, FlightSnapshot>>(new Map());
  const prevFlightsRef = useRef<Flight[]>([]);

  useEffect(() => {
    if (flights.length === 0) return;
    // Skip first render — just take snapshots
    if (prevFlightsRef.current.length === 0) {
      for (const f of flights) {
        snapshotsRef.current.set(f.id, {
          status: f.status,
          altitude: f.altitude,
          speed: f.speed,
          onGround: f.onGround,
          scheduledDep: f.scheduledDep,
          estimatedArr: f.estimatedArr,
        });
      }
      prevFlightsRef.current = flights;
      return;
    }

    const batch: FlightAlert[] = [];

    for (const f of flights) {
      const prev = snapshotsRef.current.get(f.id);
      if (!prev) {
        // New flight appeared — snapshot it
        snapshotsRef.current.set(f.id, {
          status: f.status,
          altitude: f.altitude,
          speed: f.speed,
          onGround: f.onGround,
          scheduledDep: f.scheduledDep,
          estimatedArr: f.estimatedArr,
        });
        continue;
      }

      const changes = detectChanges(prev, f);
      for (const change of changes) {
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
          subtitle: change.subtitle,
          severity: change.severity,
          timestamp: Date.now(),
          read: false,
        });
      }

      // Update snapshot
      snapshotsRef.current.set(f.id, {
        status: f.status,
        altitude: f.altitude,
        speed: f.speed,
        onGround: f.onGround,
        scheduledDep: f.scheduledDep,
        estimatedArr: f.estimatedArr,
      });
    }

    if (batch.length > 0) {
      setAlerts((prev) => [...batch, ...prev].slice(0, 200)); // Keep max 200
      setNewAlerts(batch);
    }

    prevFlightsRef.current = flights;
  }, [flights, pollingMs]);

  const dismissToast = useCallback((id: string) => {
    setNewAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const markRead = useCallback((id: string) => {
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, read: true } : a));
  }, []);

  return { alerts, newAlerts, dismissToast, markRead };
}

// ═══ ATC Advisory Hook ═══

export function useATCAdvisories(pollingMs = 300000) {
  const [advisories, setAdvisories] = useState<ATCAdvisory[]>([]);

  useEffect(() => {
    const fetchAdvisories = async () => {
      try {
        const res = await fetch("/api/atc-status");
        if (res.ok) {
          const json = await res.json();
          setAdvisories(json.advisories || []);
        }
      } catch {}
    };

    fetchAdvisories();
    const interval = setInterval(fetchAdvisories, pollingMs);
    return () => clearInterval(interval);
  }, [pollingMs]);

  return advisories;
}

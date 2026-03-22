"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Flight } from "./types";

export function useLiveFlights(intervalMs: number = 10000, initialFlights: Flight[] = []) {
  const [flights, setFlights] = useState<Flight[]>(initialFlights);
  const [source, setSource] = useState<string>(initialFlights.length > 0 ? "prefetch" : "");
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchFlights = useCallback(async () => {
    try {
      const res = await fetch("/api/flights");
      const json = await res.json();
      if (!mountedRef.current) return;

      const incoming = json.flights || [];

      if (json.error) {
        setError(json.error);
        // On 429 or any error: keep existing flights on the map, don't clear
        if (incoming.length > 0) {
          setFlights(incoming);
        }
      } else if (!res.ok) {
        setError(`API returned HTTP ${res.status}`);
      } else {
        // Success — update flights and clear error
        setFlights(incoming);
        setSource(json.source || "unknown");
        setError(null);
      }

      if (json.source) {
        console.log(`[SkyWay] ${incoming.length} flights (${json.source})`);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Network Error: ${msg}`);
      // Keep existing flights — don't clear the map
      console.error("[SkyWay] Fetch failed:", err);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const delay = initialFlights.length > 0 ? intervalMs : 0;
    const timeout = setTimeout(() => {
      fetchFlights();
    }, delay);
    const interval = setInterval(fetchFlights, intervalMs);
    return () => {
      mountedRef.current = false;
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [fetchFlights, intervalMs, initialFlights.length]);

  return { flights, source, error };
}

// --- FlightAware premium detail enrichment (on-demand per click) ---

export interface FlightDetail {
  ident: string;
  operator: string | null;
  aircraftType: string | null;
  registration: string | null;
  status: string | null;
  origin: {
    code: string; icao: string; name: string; city: string;
    lat: number; lng: number; gate: string | null; terminal: string | null;
  } | null;
  destination: {
    code: string; icao: string; name: string; city: string;
    lat: number; lng: number; gate: string | null; terminal: string | null;
  } | null;
  scheduledDep: string | null;
  actualDep: string | null;
  scheduledArr: string | null;
  estimatedArr: string | null;
  actualArr: string | null;
  progress: number;
  routeDistance: number | null;
  waypoints: string | null;
  filedAirspeed: number | null;
  filedAltitude: number | null;
}

export function useFlightDetails(callsign: string | null) {
  const [detail, setDetail] = useState<FlightDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!callsign) {
      setDetail(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/flight-details?callsign=${encodeURIComponent(callsign)}`)
      .then(async (res) => {
        const json = await res.json();
        if (cancelled) return;
        if (json.error) {
          setError(json.error);
          setDetail(null);
        } else {
          setDetail(json as FlightDetail);
          setError(null);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [callsign]);

  return { detail, loading, error };
}

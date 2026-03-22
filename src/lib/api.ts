"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Flight } from "./types";

export function useLiveFlights(intervalMs: number = 10000) {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [source, setSource] = useState<string>("");
  const mountedRef = useRef(true);

  const fetchFlights = useCallback(async () => {
    try {
      const res = await fetch("/api/flights");
      const json = await res.json();

      if (mountedRef.current) {
        const flightData: Flight[] = json.flights || [];
        setFlights(flightData);
        setLastUpdate(Date.now());
        setLoading(false);
        setSource(json.source || "unknown");
        setError(json.error || null);

        if (json.source) {
          console.log(`[SkyWay] ${flightData.length} flights loaded (source: ${json.source})`);
        }
      }
    } catch (err) {
      console.error("[SkyWay] Failed to fetch /api/flights:", err);
      if (mountedRef.current) {
        setError(String(err));
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchFlights();
    const interval = setInterval(fetchFlights, intervalMs);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchFlights, intervalMs]);

  return { flights, loading, error, lastUpdate, source };
}

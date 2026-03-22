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

      setFlights(json.flights || []);
      setSource(json.source || "unknown");

      if (json.error) {
        setError(json.error);
      } else if (!res.ok) {
        setError(`API returned HTTP ${res.status}`);
      } else {
        setError(null);
      }

      if (json.source) {
        console.log(`[SkyWay] ${(json.flights || []).length} flights (${json.source})`);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Network Error: ${msg}`);
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

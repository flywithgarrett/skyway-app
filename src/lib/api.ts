"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Flight } from "./types";

export function useLiveFlights(intervalMs: number = 10000, initialFlights: Flight[] = []) {
  const [flights, setFlights] = useState<Flight[]>(initialFlights);
  const [source, setSource] = useState<string>(initialFlights.length > 0 ? "prefetch" : "");
  const mountedRef = useRef(true);

  const fetchFlights = useCallback(async () => {
    try {
      const res = await fetch("/api/flights");
      const json = await res.json();
      if (mountedRef.current) {
        setFlights(json.flights || []);
        setSource(json.source || "unknown");
        if (json.source) {
          console.log(`[SkyWay] ${(json.flights || []).length} flights (${json.source})`);
        }
      }
    } catch (err) {
      console.error("[SkyWay] Fetch failed:", err);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    // Don't fetch immediately if we have prefetched data — wait for first interval
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

  return { flights, source };
}

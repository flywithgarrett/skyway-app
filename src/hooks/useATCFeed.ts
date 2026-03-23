"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const WS_URL = process.env.NEXT_PUBLIC_ATC_WS_URL || "ws://localhost:3001";

export interface ATCTranscript {
  type: "transcript";
  icao: string;
  text: string;
  timestamp: number;
  callsign: string | null;
  lat: number | null;
  lng: number | null;
  altitude: number | null;
  groundspeed: number | null;
  heading: number | null;
  flightId: string | null;
}

export interface ATCAlert {
  type: "alert";
  icao: string;
  severity: string;
  alertType: string;
  text: string;
  timestamp: number;
}

interface UseATCFeedReturn {
  transcripts: ATCTranscript[];
  alerts: ATCAlert[];
  activeCallsign: string | null;
  isConnected: boolean;
}

const MAX_TRANSCRIPTS = 100;

export function useATCFeed(activeAirport: string | null): UseATCFeedReturn {
  const [transcripts, setTranscripts] = useState<ATCTranscript[]>([]);
  const [alerts, setAlerts] = useState<ATCAlert[]>([]);
  const [activeCallsign, setActiveCallsign] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const subscribedRef = useRef<string | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(1000);

  const connect = useCallback(() => {
    // Clean up existing connection
    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
      wsRef.current = null;
    }

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        backoffRef.current = 1000;

        // Subscribe to active airport on connect
        if (activeAirport) {
          ws.send(JSON.stringify({ subscribe: activeAirport }));
          subscribedRef.current = activeAirport;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "transcript") {
            const t = data as ATCTranscript;
            setTranscripts((prev) => {
              const next = [t, ...prev];
              return next.length > MAX_TRANSCRIPTS ? next.slice(0, MAX_TRANSCRIPTS) : next;
            });
            if (t.callsign) setActiveCallsign(t.callsign);
          }

          if (data.type === "alert") {
            setAlerts((prev) => [data as ATCAlert, ...prev].slice(0, 50));
          }
        } catch {}
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        // Auto-reconnect with backoff
        const delay = Math.min(backoffRef.current, 15000);
        backoffRef.current = Math.min(backoffRef.current * 2, 15000);
        reconnectTimer.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        // onclose will fire after onerror, triggering reconnect
      };
    } catch {
      // Schedule reconnect
      const delay = Math.min(backoffRef.current, 15000);
      backoffRef.current = Math.min(backoffRef.current * 2, 15000);
      reconnectTimer.current = setTimeout(connect, delay);
    }
  }, [activeAirport]);

  // Connect on mount, reconnect on airport change
  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        try { wsRef.current.close(); } catch {}
        wsRef.current = null;
      }
    };
  }, [connect]);

  // Resubscribe when activeAirport changes (without reconnecting)
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    // Unsubscribe from old airport
    if (subscribedRef.current && subscribedRef.current !== activeAirport) {
      ws.send(JSON.stringify({ unsubscribe: subscribedRef.current }));
    }

    // Subscribe to new airport
    if (activeAirport) {
      ws.send(JSON.stringify({ subscribe: activeAirport }));
      subscribedRef.current = activeAirport;
    } else {
      subscribedRef.current = null;
    }

    // Clear transcripts when switching airports
    setTranscripts([]);
    setActiveCallsign(null);
  }, [activeAirport]);

  return { transcripts, alerts, activeCallsign, isConnected };
}

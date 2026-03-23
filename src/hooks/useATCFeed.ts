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
  isDemo: boolean;
}

const MAX_TRANSCRIPTS = 100;
const DEMO_FALLBACK_AFTER = 3; // fall back to demo after N failed WS attempts

/* ═══════════════════════════════════════════════════════════════════════════
   Demo transcript generator — realistic ATC communications per airport
   ═══════════════════════════════════════════════════════════════════════════ */

const AIRLINES = ["UAL", "DAL", "AAL", "SWA", "JBU", "NKS", "SKW", "RPA", "ASA", "FFT"];
const DEMO_PHRASES: Record<string, string[]> = {
  KJFK: [
    "{cs} Kennedy Tower, runway 31 left, cleared for takeoff, wind 310 at 12",
    "{cs} contact New York Departure 135.9, good day",
    "Kennedy Ground, {cs} at gate Bravo 47, requesting pushback and start",
    "{cs} taxi to runway 31 left via Alpha, hold short of Kilo",
    "{cs} turn left heading 220, radar contact, climb and maintain flight level two four zero",
    "Kennedy Approach, {cs} with you descending through eight thousand for ILS 31 left",
    "{cs} reduce speed to 170 knots, number three for the approach",
    "{cs} cleared ILS runway 31 left approach, maintain 3000 until established",
    "Ground, {cs} requesting taxi from terminal 4 to runway 22 right",
    "{cs} caution wake turbulence, heavy Boeing 777 departed same runway",
  ],
  KLAX: [
    "{cs} LAX Tower, runway 25 left, cleared to land, wind 250 at 8",
    "{cs} contact SoCal Departure on 124.3, good day",
    "LAX Ground, {cs} at terminal 7, push and start approved",
    "{cs} taxi to runway 24 right via Alpha Alpha, monitor tower 133.9",
    "{cs} turn right heading 260, climb and maintain flight level three one zero",
    "SoCal Approach, {cs} with you level at seven thousand",
    "{cs} descend and maintain four thousand, expect visual approach runway 25 left",
    "{cs} traffic alert, VFR target 2 o'clock, 3 miles, altitude indicates 4500",
    "{cs} cleared visual approach runway 24 right, follow company 737 on short final",
    "Ground, {cs} at gate 72B requesting progressive taxi instructions",
  ],
  KORD: [
    "{cs} O'Hare Tower, runway 10 center, cleared for takeoff",
    "{cs} Chicago Approach, descend and maintain 5000, expect ILS 10 center",
    "O'Hare Ground, {cs} gate C17, pushback approved, expect runway 28 right",
    "{cs} taxi to runway 28 right via Mike, cross runway 27 left",
    "{cs} turn left heading 360, climb flight level two eight zero",
    "{cs} reduce to 210 knots, sequencing for 10 center approach",
    "Approach, {cs} checking in at nine thousand, information Tango",
    "{cs} go around, climb runway heading to 3000, traffic on the runway",
    "{cs} contact O'Hare Tower 126.9 when established on the localizer",
    "{cs} winds 340 at 18 gusting 28, runway 10 center, cleared to land",
  ],
};

// Generic phrases used for airports without specific entries
const GENERIC_PHRASES = [
  "{cs} Tower, runway {rwy}, cleared for takeoff, wind {wind}",
  "{cs} contact Departure on {freq}, good day",
  "Ground, {cs} requesting pushback and start from gate {gate}",
  "{cs} taxi to runway {rwy} via {taxi}",
  "{cs} turn left heading {hdg}, climb and maintain flight level {fl}",
  "Approach, {cs} with you descending through {alt} thousand",
  "{cs} reduce speed to {spd} knots, number {seq} for the approach",
  "{cs} cleared ILS runway {rwy} approach",
  "{cs} radar contact, {alt2} miles from the field",
  "{cs} caution wake turbulence, heavy departed {time} minutes ago",
  "{cs} cleared visual approach runway {rwy}",
  "{cs} contact Ground on 121.9 when clear of the runway",
  "Tower, {cs} going around, will re-enter the pattern",
  "{cs} squawk {sq} and ident",
  "{cs} maintain present heading, vectors for sequencing",
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateCallsign(): string {
  return randomItem(AIRLINES) + String(Math.floor(Math.random() * 9000) + 100);
}

function generateDemoTranscript(icao: string): ATCTranscript {
  const callsign = generateCallsign();
  const phrases = DEMO_PHRASES[icao] || GENERIC_PHRASES;
  let text = randomItem(phrases);

  // Replace placeholders
  text = text.replace(/\{cs\}/g, callsign);
  text = text.replace(/\{rwy\}/g, randomItem(["4 left", "9 right", "22 left", "28 center", "31 right", "36 left"]));
  text = text.replace(/\{wind\}/g, `${Math.floor(Math.random() * 36) * 10} at ${Math.floor(Math.random() * 20) + 5}`);
  text = text.replace(/\{freq\}/g, `${(118 + Math.random() * 18).toFixed(1)}`);
  text = text.replace(/\{gate\}/g, `${randomItem(["A", "B", "C", "D"])}${Math.floor(Math.random() * 40) + 1}`);
  text = text.replace(/\{taxi\}/g, randomItem(["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Mike", "November"]));
  text = text.replace(/\{hdg\}/g, String(Math.floor(Math.random() * 36) * 10));
  text = text.replace(/\{fl\}/g, String(Math.floor(Math.random() * 20 + 20) * 10));
  text = text.replace(/\{alt\}/g, String(Math.floor(Math.random() * 10 + 3)));
  text = text.replace(/\{alt2\}/g, String(Math.floor(Math.random() * 15 + 5)));
  text = text.replace(/\{spd\}/g, String(Math.floor(Math.random() * 6 + 15) * 10));
  text = text.replace(/\{seq\}/g, String(Math.floor(Math.random() * 5) + 2));
  text = text.replace(/\{time\}/g, String(Math.floor(Math.random() * 3) + 1));
  text = text.replace(/\{sq\}/g, String(Math.floor(Math.random() * 7000) + 1000));

  return {
    type: "transcript",
    icao,
    text,
    timestamp: Date.now(),
    callsign,
    lat: null,
    lng: null,
    altitude: Math.floor(Math.random() * 350 + 10) * 100,
    groundspeed: Math.floor(Math.random() * 300 + 120),
    heading: Math.floor(Math.random() * 360),
    flightId: null,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   Hook
   ═══════════════════════════════════════════════════════════════════════════ */

export function useATCFeed(activeAirport: string | null): UseATCFeedReturn {
  const [transcripts, setTranscripts] = useState<ATCTranscript[]>([]);
  const [alerts, setAlerts] = useState<ATCAlert[]>([]);
  const [activeCallsign, setActiveCallsign] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const subscribedRef = useRef<string | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(1000);
  const failCountRef = useRef(0);
  const demoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Demo mode: generate transcripts on an interval ──
  const startDemo = useCallback((icao: string) => {
    if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);

    setIsDemo(true);
    setIsConnected(true);

    // Generate a few initial transcripts immediately
    const initial: ATCTranscript[] = [];
    for (let i = 0; i < 4; i++) {
      const t = generateDemoTranscript(icao);
      t.timestamp = Date.now() - (3 - i) * 8000;
      initial.push(t);
    }
    setTranscripts(initial.reverse());

    // Then add a new one every 3–7 seconds
    demoIntervalRef.current = setInterval(() => {
      const t = generateDemoTranscript(icao);
      setTranscripts((prev) => {
        const next = [t, ...prev];
        return next.length > MAX_TRANSCRIPTS ? next.slice(0, MAX_TRANSCRIPTS) : next;
      });
      if (t.callsign) setActiveCallsign(t.callsign);
    }, 3000 + Math.random() * 4000);
  }, []);

  const stopDemo = useCallback(() => {
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current);
      demoIntervalRef.current = null;
    }
    setIsDemo(false);
  }, []);

  const connect = useCallback(() => {
    // Don't try WS if already in demo mode
    if (isDemo) return;

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
        setIsDemo(false);
        failCountRef.current = 0;
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
        failCountRef.current++;

        // After N failures, fall back to demo mode if an airport is selected
        if (failCountRef.current >= DEMO_FALLBACK_AFTER && activeAirport) {
          startDemo(activeAirport);
          return;
        }

        // Auto-reconnect with backoff
        const delay = Math.min(backoffRef.current, 15000);
        backoffRef.current = Math.min(backoffRef.current * 2, 15000);
        reconnectTimer.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        // onclose will fire after onerror, triggering reconnect
      };
    } catch {
      failCountRef.current++;

      if (failCountRef.current >= DEMO_FALLBACK_AFTER && activeAirport) {
        startDemo(activeAirport);
        return;
      }

      // Schedule reconnect
      const delay = Math.min(backoffRef.current, 15000);
      backoffRef.current = Math.min(backoffRef.current * 2, 15000);
      reconnectTimer.current = setTimeout(connect, delay);
    }
  }, [activeAirport, isDemo, startDemo]);

  // Connect on mount
  useEffect(() => {
    if (activeAirport) {
      failCountRef.current = 0;
      stopDemo();
      connect();
    }
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        try { wsRef.current.close(); } catch {}
        wsRef.current = null;
      }
      stopDemo();
    };
  }, [activeAirport, connect, stopDemo]);

  // Resubscribe when activeAirport changes (without reconnecting)
  useEffect(() => {
    // If in demo mode, restart demo for the new airport
    if (isDemo && activeAirport) {
      setTranscripts([]);
      setActiveCallsign(null);
      startDemo(activeAirport);
      return;
    }

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
  }, [activeAirport, isDemo, startDemo]);

  return { transcripts, alerts, activeCallsign, isConnected, isDemo };
}

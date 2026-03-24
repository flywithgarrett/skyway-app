"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Flight, Airport } from "@/lib/types";

interface ISSPosition {
  lat: number;
  lng: number;
  alt: number;
  velocity: number;
}

interface MapProps {
  flights: Flight[];
  airports: Airport[];
  selectedFlight: Flight | null;
  onSelectFlight: (flight: Flight | null) => void;
  issPosition: ISSPosition | null;
  flyToISS: boolean;
  onFlyToISSComplete: () => void;
  flyToAirport?: Airport | null;
  onFlyToAirportComplete?: () => void;
  highlightedCallsign?: string | null;
  onHighlightComplete?: () => void;
}

/* ── Major airports ── */
const MAJOR_AIRPORTS = new Set([
  "ATL","LAX","ORD","DFW","DEN","JFK","SFO","SEA","LAS","MCO",
  "EWR","MIA","CLT","PHX","IAH","BOS","MSP","DTW","FLL","PHL",
  "LGA","BWI","SLC","SAN","IAD","DCA","TPA","AUS","HNL","PDX",
  "STL","MCI","BNA","RDU","SMF","CLE","OAK","MKE","SJC","IND",
  "PIT","CVG","CMH","SAT","RSW","SNA","DAL","MDW","HOU","BUR",
  "YYZ","YVR","YUL","YYC","MEX","CUN","LHR","CDG","FRA","AMS",
]);

/* ── Plane SVG — bold bright white aircraft, Apple-premium feel ── */
function planeSvg(color: string, heading: number, size = 32, glow = false): string {
  const filterId = glow ? "pg" : "ps";
  const filter = glow
    ? `<filter id="${filterId}" x="-80%" y="-80%" width="260%" height="260%">
        <feDropShadow dx="0" dy="0" stdDeviation="8" flood-color="${color}" flood-opacity="1"/>
        <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#fff" flood-opacity="0.7"/>
      </filter>`
    : `<filter id="${filterId}" x="-60%" y="-60%" width="220%" height="220%">
        <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#fff" flood-opacity="0.8"/>
        <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#000" flood-opacity="0.9"/>
      </filter>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
    <defs>${filter}</defs>
    <g transform="rotate(${heading}, 32, 32)" filter="url(#${filterId})">
      <path d="M32 6 C33 6 34 8 34 12 L34.5 22 L53 34 L53 37 L34.5 30 L34.5 48 L40 53 L40 55.5 L32 52 L24 55.5 L24 53 L29.5 48 L29.5 30 L11 37 L11 34 L29.5 22 L30 12 C30 8 31 6 32 6Z" fill="${color}" stroke="rgba(20,20,20,0.5)" stroke-width="0.8"/>
    </g>
  </svg>`;
}

function planeSvgUrl(color: string, heading: number, size = 32, glow = false): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(planeSvg(color, heading, size, glow))}`;
}

/* ── Airport marker SVG — pulsing beacon + IATA label (must be pure SVG for 3D markers) ── */
function airportMarkerSvg(code: string, pulsing: boolean): string {
  const w = 140, h = 100, cx = w / 2;
  const dotY = 32;
  const textW = code.length * 14 + 18;
  const pillX = cx - textW / 2;

  // Pulsing rings using SVG <animate> — only when pulsing
  const pulseRings = pulsing ? `
    <circle cx="${cx}" cy="${dotY}" r="8" fill="none" stroke="rgba(0,229,255,0.6)" stroke-width="2">
      <animate attributeName="r" from="8" to="50" dur="2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" from="0.8" to="0" dur="2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="${cx}" cy="${dotY}" r="8" fill="none" stroke="rgba(0,229,255,0.4)" stroke-width="1.5">
      <animate attributeName="r" from="8" to="50" dur="2s" begin="0.6s" repeatCount="indefinite"/>
      <animate attributeName="opacity" from="0.6" to="0" dur="2s" begin="0.6s" repeatCount="indefinite"/>
    </circle>
    <circle cx="${cx}" cy="${dotY}" r="8" fill="none" stroke="rgba(0,229,255,0.25)" stroke-width="1">
      <animate attributeName="r" from="8" to="50" dur="2s" begin="1.2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" from="0.4" to="0" dur="2s" begin="1.2s" repeatCount="indefinite"/>
    </circle>
  ` : "";

  // Core beacon glow animation
  const beaconGlow = pulsing
    ? `<circle cx="${cx}" cy="${dotY}" r="14" fill="rgba(0,229,255,0.15)">
        <animate attributeName="r" values="14;20;14" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite"/>
      </circle>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <radialGradient id="ag_${code}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="rgba(0,229,255,1)"/>
        <stop offset="25%" stop-color="rgba(0,229,255,0.7)"/>
        <stop offset="60%" stop-color="rgba(0,229,255,0.15)"/>
        <stop offset="100%" stop-color="rgba(0,229,255,0)"/>
      </radialGradient>
      <filter id="af_${code}" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#000" flood-opacity="1"/>
      </filter>
    </defs>
    ${pulseRings}
    ${beaconGlow}
    <!-- Static glow halo -->
    <circle cx="${cx}" cy="${dotY}" r="26" fill="url(#ag_${code})"/>
    <!-- Core bright dot -->
    <circle cx="${cx}" cy="${dotY}" r="6" fill="#00e5ff" opacity="0.9"/>
    <circle cx="${cx}" cy="${dotY}" r="3" fill="#fff"/>
    <!-- Dark pill label -->
    <rect x="${pillX}" y="62" width="${textW}" height="26" rx="13" fill="rgba(0,0,0,0.8)"/>
    <rect x="${pillX}" y="62" width="${textW}" height="26" rx="13" fill="none" stroke="rgba(0,229,255,0.35)" stroke-width="1"/>
    <!-- IATA code -->
    <text x="${cx}" y="80" text-anchor="middle" font-family="'SF Pro Display','Inter',-apple-system,BlinkMacSystemFont,sans-serif" font-size="15" font-weight="800" fill="#ffffff" letter-spacing="1.5" filter="url(#af_${code})">${code}</text>
  </svg>`;
}


/* ── ISS marker SVG — always visible, distinctive golden icon ── */
function issMarkerSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
    <defs>
      <radialGradient id="issg" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="rgba(251,191,36,0.8)"/>
        <stop offset="50%" stop-color="rgba(251,191,36,0.3)"/>
        <stop offset="100%" stop-color="rgba(251,191,36,0)"/>
      </radialGradient>
      <filter id="issf"><feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#fbbf24" flood-opacity="0.9"/></filter>
    </defs>
    <circle cx="36" cy="36" r="36" fill="url(#issg)"/>
    <g transform="translate(36,36)" filter="url(#issf)">
      <!-- Solar panels -->
      <rect x="-24" y="-3" width="14" height="6" rx="1" fill="#fbbf24" opacity="0.9"/>
      <rect x="10" y="-3" width="14" height="6" rx="1" fill="#fbbf24" opacity="0.9"/>
      <!-- Truss -->
      <rect x="-10" y="-1" width="20" height="2" rx="1" fill="#fff"/>
      <!-- Core module -->
      <rect x="-4" y="-6" width="8" height="12" rx="2" fill="#fff"/>
      <!-- Radiators -->
      <rect x="-2" y="-10" width="4" height="4" rx="0.5" fill="#fbbf24" opacity="0.7"/>
      <rect x="-2" y="6" width="4" height="4" rx="0.5" fill="#fbbf24" opacity="0.7"/>
    </g>
  </svg>`;
}

function issMarkerUrl(): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(issMarkerSvg())}`;
}

/* ── Flight popup ── */
function flightPopupHtml(f: Flight): string {
  const altStr = f.altitude >= 1000 ? `FL${Math.round(f.altitude / 100)}` : `${f.altitude.toLocaleString()} ft`;
  return `<div style="background:rgba(6,12,24,0.92);backdrop-filter:blur(20px) saturate(1.6);-webkit-backdrop-filter:blur(20px) saturate(1.6);border:1px solid rgba(59,184,232,0.25);border-radius:14px;padding:14px 18px;color:#c8dae8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;line-height:1.6;min-width:200px;box-shadow:0 8px 32px rgba(0,0,0,0.6),0 0 40px rgba(59,184,232,0.08);">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
      <span style="font-weight:700;font-size:16px;color:#00e5ff;letter-spacing:0.8px;">${f.flightNumber}</span>
      ${f.aircraft ? `<span style="background:rgba(59,184,232,0.15);color:#3bb8e8;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:600;">${f.aircraft}</span>` : ""}
    </div>
    <div style="color:#6d8899;font-size:11px;">${f.airline.name}</div>
    <div style="margin-top:8px;display:flex;align-items:center;gap:6px;">
      <span style="color:#fff;font-weight:600;">${f.origin.code}</span>
      <span style="color:#3bb8e8;">&rarr;</span>
      <span style="color:#fff;font-weight:600;">${f.destination.code}</span>
    </div>
    <div style="margin-top:10px;display:flex;gap:16px;color:#4a7090;font-size:10px;font-family:'SF Mono',Menlo,monospace;letter-spacing:0.3px;">
      <span>${altStr}</span><span>${f.speed} kts</span><span>HDG ${f.heading}&deg;</span>
    </div>
  </div>`;
}

/* ── Great circle ── */
function gcPoints(lat1: number, lng1: number, lat2: number, lng2: number, n: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const φ1 = toRad(lat1), λ1 = toRad(lng1), φ2 = toRad(lat2), λ2 = toRad(lng2);
  const d = 2 * Math.asin(Math.sqrt(Math.sin((φ2 - φ1) / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2));
  if (d < 1e-10) return [{ lat: lat1, lng: lng1 }];
  const pts: { lat: number; lng: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const a = Math.sin((1 - f) * d) / Math.sin(d);
    const b = Math.sin(f * d) / Math.sin(d);
    const x = a * Math.cos(φ1) * Math.cos(λ1) + b * Math.cos(φ2) * Math.cos(λ2);
    const y = a * Math.cos(φ1) * Math.sin(λ1) + b * Math.cos(φ2) * Math.sin(λ2);
    const z = a * Math.sin(φ1) + b * Math.sin(φ2);
    pts.push({ lat: toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))), lng: toDeg(Math.atan2(y, x)) });
  }
  return pts;
}

/* ── Script loader ── */
/* ── Solar position for day/night overlay ── */
function getSunPosition(date: Date): { lat: number; lng: number } {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  const declination = -23.44 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));
  const hours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const lng = (12 - hours) * 15;
  return { lat: declination, lng: lng > 180 ? lng - 360 : lng < -180 ? lng + 360 : lng };
}

const API_KEY = "AIzaSyD4zUAl2Ox3sqe2w7izi_OkFT6C-P3yBhU";
let scriptPromise: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (typeof google !== "undefined" && google.maps?.importLibrary) { resolve(); return; }
    (window as any).initMap = () => resolve();
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&v=beta&callback=initMap`;
    s.async = true; s.defer = true;
    s.onerror = () => reject(new Error("Google Maps script failed"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const google: any;

/* ── Default camera: dark globe view centered on US ── */
const HOME_CAMERA = { center: { lat: 38, lng: -97, altitude: 0 }, range: 12000000, tilt: 15, heading: 0 };

export default function FlightMap({ flights, airports, selectedFlight, onSelectFlight, issPosition, flyToISS, onFlyToISSComplete, flyToAirport, onFlyToAirportComplete, highlightedCallsign, onHighlightComplete }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const is3dRef = useRef(false);
  const markersRef = useRef<Map<string, any>>(new Map());
  const airportMarkersRef = useRef<any[]>([]);
  const issMarkerRef = useRef<any>(null);
  const routeRef = useRef<any[]>([]);
  const popupRef = useRef<any>(null);
  const onSelectRef = useRef(onSelectFlight);
  onSelectRef.current = onSelectFlight;
  const selectedRef = useRef(selectedFlight);
  selectedRef.current = selectedFlight;
  const prevCameraRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  /* ══ Init ══ */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { await loadGoogleMaps(); } catch (e) { console.error(e); return; }
      if (cancelled || !containerRef.current) return;

      try {
        const { Map3DElement } = await google.maps.importLibrary("maps3d");
        const map3d = new Map3DElement({
          // Start far out for cinematic intro
          center: { lat: 20, lng: 40, altitude: 0 },
          range: 40000000,
          tilt: 0,
          heading: 0,
          mode: "SATELLITE",  // No labels = cleaner, darker
        });
        map3d.style.width = "100%";
        map3d.style.height = "100%";
        if (cancelled) return;
        containerRef.current!.appendChild(map3d);
        mapRef.current = map3d;
        is3dRef.current = true;
        setMapReady(true);

        // Cinematic intro: slow spin to US
        setTimeout(() => {
          if (map3d.flyCameraTo) {
            map3d.flyCameraTo({
              endCamera: HOME_CAMERA,
              durationMillis: 4000,
            });
          }
        }, 800);

      } catch (err) {
        console.warn("3D failed, using 2D:", err);
        try {
          const { Map: GMap } = await google.maps.importLibrary("maps");
          if (cancelled || !containerRef.current) return;
          const map2d = new GMap(containerRef.current, {
            center: { lat: 38, lng: -97 }, zoom: 4, mapTypeId: "hybrid",
            disableDefaultUI: true, zoomControl: true,
          });
          mapRef.current = map2d;
          is3dRef.current = false;
          setMapReady(true);
        } catch (err2) { console.error(err2); }
      }
    })();

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => { try { m.remove?.(); m.setMap?.(null); } catch {} });
      markersRef.current.clear();
      airportMarkersRef.current.forEach((m) => { try { m.remove?.(); m.setMap?.(null); } catch {} });
      airportMarkersRef.current = [];
      if (issMarkerRef.current) { try { issMarkerRef.current.remove?.(); issMarkerRef.current.setMap?.(null); } catch {} issMarkerRef.current = null; }
      if (containerRef.current) try { containerRef.current.innerHTML = ""; } catch {}
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  /* ══ Track zoom level for ground traffic scaling ══ */
  const isZoomedInRef = useRef(false);

  /* ══ Airport pulsing beacon markers ══ */
  const airportPulsingRef = useRef<Set<string>>(new Set());
  const airportDataRef = useRef<Map<string, { marker: any; airport: Airport }>>(new Map());

  // Parse SVG string into an actual SVGElement DOM node (required for 3D markers to get animation)
  const parseSvgElement = useCallback((svgString: string): SVGElement => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, "image/svg+xml");
    return doc.documentElement as unknown as SVGElement;
  }, []);

  const updateAirportPulse = useCallback((pulsingCodes: Set<string>) => {
    airportPulsingRef.current = pulsingCodes;
    for (const [code, { marker, airport }] of airportDataRef.current) {
      const shouldPulse = pulsingCodes.has(code);
      if (is3dRef.current) {
        // 3D: use SVGElement directly (gmp-marker-3d accepts HTMLImageElement or SVGElement)
        const tpl = document.createElement("template");
        const svgEl = parseSvgElement(airportMarkerSvg(code, shouldPulse));
        tpl.content.appendChild(svgEl);
        while (marker.firstChild) marker.removeChild(marker.firstChild);
        marker.append(tpl);
      } else {
        if (marker.content) {
          const div = document.createElement("div");
          div.innerHTML = airportMarkerSvg(code, shouldPulse);
          div.title = `${airport.code} — ${airport.name}, ${airport.city}`;
          marker.content = div;
        }
      }
    }
  }, [parseSvgElement]);

  useEffect(() => {
    if (!mapReady || !airports.length) return;
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;

    (async () => {
      airportMarkersRef.current.forEach((m) => { try { m.remove?.(); m.setMap?.(null); } catch {} });
      airportMarkersRef.current = [];
      airportDataRef.current.clear();
      if (cancelled) return;

      const majors = airports.filter((a) => MAJOR_AIRPORTS.has(a.code));

      if (is3dRef.current) {
        const { Marker3DElement } = await google.maps.importLibrary("maps3d");
        if (cancelled) return;
        for (const apt of majors) {
          const marker = new Marker3DElement({
            position: { lat: apt.lat, lng: apt.lng, altitude: 0 },
            altitudeMode: "CLAMP_TO_GROUND",
            collisionBehavior: "REQUIRED",
            zIndex: 5000,
          });
          const shouldPulse = airportPulsingRef.current.has(apt.code);
          const tpl = document.createElement("template");
          const svgEl = parseSvgElement(airportMarkerSvg(apt.code, shouldPulse));
          tpl.content.appendChild(svgEl);
          marker.append(tpl);
          map.append(marker);
          airportMarkersRef.current.push(marker);
          airportDataRef.current.set(apt.code, { marker, airport: apt });
        }
      } else {
        const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
        if (cancelled) return;
        for (const apt of majors) {
          const div = document.createElement("div");
          div.innerHTML = airportMarkerSvg(apt.code, false);
          div.title = `${apt.code} — ${apt.name}, ${apt.city}`;
          const m = new AdvancedMarkerElement({ map, position: { lat: apt.lat, lng: apt.lng }, content: div, zIndex: 5000 });
          airportMarkersRef.current.push(m);
          airportDataRef.current.set(apt.code, { marker: m, airport: apt });
        }
      }
    })();

    return () => { cancelled = true; };
  }, [mapReady, airports, updateAirportPulse, parseSvgElement]);

  /* ══ Detect zoom level → pulse nearby airports + show ground traffic ══ */
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;

    let animFrame: number | null = null;
    let lastRange = -1;

    const checkZoom = () => {
      const range = is3dRef.current ? (map.range ?? 40000000) : null;
      const zoom = !is3dRef.current && map.getZoom ? map.getZoom() : null;

      // Determine "close" zoom: range < 200km in 3D or zoom > 10 in 2D
      const isClose = range !== null ? range < 200000 : (zoom !== null && zoom > 10);
      isZoomedInRef.current = isClose;

      if (range !== null && Math.abs(range - lastRange) < 500) {
        animFrame = requestAnimationFrame(checkZoom);
        return;
      }
      lastRange = range ?? -1;

      if (isClose) {
        // Find airports near the camera center
        let centerLat: number, centerLng: number;
        if (is3dRef.current && map.center) {
          centerLat = typeof map.center.lat === "function" ? map.center.lat() : map.center.lat;
          centerLng = typeof map.center.lng === "function" ? map.center.lng() : map.center.lng;
        } else if (map.getCenter) {
          const c = map.getCenter();
          centerLat = c.lat();
          centerLng = c.lng();
        } else {
          animFrame = requestAnimationFrame(checkZoom);
          return;
        }

        // Find airports within ~1 degree (~60 nm) of camera center
        const nearbyAirports = new Set<string>();
        for (const [code, { airport }] of airportDataRef.current) {
          const dLat = Math.abs(airport.lat - centerLat);
          const dLng = Math.abs(airport.lng - centerLng);
          if (dLat < 1.5 && dLng < 1.5) {
            nearbyAirports.add(code);
          }
        }

        // Update pulsing state
        const currentPulsing = airportPulsingRef.current;
        const changed = nearbyAirports.size !== currentPulsing.size ||
          [...nearbyAirports].some(c => !currentPulsing.has(c));
        if (changed) {
          updateAirportPulse(nearbyAirports);
        }
      } else {
        // Not close — stop all pulsing
        if (airportPulsingRef.current.size > 0) {
          updateAirportPulse(new Set());
        }
      }

      animFrame = requestAnimationFrame(checkZoom);
    };

    animFrame = requestAnimationFrame(checkZoom);
    return () => { if (animFrame) cancelAnimationFrame(animFrame); };
  }, [mapReady, updateAirportPulse]);

  /* ══ Day/Night — canvas overlay with smooth terminator ══ */
  const dayNightCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map || !is3dRef.current) return;
    const container = containerRef.current;
    if (!container) return;

    // Create canvas overlay
    let canvas = dayNightCanvasRef.current;
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;mix-blend-mode:multiply;";
      container.parentElement?.appendChild(canvas);
      dayNightCanvasRef.current = canvas;
    }

    let animFrame: number | null = null;
    let cancelled = false;

    const toRad = (d: number) => d * Math.PI / 180;

    const render = () => {
      if (cancelled || !canvas) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const now = new Date();
      const sun = getSunPosition(now);
      const sunLatRad = toRad(sun.lat);
      const sunLngRad = toRad(sun.lng);

      // Get camera center from the 3D map
      let camLat = 38, camLng = -97, camRange = 12000000;
      try {
        if (map.center) {
          camLat = typeof map.center.lat === "function" ? map.center.lat() : (map.center.lat ?? 38);
          camLng = typeof map.center.lng === "function" ? map.center.lng() : (map.center.lng ?? -97);
        }
        camRange = map.range ?? 12000000;
      } catch {}

      // How far we see (in degrees) — approximation from camera range
      const fovDeg = Math.min(180, (camRange / 111320) * 0.8);

      // For each pixel column, compute the longitude
      // For each pixel row, compute the latitude
      // Then compute solar elevation angle → darkness

      // Create image data for pixel manipulation
      const imageData = ctx.createImageData(w, h);
      const data = imageData.data;

      // Sampling at quarter resolution for performance, then scale
      const step = 4;
      const sw = Math.ceil(w / step);
      const sh = Math.ceil(h / step);

      // Compute darkness values at sample points
      const samples = new Float32Array(sw * sh);

      for (let sy = 0; sy < sh; sy++) {
        for (let sx = 0; sx < sw; sx++) {
          // Map pixel to lat/lng based on camera view
          const px = (sx / sw - 0.5) * 2; // -1 to 1
          const py = (sy / sh - 0.5) * 2; // -1 to 1

          const lat = camLat - py * fovDeg * 0.5;
          const lng = camLng + px * fovDeg * 0.5 * (w / h);

          if (lat < -90 || lat > 90) { samples[sy * sw + sx] = 0; continue; }

          // Solar angle: dot product of surface normal and sun direction
          const φ = toRad(lat);
          const λ = toRad(lng);
          const cosAngle = Math.sin(sunLatRad) * Math.sin(φ) +
            Math.cos(sunLatRad) * Math.cos(φ) * Math.cos(λ - sunLngRad);

          // Smooth transition: fully lit > 0, twilight 0 to -0.1, night < -0.1
          let darkness: number;
          if (cosAngle > 0.05) {
            darkness = 0; // daytime
          } else if (cosAngle > -0.12) {
            // Twilight — smooth cubic transition
            const t = (0.05 - cosAngle) / 0.17;
            darkness = t * t * (3 - 2 * t); // smoothstep
          } else {
            darkness = 1; // night
          }

          samples[sy * sw + sx] = darkness;
        }
      }

      // Bilinear upscale to full res and write pixels
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          // Find sample coords
          const sx = (x / w) * (sw - 1);
          const sy = (y / h) * (sh - 1);
          const sx0 = Math.floor(sx), sy0 = Math.floor(sy);
          const sx1 = Math.min(sx0 + 1, sw - 1), sy1 = Math.min(sy0 + 1, sh - 1);
          const fx = sx - sx0, fy = sy - sy0;

          // Bilinear interpolation
          const d00 = samples[sy0 * sw + sx0];
          const d10 = samples[sy0 * sw + sx1];
          const d01 = samples[sy1 * sw + sx0];
          const d11 = samples[sy1 * sw + sx1];
          const d = d00 * (1 - fx) * (1 - fy) + d10 * fx * (1 - fy) + d01 * (1 - fx) * fy + d11 * fx * fy;

          const idx = (y * w + x) * 4;
          // Night: deep navy blue-black tint via multiply blend
          // multiply: output = overlay * base / 255
          // So to darken, we output values < 255
          const brightness = Math.round(255 - d * 110); // night areas get ~57% brightness
          const blueTint = Math.round(255 - d * 85);    // slightly less blue reduction = blue tint

          data[idx] = brightness;         // R — darker
          data[idx + 1] = brightness;     // G — darker
          data[idx + 2] = blueTint;       // B — less dark = blue shift
          data[idx + 3] = 255;            // A — fully opaque (blend mode handles it)
        }
      }

      ctx.putImageData(imageData, 0, 0);
      animFrame = requestAnimationFrame(render);
    };

    animFrame = requestAnimationFrame(render);

    return () => {
      cancelled = true;
      if (animFrame) cancelAnimationFrame(animFrame);
      if (canvas && canvas.parentElement) {
        canvas.parentElement.removeChild(canvas);
      }
      dayNightCanvasRef.current = null;
    };
  }, [mapReady]);

  /* ══ ISS marker — always visible at all zoom levels ══ */
  useEffect(() => {
    if (!mapReady || !issPosition) return;
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;

    (async () => {
      if (is3dRef.current) {
        const { Marker3DElement } = await google.maps.importLibrary("maps3d");
        if (cancelled) return;

        const mkTpl = () => {
          const tpl = document.createElement("template");
          const img = document.createElement("img");
          img.src = issMarkerUrl();
          img.width = 72;
          img.height = 72;
          img.style.display = "block";
          img.title = `ISS — ${issPosition.alt.toFixed(0)} km altitude · ${(issPosition.velocity * 3600).toFixed(0)} km/h`;
          tpl.content.appendChild(img);
          return tpl;
        };

        if (issMarkerRef.current) {
          // Update position
          issMarkerRef.current.position = { lat: issPosition.lat, lng: issPosition.lng, altitude: 0 };
          while (issMarkerRef.current.firstChild) issMarkerRef.current.removeChild(issMarkerRef.current.firstChild);
          issMarkerRef.current.append(mkTpl());
        } else {
          const marker = new Marker3DElement({
            position: { lat: issPosition.lat, lng: issPosition.lng, altitude: 0 },
            altitudeMode: "CLAMP_TO_GROUND",
            collisionBehavior: "REQUIRED",
            zIndex: 99999,
          });
          marker.append(mkTpl());
          map.append(marker);
          issMarkerRef.current = marker;
        }
      } else {
        // 2D fallback
        const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
        if (cancelled) return;

        const div = document.createElement("div");
        div.innerHTML = issMarkerSvg();
        div.title = `ISS — ${issPosition.alt.toFixed(0)} km altitude`;

        if (issMarkerRef.current) {
          issMarkerRef.current.position = { lat: issPosition.lat, lng: issPosition.lng };
          issMarkerRef.current.content = div;
        } else {
          const marker = new AdvancedMarkerElement({
            map, position: { lat: issPosition.lat, lng: issPosition.lng },
            content: div, zIndex: 99999,
          });
          issMarkerRef.current = marker;
        }
      }
    })();

    return () => { cancelled = true; };
  }, [mapReady, issPosition]);

  /* ══ Fly to ISS on click ══ */
  useEffect(() => {
    if (!flyToISS || !mapReady || !issPosition) return;
    const map = mapRef.current;
    if (!map) return;

    if (is3dRef.current && map.flyCameraTo) {
      map.flyCameraTo({
        endCamera: {
          center: { lat: issPosition.lat, lng: issPosition.lng, altitude: 0 },
          range: 3000000,
          tilt: 35,
          heading: 0,
        },
        durationMillis: 2500,
      });
    } else if (map.panTo) {
      map.panTo({ lat: issPosition.lat, lng: issPosition.lng });
      if (map.setZoom) map.setZoom(4);
    }

    onFlyToISSComplete();
  }, [flyToISS, mapReady, issPosition, onFlyToISSComplete]);

  /* ══ Fly to Airport ══ */
  useEffect(() => {
    if (!flyToAirport || !mapReady) return;
    const map = mapRef.current;
    if (!map) return;

    // Immediately start pulsing the target airport
    const pulsingSet = new Set([flyToAirport.code]);
    updateAirportPulse(pulsingSet);

    if (is3dRef.current && map.flyCameraTo) {
      map.flyCameraTo({
        endCamera: {
          center: { lat: flyToAirport.lat, lng: flyToAirport.lng, altitude: 0 },
          range: 15000,
          tilt: 55,
          heading: 0,
        },
        durationMillis: 2500,
      });
    } else if (map.panTo) {
      map.panTo({ lat: flyToAirport.lat, lng: flyToAirport.lng });
      if (map.setZoom) map.setZoom(15);
    }

    onFlyToAirportComplete?.();
  }, [flyToAirport, mapReady, onFlyToAirportComplete, updateAirportPulse]);

  /* ══ Flights ══ */
  const updateFlights = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    (window as any).__skyway_flights = flights;
    const visible = flights.filter((f) => f.currentLat !== 0 && f.currentLng !== 0);
    const hasSelection = selectedRef.current !== null;
    const currentIds = new Set(visible.map((f) => f.id));
    const existing = markersRef.current;

    for (const [id, m] of existing) {
      if (!currentIds.has(id)) {
        try { m.remove?.(); m.setMap?.(null); } catch {}
        existing.delete(id);
      }
    }

    const zoomedIn = isZoomedInRef.current;

    if (is3dRef.current) {
      const { Marker3DInteractiveElement } = await google.maps.importLibrary("maps3d");

      for (const f of visible) {
        const isSel = f.id === selectedRef.current?.id;
        const isGround = f.onGround;
        const color = isSel ? "#00e5ff" : isGround ? "#fbbf24" : hasSelection ? "rgba(255,255,255,0.25)" : "#ffffff";
        // Scale up ground aircraft when zoomed into airport level
        const sz = isSel ? 68 : isGround ? (zoomedIn ? 52 : 36) : 56;
        const glow = isSel || (isGround && zoomedIn);
        const altStr = f.altitude >= 1000 ? `FL${Math.round(f.altitude / 100)}` : `${f.altitude} ft`;
        const tooltip = `${f.flightNumber} · ${f.aircraft || ""}\n${f.airline.name}\n${f.origin.code || "?"} → ${f.destination.code || "?"}\n${isGround ? "On Ground" : altStr} · ${f.speed} kts`;

        const mkIcon = () => {
          const tpl = document.createElement("template");
          const img = document.createElement("img");
          img.src = planeSvgUrl(color, f.heading, sz, glow);
          img.width = sz;
          img.height = sz;
          img.style.display = "block";
          img.title = tooltip;
          tpl.content.appendChild(img);
          return tpl;
        };

        const em = existing.get(f.id);
        if (em) {
          // Flat on surface — no altitude stacking
          em.position = { lat: f.currentLat, lng: f.currentLng, altitude: 0 };
          while (em.firstChild) em.removeChild(em.firstChild);
          em.append(mkIcon());
          em.zIndex = isSel ? 9999 : Math.round(f.altitude);
        } else {
          const marker = new Marker3DInteractiveElement({
            position: { lat: f.currentLat, lng: f.currentLng, altitude: 0 },
            altitudeMode: "CLAMP_TO_GROUND",
            collisionBehavior: "REQUIRED",
            zIndex: Math.round(f.altitude),
          });
          marker.append(mkIcon());
          marker.addEventListener("gmp-click", (e: any) => {
            e.stopPropagation();
            if (selectedRef.current?.id === f.id) onSelectRef.current(null);
            else {
              const found = (window as any).__skyway_flights?.find((x: Flight) => x.id === f.id);
              if (found) onSelectRef.current(found);
            }
          });
          map.append(marker);
          existing.set(f.id, marker);
        }
      }
    } else {
      const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
      for (const f of visible) {
        const isSel = f.id === selectedRef.current?.id;
        const isGround = f.onGround;
        const color = isSel ? "#00e5ff" : isGround ? "#fbbf24" : hasSelection ? "rgba(255,255,255,0.25)" : "#ffffff";
        const sz = isSel ? 68 : isGround ? (zoomedIn ? 52 : 36) : 56;
        const mkEl = () => {
          const div = document.createElement("div");
          div.innerHTML = planeSvg(color, f.heading, sz, isSel || (isGround && zoomedIn));
          div.style.cursor = "pointer";
          return div;
        };
        const em = existing.get(f.id);
        if (em) {
          em.position = { lat: f.currentLat, lng: f.currentLng };
          em.content = mkEl();
          em.zIndex = isSel ? 9999 : Math.round(f.altitude);
        } else {
          const marker = new AdvancedMarkerElement({
            map, position: { lat: f.currentLat, lng: f.currentLng },
            content: mkEl(), zIndex: Math.round(f.altitude),
          });
          marker.addListener("click", () => {
            if (selectedRef.current?.id === f.id) onSelectRef.current(null);
            else {
              const found = (window as any).__skyway_flights?.find((x: Flight) => x.id === f.id);
              if (found) onSelectRef.current(found);
            }
          });
          existing.set(f.id, marker);
        }
      }
    }
  }, [flights]);

  useEffect(() => {
    if (!mapReady) return;
    updateFlights();
  }, [mapReady, flights, selectedFlight, updateFlights]);

  /* ══ Selection: save camera → fly to plane → snap back on deselect ══ */
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;

    // Cleanup old route + popup
    routeRef.current.forEach((r) => { try { r.remove?.(); r.setMap?.(null); } catch {} });
    routeRef.current = [];
    if (popupRef.current) { try { popupRef.current.remove?.(); popupRef.current.setMap?.(null); } catch {} popupRef.current = null; }

    if (!selectedFlight) {
      // ── Deselected: snap camera back to saved position ──
      if (is3dRef.current && prevCameraRef.current && map.flyCameraTo) {
        map.flyCameraTo({
          endCamera: prevCameraRef.current,
          durationMillis: 1500,
        });
        prevCameraRef.current = null;
      }
      return;
    }

    const { origin, destination } = selectedFlight;
    let hasOrig = origin.lat !== 0 || origin.lng !== 0;
    let hasDest = destination.lat !== 0 || destination.lng !== 0;

    // If no origin/dest coords, project a line based on heading
    const projectedOrig = { lat: 0, lng: 0 };
    const projectedDest = { lat: 0, lng: 0 };
    if (!hasOrig || !hasDest) {
      const headRad = (selectedFlight.heading * Math.PI) / 180;
      const dist = 8; // degrees (~500nm)
      if (!hasOrig) {
        projectedOrig.lat = selectedFlight.currentLat - Math.cos(headRad) * dist;
        projectedOrig.lng = selectedFlight.currentLng - Math.sin(headRad) * dist;
        hasOrig = true;
      }
      if (!hasDest) {
        projectedDest.lat = selectedFlight.currentLat + Math.cos(headRad) * dist;
        projectedDest.lng = selectedFlight.currentLng + Math.sin(headRad) * dist;
        hasDest = true;
      }
    }
    const origLat = origin.lat !== 0 || origin.lng !== 0 ? origin.lat : projectedOrig.lat;
    const origLng = origin.lat !== 0 || origin.lng !== 0 ? origin.lng : projectedOrig.lng;
    const destLat = destination.lat !== 0 || destination.lng !== 0 ? destination.lat : projectedDest.lat;
    const destLng = destination.lat !== 0 || destination.lng !== 0 ? destination.lng : projectedDest.lng;

    (async () => {
      if (is3dRef.current) {
        // Save current camera before flying
        if (!prevCameraRef.current) {
          prevCameraRef.current = {
            center: map.center ? { lat: map.center.lat, lng: map.center.lng, altitude: map.center.altitude || 0 } : HOME_CAMERA.center,
            range: map.range || HOME_CAMERA.range,
            tilt: map.tilt ?? HOME_CAMERA.tilt,
            heading: map.heading ?? HOME_CAMERA.heading,
          };
        }

        // Fly to aircraft — heading 0 (north-up) so it doesn't twist
        if (map.flyCameraTo) {
          map.flyCameraTo({
            endCamera: {
              center: { lat: selectedFlight.currentLat, lng: selectedFlight.currentLng, altitude: 0 },
              range: 1500000,
              tilt: 45,
              heading: 0,  // Always north-up to prevent disorientation
            },
            durationMillis: 2000,
          });
        }

        const { Polyline3DElement, Marker3DElement } = await google.maps.importLibrary("maps3d");
        const acAlt = selectedFlight.altitude * 0.3048;
        console.log(`[SkyWay] Drawing route: orig=${hasOrig}(${origin.code}), dest=${hasDest}(${destination.code}), alt=${acAlt}m`);

        // Full route beam: origin → destination (one continuous bright arc)
        if (hasOrig && hasDest) {
          const pts = gcPoints(origLat, origLng, destLat, destLng, 100);
          // Arc up to cruise altitude at midpoint, back down at ends
          const coords = pts.map((p, i) => {
            const t = i / (pts.length - 1);
            const arcAlt = 1000 + (acAlt - 1000) * Math.sin(t * Math.PI);
            return { lat: p.lat, lng: p.lng, altitude: arcAlt };
          });

          // Outer glow (wide, subtle)
          const glowOuter = new Polyline3DElement({
            altitudeMode: "ABSOLUTE", strokeColor: "rgba(0,229,255,0.06)",
            strokeWidth: 28, coordinates: coords, drawsOccludedSegments: true,
          });
          map.append(glowOuter);
          routeRef.current.push(glowOuter);

          // Mid glow
          const glowMid = new Polyline3DElement({
            altitudeMode: "ABSOLUTE", strokeColor: "rgba(0,229,255,0.15)",
            strokeWidth: 14, coordinates: coords, drawsOccludedSegments: true,
          });
          map.append(glowMid);
          routeRef.current.push(glowMid);

          // Core beam (bright solid)
          const beam = new Polyline3DElement({
            altitudeMode: "ABSOLUTE", strokeColor: "#00e5ff",
            strokeWidth: 5, coordinates: coords, drawsOccludedSegments: true,
          });
          map.append(beam);
          routeRef.current.push(beam);

          // Inner white-hot center
          const core = new Polyline3DElement({
            altitudeMode: "ABSOLUTE", strokeColor: "rgba(255,255,255,0.6)",
            strokeWidth: 2, coordinates: coords, drawsOccludedSegments: true,
          });
          map.append(core);
          routeRef.current.push(core);
        } else if (hasOrig) {
          // Only origin known — draw origin → plane
          const pts = gcPoints(origLat, origLng, selectedFlight.currentLat, selectedFlight.currentLng, 60);
          const coords = pts.map((p, i) => ({
            lat: p.lat, lng: p.lng,
            altitude: 1000 + (acAlt - 1000) * (i / (pts.length - 1)),
          }));
          const line = new Polyline3DElement({
            altitudeMode: "ABSOLUTE", strokeColor: "#00e5ff",
            strokeWidth: 5, coordinates: coords, drawsOccludedSegments: true,
          });
          map.append(line);
          routeRef.current.push(line);
        } else if (hasDest) {
          // Only destination known — draw plane → dest
          const pts = gcPoints(selectedFlight.currentLat, selectedFlight.currentLng, destLat, destLng, 60);
          const coords = pts.map((p, i) => ({
            lat: p.lat, lng: p.lng,
            altitude: acAlt - (acAlt - 1000) * (i / (pts.length - 1)),
          }));
          const line = new Polyline3DElement({
            altitudeMode: "ABSOLUTE", strokeColor: "#00e5ff",
            strokeWidth: 5, coordinates: coords, drawsOccludedSegments: true,
          });
          map.append(line);
          routeRef.current.push(line);
        }

        // Info label above aircraft
        const altStr = selectedFlight.altitude >= 1000
          ? `FL${Math.round(selectedFlight.altitude / 100)}`
          : `${selectedFlight.altitude.toLocaleString()} ft`;
        const labelText = `${selectedFlight.flightNumber} · ${selectedFlight.aircraft || ""}\n${selectedFlight.origin.code} → ${selectedFlight.destination.code}\n${altStr} · ${selectedFlight.speed} kts`;
        const popupMarker = new Marker3DElement({
          position: { lat: selectedFlight.currentLat, lng: selectedFlight.currentLng, altitude: acAlt + 5000 },
          altitudeMode: "ABSOLUTE", collisionBehavior: "REQUIRED", zIndex: 10000,
          label: labelText,
        });
        map.append(popupMarker);
        popupRef.current = popupMarker;

      } else {
        // 2D
        map.panTo({ lat: selectedFlight.currentLat, lng: selectedFlight.currentLng });
        if (map.getZoom() < 5) map.setZoom(5);

        // Full route: origin → destination
        if (hasOrig && hasDest) {
          const allPts = gcPoints(origLat, origLng, destLat, destLng, 80);
          // Glow
          const glow = new google.maps.Polyline({
            path: allPts, strokeColor: "#00e5ff", strokeWeight: 10,
            strokeOpacity: 0.15, geodesic: true, map,
          });
          routeRef.current.push(glow);
          // Core
          const line = new google.maps.Polyline({
            path: allPts, strokeColor: "#00e5ff", strokeWeight: 3,
            strokeOpacity: 0.9, geodesic: true, map,
          });
          routeRef.current.push(line);
        } else {
          const allPts: any[] = [];
          if (hasOrig) allPts.push(...gcPoints(origLat, origLng, selectedFlight.currentLat, selectedFlight.currentLng, 40));
          allPts.push({ lat: selectedFlight.currentLat, lng: selectedFlight.currentLng });
          if (hasDest) allPts.push(...gcPoints(selectedFlight.currentLat, selectedFlight.currentLng, destLat, destLng, 40));
          if (allPts.length >= 2) {
            const line = new google.maps.Polyline({
              path: allPts, strokeColor: "#00e5ff", strokeWeight: 3,
              strokeOpacity: 0.7, geodesic: true, map,
            });
            routeRef.current.push(line);
          }
        }
        const iw = new google.maps.InfoWindow({
          content: flightPopupHtml(selectedFlight),
          position: { lat: selectedFlight.currentLat, lng: selectedFlight.currentLng },
        });
        iw.open(map);
        popupRef.current = iw;
      }
    })();
  }, [mapReady, selectedFlight]);

  /* ══ Callsign highlight: pulse ring + camera pan + label ══ */
  const highlightRef = useRef<any[]>([]);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Cleanup previous highlights
    highlightRef.current.forEach((el) => { try { el.remove?.(); el.setMap?.(null); } catch {} });
    highlightRef.current = [];
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);

    if (!mapReady || !highlightedCallsign) return;
    const map = mapRef.current;
    if (!map) return;

    // Find the marker matching this callsign
    const flight = flights.find(
      (f) => f.callsign === highlightedCallsign || f.flightNumber === highlightedCallsign
    );
    if (!flight) return;

    const marker = markersRef.current.get(flight.id);
    if (marker) {
      marker.zIndex = 99999;
    }

    (async () => {
      // Pan camera to the aircraft (don't change zoom)
      if (is3dRef.current && map.flyCameraTo) {
        map.flyCameraTo({
          endCamera: {
            center: { lat: flight.currentLat, lng: flight.currentLng, altitude: 0 },
            range: map.range || 2000000,
            tilt: map.tilt ?? 30,
            heading: map.heading ?? 0,
          },
          durationMillis: 1200,
        });
      } else if (map.panTo) {
        map.panTo({ lat: flight.currentLat, lng: flight.currentLng });
      }

      // Add label above aircraft
      if (is3dRef.current) {
        const { Marker3DElement } = await google.maps.importLibrary("maps3d");
        const altStr = flight.altitude >= 1000
          ? `FL${Math.round(flight.altitude / 100)}`
          : `${flight.altitude} ft`;
        const label = new Marker3DElement({
          position: { lat: flight.currentLat, lng: flight.currentLng, altitude: flight.altitude * 0.3048 + 3000 },
          altitudeMode: "ABSOLUTE",
          collisionBehavior: "REQUIRED",
          zIndex: 100000,
          label: `${highlightedCallsign} · ${altStr}`,
        });
        map.append(label);
        highlightRef.current.push(label);
      }
    })();

    // Auto-clear after 6 seconds
    highlightTimerRef.current = setTimeout(() => {
      highlightRef.current.forEach((el) => { try { el.remove?.(); el.setMap?.(null); } catch {} });
      highlightRef.current = [];
      if (marker) marker.zIndex = Math.round(flight.altitude);
      onHighlightComplete?.();
    }, 6000);

    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, [mapReady, highlightedCallsign, flights, onHighlightComplete]);

  return (
    <>
      <style>{`
        .skyway-map-container canvas,
        .skyway-map-container .gm-style > div > div > div > div > canvas,
        .skyway-map-container iframe,
        .skyway-map-container img:not([data-skyway-marker]) {
          filter: brightness(0.55) saturate(0.5) contrast(1.15);
        }
        /* Keep markers and overlays at full brightness */
        .skyway-map-container gmp-marker-3d,
        .skyway-map-container gmp-marker-3d-interactive,
        .skyway-map-container gmp-polyline-3d,
        .skyway-map-container .gm-style-iw,
        .skyway-map-container [data-skyway-marker] {
          filter: none !important;
        }
      `}</style>
      <div ref={containerRef} className="absolute inset-0 z-0 skyway-map-container" />
    </>
  );
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Flight, Airport } from "@/lib/types";

interface MapProps {
  flights: Flight[];
  airports: Airport[];
  selectedFlight: Flight | null;
  onSelectFlight: (flight: Flight | null) => void;
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

/* ── Plane SVG — clean white commercial aircraft silhouette ── */
function planeSvg(color: string, heading: number, size = 32, glow = false): string {
  const glowFilter = glow
    ? `<defs><filter id="g"><feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="${color}" flood-opacity="0.9"/></filter></defs>`
    : `<defs><filter id="s"><feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="rgba(0,0,0,0.8)" flood-opacity="0.6"/></filter></defs>`;
  const filterAttr = glow ? ' filter="url(#g)"' : ' filter="url(#s)"';
  // Realistic top-down airliner: fuselage + swept wings + horizontal stabilizers
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
    ${glowFilter}
    <g transform="rotate(${heading}, 32, 32)"${filterAttr}>
      <path d="M32 6 C33 6 34 8 34 12 L34.5 22 L53 34 L53 37 L34.5 30 L34.5 48 L40 53 L40 55.5 L32 52 L24 55.5 L24 53 L29.5 48 L29.5 30 L11 37 L11 34 L29.5 22 L30 12 C30 8 31 6 32 6Z" fill="${color}" stroke="rgba(0,0,0,0.4)" stroke-width="0.5"/>
    </g>
  </svg>`;
}

function planeSvgUrl(color: string, heading: number, size = 32, glow = false): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(planeSvg(color, heading, size, glow))}`;
}

/* ── Airport marker SVG — prominent icon with large IATA code ── */
function airportMarkerSvg(code: string): string {
  const w = 100, h = 64, cx = w / 2;
  // Airport runway icon + bold IATA code below
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <radialGradient id="ag_${code}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="rgba(0,229,255,0.9)"/>
        <stop offset="40%" stop-color="rgba(0,229,255,0.4)"/>
        <stop offset="100%" stop-color="rgba(0,229,255,0)"/>
      </radialGradient>
      <filter id="af_${code}"><feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#00e5ff" flood-opacity="0.7"/></filter>
    </defs>
    <circle cx="${cx}" cy="18" r="18" fill="url(#ag_${code})"/>
    <circle cx="${cx}" cy="18" r="7" fill="rgba(0,229,255,0.25)" stroke="#00e5ff" stroke-width="1.5"/>
    <circle cx="${cx}" cy="18" r="3" fill="#00e5ff"/>
    <circle cx="${cx}" cy="18" r="1.5" fill="#fff"/>
    <text x="${cx}" y="${h - 4}" text-anchor="middle" font-family="'SF Pro','Inter',-apple-system,BlinkMacSystemFont,sans-serif" font-size="16" font-weight="900" fill="#ffffff" letter-spacing="1.5" filter="url(#af_${code})">${code}</text>
  </svg>`;
}

function airportMarkerUrl(code: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(airportMarkerSvg(code))}`;
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

export default function FlightMap({ flights, airports, selectedFlight, onSelectFlight }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const is3dRef = useRef(false);
  const markersRef = useRef<Map<string, any>>(new Map());
  const airportMarkersRef = useRef<any[]>([]);
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
      if (containerRef.current) try { containerRef.current.innerHTML = ""; } catch {}
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  /* ══ Airport glowing dots ══ */
  useEffect(() => {
    if (!mapReady || !airports.length) return;
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;

    (async () => {
      airportMarkersRef.current.forEach((m) => { try { m.remove?.(); m.setMap?.(null); } catch {} });
      airportMarkersRef.current = [];
      if (cancelled) return;

      const majors = airports.filter((a) => MAJOR_AIRPORTS.has(a.code));
      console.log(`Adding ${majors.length} major airport markers`);

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
          // Custom SVG template with IATA code
          const tpl = document.createElement("template");
          const img = document.createElement("img");
          img.src = airportMarkerUrl(apt.code);
          img.width = 100;
          img.height = 64;
          img.style.display = "block";
          img.title = `${apt.code} — ${apt.name}, ${apt.city}`;
          tpl.content.appendChild(img);
          marker.append(tpl);
          map.append(marker);
          airportMarkersRef.current.push(marker);
        }
      } else {
        const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
        if (cancelled) return;
        for (const apt of majors) {
          const div = document.createElement("div");
          div.innerHTML = airportMarkerSvg(apt.code);
          div.title = `${apt.code} — ${apt.name}, ${apt.city}`;
          const m = new AdvancedMarkerElement({ map, position: { lat: apt.lat, lng: apt.lng }, content: div, zIndex: 5000 });
          airportMarkersRef.current.push(m);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [mapReady, airports]);

  /* ══ Flights ══ */
  const updateFlights = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    (window as any).__skyway_flights = flights;
    const airborne = flights.filter((f) => !f.onGround && f.currentLat !== 0 && f.currentLng !== 0);
    const hasSelection = selectedRef.current !== null;
    const currentIds = new Set(airborne.map((f) => f.id));
    const existing = markersRef.current;

    for (const [id, m] of existing) {
      if (!currentIds.has(id)) {
        try { m.remove?.(); m.setMap?.(null); } catch {}
        existing.delete(id);
      }
    }

    if (is3dRef.current) {
      const { Marker3DInteractiveElement } = await google.maps.importLibrary("maps3d");

      for (const f of airborne) {
        const isSel = f.id === selectedRef.current?.id;
        const color = isSel ? "#00e5ff" : hasSelection ? "rgba(255,255,255,0.12)" : "#ffffff";
        const sz = isSel ? 52 : 38;
        const altStr = f.altitude >= 1000 ? `FL${Math.round(f.altitude / 100)}` : `${f.altitude} ft`;
        const tooltip = `${f.flightNumber} · ${f.aircraft || ""}\n${f.airline.name}\n${f.origin.code || "?"} → ${f.destination.code || "?"}\n${altStr} · ${f.speed} kts`;

        const mkIcon = () => {
          const tpl = document.createElement("template");
          const img = document.createElement("img");
          img.src = planeSvgUrl(color, f.heading, sz, isSel);
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
      for (const f of airborne) {
        const isSel = f.id === selectedRef.current?.id;
        const color = isSel ? "#00e5ff" : hasSelection ? "rgba(255,255,255,0.12)" : "#ffffff";
        const sz = isSel ? 52 : 38;
        const mkEl = () => {
          const div = document.createElement("div");
          div.innerHTML = planeSvg(color, f.heading, sz, isSel);
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

        // Traveled path: origin → aircraft
        if (hasOrig) {
          const pts = gcPoints(origLat, origLng, selectedFlight.currentLat, selectedFlight.currentLng, 60);
          const coords = pts.map((p, i) => ({
            lat: p.lat, lng: p.lng,
            altitude: 1000 + (acAlt - 1000) * (i / pts.length),
          }));
          const traveled = new Polyline3DElement({
            altitudeMode: "ABSOLUTE", strokeColor: "#00e5ff",
            strokeWidth: 5, coordinates: coords, drawsOccludedSegments: true,
          });
          map.append(traveled);
          routeRef.current.push(traveled);

          // Glow trail
          const glowTrail = new Polyline3DElement({
            altitudeMode: "ABSOLUTE", strokeColor: "rgba(0,229,255,0.1)",
            strokeWidth: 16, coordinates: coords, drawsOccludedSegments: true,
          });
          map.append(glowTrail);
          routeRef.current.push(glowTrail);
        }

        // Remaining path: aircraft → destination
        if (hasDest) {
          const pts = gcPoints(selectedFlight.currentLat, selectedFlight.currentLng, destLat, destLng, 60);
          const coords = pts.map((p, i) => ({
            lat: p.lat, lng: p.lng,
            altitude: acAlt + (1000 - acAlt) * (i / pts.length),
          }));
          const remaining = new Polyline3DElement({
            altitudeMode: "ABSOLUTE", strokeColor: "rgba(59,184,232,0.3)",
            strokeWidth: 3, coordinates: coords, drawsOccludedSegments: true,
          });
          map.append(remaining);
          routeRef.current.push(remaining);
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
        const iw = new google.maps.InfoWindow({
          content: flightPopupHtml(selectedFlight),
          position: { lat: selectedFlight.currentLat, lng: selectedFlight.currentLng },
        });
        iw.open(map);
        popupRef.current = iw;
      }
    })();
  }, [mapReady, selectedFlight]);

  return (
    <>
      <div ref={containerRef} className="absolute inset-0 z-0" style={{ filter: "brightness(0.55) saturate(0.65) contrast(1.1)" }} />
    </>
  );
}

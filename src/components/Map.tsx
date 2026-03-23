"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Flight, Airport } from "@/lib/types";

interface MapProps {
  flights: Flight[];
  airports: Airport[];
  selectedFlight: Flight | null;
  onSelectFlight: (flight: Flight | null) => void;
}

/* ---------- Plane SVG ---------- */
function planeSvg(color: string, heading: number, size = 28): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
    <g transform="rotate(${heading}, 32, 32)">
      <path d="M32 6 L35 18 L51 34 L49 37 L35 31 L34 48 L40 54 L39 58 L33 52 L32 60 L31 52 L25 58 L24 54 L30 48 L29 31 L15 37 L13 34 L29 18 Z" fill="${color}"/>
    </g>
  </svg>`;
}

function planeSvgUrl(color: string, heading: number, size = 28): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(planeSvg(color, heading, size))}`;
}

/* ---------- Script loader ---------- */
const API_KEY = "AIzaSyD4zUAl2Ox3sqe2w7izi_OkFT6C-P3yBhU";

let scriptPromise: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (typeof google !== "undefined" && google.maps?.importLibrary) { resolve(); return; }

    // Use Google's recommended inline bootstrap that sets up importLibrary
    // before the main script loads (required for v=beta / dynamic libraries)
    (window as any).initMap = () => resolve();

    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&v=beta&callback=initMap`;
    s.async = true;
    s.defer = true;
    s.onerror = () => reject(new Error("Google Maps script failed to load"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const google: any;

export default function FlightMap({ flights, airports, selectedFlight, onSelectFlight }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const is3dRef = useRef(false);
  const markersRef = useRef<Map<string, any>>(new Map());
  const airportMarkersRef = useRef<any[]>([]);
  const routeRef = useRef<any>(null);
  const onSelectRef = useRef(onSelectFlight);
  onSelectRef.current = onSelectFlight;
  const selectedRef = useRef(selectedFlight);
  selectedRef.current = selectedFlight;

  // Use state so changes trigger re-renders and downstream effects
  const [mapReady, setMapReady] = useState(false);

  // Init map — runs once
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await loadGoogleMaps();
      } catch (e) {
        console.error("Google Maps script load failed:", e);
        return;
      }

      if (cancelled || !containerRef.current) return;

      // Try 3D first
      try {
        const { Map3DElement } = await google.maps.importLibrary("maps3d");
        const map3d = new Map3DElement({
          center: { lat: 30, lng: -40, altitude: 0 },
          range: 25000000,
          tilt: 0,
          heading: 0,
          mode: "HYBRID",
        });
        map3d.style.width = "100%";
        map3d.style.height = "100%";
        if (cancelled) return;
        containerRef.current!.appendChild(map3d);
        mapRef.current = map3d;
        is3dRef.current = true;
        setMapReady(true);
        console.log("Google Maps 3D initialized");
      } catch (err) {
        console.warn("3D Maps failed, trying 2D fallback:", err);
        try {
          const { Map: GMap } = await google.maps.importLibrary("maps");
          if (cancelled || !containerRef.current) return;
          const map2d = new GMap(containerRef.current, {
            center: { lat: 30, lng: -40 },
            zoom: 3,
            mapTypeId: "hybrid",
            disableDefaultUI: true,
            zoomControl: true,
          });
          mapRef.current = map2d;
          is3dRef.current = false;
          setMapReady(true);
          console.log("Google Maps 2D fallback initialized");
        } catch (err2) {
          console.error("Both 3D and 2D failed:", err2);
        }
      }
    })();

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => { try { m.remove?.(); m.setMap?.(null); } catch {} });
      markersRef.current.clear();
      airportMarkersRef.current.forEach((m) => { try { m.remove?.(); m.setMap?.(null); } catch {} });
      airportMarkersRef.current = [];
      if (containerRef.current) {
        try { containerRef.current.innerHTML = ""; } catch {}
      }
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Update airports when map is ready
  useEffect(() => {
    if (!mapReady || !airports.length) return;
    const map = mapRef.current;
    if (!map) return;

    let cancelled = false;

    (async () => {
      // Remove old
      airportMarkersRef.current.forEach((m) => { try { m.remove?.(); m.setMap?.(null); } catch {} });
      airportMarkersRef.current = [];

      if (cancelled) return;

      if (is3dRef.current) {
        const { Marker3DElement } = await google.maps.importLibrary("maps3d");
        if (cancelled) return;
        for (const apt of airports) {
          const m = new Marker3DElement({
            position: { lat: apt.lat, lng: apt.lng, altitude: 0 },
            altitudeMode: "CLAMP_TO_GROUND",
            label: apt.code,
            collisionBehavior: "OPTIONAL_AND_HIDES_LOWER_PRIORITY",
          });
          map.append(m);
          airportMarkersRef.current.push(m);
        }
      } else {
        const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
        if (cancelled) return;
        for (const apt of airports) {
          const el = document.createElement("div");
          el.style.cssText = "color:#2cc855;font-size:10px;font-weight:700;text-shadow:0 0 4px #000;";
          el.textContent = apt.code;
          const m = new AdvancedMarkerElement({ map, position: { lat: apt.lat, lng: apt.lng }, content: el });
          airportMarkersRef.current.push(m);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [mapReady, airports]);

  // Update flights
  const updateFlights = useCallback(async () => {
    const map = mapRef.current;
    if (!map) return;

    (window as any).__skyway_flights = flights;

    const airborne = flights.filter((f) => !f.onGround && f.currentLat !== 0 && f.currentLng !== 0);
    const hasSelection = selectedRef.current !== null;
    const currentIds = new Set(airborne.map((f) => f.id));
    const existing = markersRef.current;

    // Remove stale
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
        const color = isSel ? "#00e5ff" : hasSelection ? "rgba(225,175,55,0.3)" : "rgba(225,175,55,0.92)";
        const sz = isSel ? 36 : 28;

        const mkIcon = () => {
          const tpl = document.createElement("template");
          const img = document.createElement("img");
          img.src = planeSvgUrl(color, f.heading, sz);
          img.width = sz;
          img.height = sz;
          img.style.display = "block";
          tpl.content.appendChild(img);
          return tpl;
        };

        const em = existing.get(f.id);
        if (em) {
          em.position = { lat: f.currentLat, lng: f.currentLng, altitude: f.altitude * 0.3048 };
          while (em.firstChild) em.removeChild(em.firstChild);
          em.append(mkIcon());
          em.zIndex = isSel ? 9999 : Math.round(f.altitude);
        } else {
          const marker = new Marker3DInteractiveElement({
            position: { lat: f.currentLat, lng: f.currentLng, altitude: f.altitude * 0.3048 },
            altitudeMode: "ABSOLUTE",
            collisionBehavior: "REQUIRED",
            zIndex: isSel ? 9999 : Math.round(f.altitude),
          });
          marker.append(mkIcon());
          marker.addEventListener("gmp-click", (e: any) => {
            e.stopPropagation();
            if (selectedRef.current?.id === f.id) {
              onSelectRef.current(null);
            } else {
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
        const color = isSel ? "#00e5ff" : hasSelection ? "rgba(225,175,55,0.3)" : "rgba(225,175,55,0.92)";
        const sz = isSel ? 36 : 28;

        const mkEl = () => {
          const div = document.createElement("div");
          div.innerHTML = planeSvg(color, f.heading, sz);
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
            map,
            position: { lat: f.currentLat, lng: f.currentLng },
            content: mkEl(),
            zIndex: isSel ? 9999 : Math.round(f.altitude),
          });
          marker.addListener("click", () => {
            if (selectedRef.current?.id === f.id) {
              onSelectRef.current(null);
            } else {
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

  // Selection: camera + route
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;

    // Remove old route
    if (routeRef.current) {
      try { routeRef.current.remove?.(); routeRef.current.setMap?.(null); } catch {}
      routeRef.current = null;
    }

    if (!selectedFlight) return;

    const { origin, destination } = selectedFlight;
    const hasOrig = origin.lat !== 0 || origin.lng !== 0;
    const hasDest = destination.lat !== 0 || destination.lng !== 0;

    (async () => {
      if (is3dRef.current) {
        if (map.flyCameraTo) {
          map.flyCameraTo({
            endCamera: {
              center: { lat: selectedFlight.currentLat, lng: selectedFlight.currentLng, altitude: 0 },
              range: 800000,
              tilt: 45,
              heading: selectedFlight.heading,
            },
            durationMillis: 1500,
          });
        }

        const { Polyline3DElement } = await google.maps.importLibrary("maps3d");
        const coords: any[] = [];
        if (hasOrig) coords.push({ lat: origin.lat, lng: origin.lng, altitude: 1000 });
        coords.push({ lat: selectedFlight.currentLat, lng: selectedFlight.currentLng, altitude: selectedFlight.altitude * 0.3048 });
        if (hasDest) coords.push({ lat: destination.lat, lng: destination.lng, altitude: 1000 });

        if (coords.length >= 2) {
          const line = new Polyline3DElement({
            altitudeMode: "ABSOLUTE",
            strokeColor: "#00e5ff",
            strokeWidth: 4,
            coordinates: coords,
            drawsOccludedSegments: true,
          });
          map.append(line);
          routeRef.current = line;
        }
      } else {
        map.panTo({ lat: selectedFlight.currentLat, lng: selectedFlight.currentLng });
        if (map.getZoom() < 5) map.setZoom(5);

        const path: any[] = [];
        if (hasOrig) path.push({ lat: origin.lat, lng: origin.lng });
        path.push({ lat: selectedFlight.currentLat, lng: selectedFlight.currentLng });
        if (hasDest) path.push({ lat: destination.lat, lng: destination.lng });

        if (path.length >= 2) {
          const line = new google.maps.Polyline({
            path,
            strokeColor: "#00e5ff",
            strokeWeight: 2,
            strokeOpacity: 0.7,
            geodesic: true,
            map,
          });
          routeRef.current = line;
        }
      }
    })();
  }, [mapReady, selectedFlight]);

  return <div ref={containerRef} className="absolute inset-0 z-0" />;
}

"use client";

import { useEffect, useRef } from "react";
import { Flight, Airport } from "@/lib/types";

interface MapProps {
  flights: Flight[];
  airports: Airport[];
  selectedFlight: Flight | null;
  onSelectFlight: (flight: Flight | null) => void;
}

/* ---------- Plane SVG builder (FlightAware golden silhouette) ---------- */
function planeSvgDataUrl(color: string, heading: number, size = 28): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
    <g transform="rotate(${heading}, 32, 32)">
      <path d="M32 6 L35 18 L51 34 L49 37 L35 31 L34 48 L40 54 L39 58 L33 52 L32 60 L31 52 L25 58 L24 54 L30 48 L29 31 L15 37 L13 34 L29 18 Z"
        fill="${color}" />
    </g>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/* ---------- Script loader ---------- */
let scriptPromise: Promise<void> | null = null;
function loadGoogleMaps(apiKey: string): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (typeof google !== "undefined" && google.maps) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=alpha&libraries=maps3d,marker&loading=async`;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
declare const google: any;

export default function FlightMap({ flights, airports, selectedFlight, onSelectFlight }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapElRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const airportMarkersRef = useRef<any[]>([]);
  const routeLineRef = useRef<any>(null);
  const onSelectRef = useRef(onSelectFlight);
  onSelectRef.current = onSelectFlight;
  const selectedRef = useRef(selectedFlight);
  selectedRef.current = selectedFlight;
  const initRef = useRef(false);

  // Initialize 3D map
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!apiKey) return;

    (async () => {
      await loadGoogleMaps(apiKey);

      const { Map3DElement } = await google.maps.importLibrary("maps3d");

      const mapEl = new Map3DElement({
        center: { lat: 30, lng: -40, altitude: 0 },
        range: 25000000,
        tilt: 0,
        heading: 0,
        mode: "HYBRID",
      });

      mapEl.style.width = "100%";
      mapEl.style.height = "100%";

      containerRef.current?.appendChild(mapEl);
      mapElRef.current = mapEl;
    })();

    return () => {
      if (mapElRef.current && containerRef.current) {
        try { containerRef.current.removeChild(mapElRef.current); } catch {}
      }
      mapElRef.current = null;
      markersRef.current.clear();
      airportMarkersRef.current = [];
      initRef.current = false;
    };
  }, []);

  // Update airports
  useEffect(() => {
    const mapEl = mapElRef.current;
    if (!mapEl || !airports.length) return;

    const timer = setTimeout(async () => {
      if (!mapElRef.current) return;
      const { Marker3DElement } = await google.maps.importLibrary("maps3d");

      // Remove old airport markers
      for (const m of airportMarkersRef.current) {
        try { m.remove(); } catch {}
      }

      const newMarkers: any[] = [];
      for (const apt of airports) {
        const marker = new Marker3DElement({
          position: { lat: apt.lat, lng: apt.lng, altitude: 0 },
          altitudeMode: "CLAMP_TO_GROUND",
          label: apt.code,
          collisionBehavior: "OPTIONAL_AND_HIDES_LOWER_PRIORITY",
        });
        mapElRef.current.append(marker);
        newMarkers.push(marker);
      }
      airportMarkersRef.current = newMarkers;
    }, 500);

    return () => clearTimeout(timer);
  }, [airports]);

  // Update flights
  useEffect(() => {
    const mapEl = mapElRef.current;
    if (!mapEl) return;

    const timer = setTimeout(async () => {
      if (!mapElRef.current) return;
      const { Marker3DInteractiveElement } = await google.maps.importLibrary("maps3d");

      const airborne = flights.filter(
        (f) => !f.onGround && f.currentLat !== 0 && f.currentLng !== 0
      );

      const hasSelection = selectedRef.current !== null;
      const currentIds = new Set(airborne.map((f) => f.id));
      const existingMarkers = markersRef.current;

      // Remove markers for flights no longer present
      for (const [id, marker] of existingMarkers) {
        if (!currentIds.has(id)) {
          try { marker.remove(); } catch {}
          existingMarkers.delete(id);
        }
      }

      // Add / update markers
      for (const f of airborne) {
        const isSelected = f.id === selectedRef.current?.id;
        const color = isSelected
          ? "#00e5ff"
          : hasSelection
            ? "rgba(225,175,55,0.3)"
            : "rgba(225,175,55,0.92)";
        const size = isSelected ? 36 : 28;

        const existing = existingMarkers.get(f.id);
        if (existing) {
          // Update position and icon
          existing.position = { lat: f.currentLat, lng: f.currentLng, altitude: f.altitude * 0.3048 };
          // Rebuild icon template
          const tpl = document.createElement("template");
          const img = document.createElement("img");
          img.src = planeSvgDataUrl(color, f.heading, size);
          img.width = size;
          img.height = size;
          img.style.display = "block";
          tpl.content.appendChild(img);
          // Clear and re-append
          while (existing.firstChild) existing.removeChild(existing.firstChild);
          existing.append(tpl);
          existing.zIndex = isSelected ? 9999 : Math.round(f.altitude);
        } else {
          // Create new marker
          const marker = new Marker3DInteractiveElement({
            position: { lat: f.currentLat, lng: f.currentLng, altitude: f.altitude * 0.3048 },
            altitudeMode: "ABSOLUTE",
            collisionBehavior: "REQUIRED",
            zIndex: isSelected ? 9999 : Math.round(f.altitude),
          });

          const tpl = document.createElement("template");
          const img = document.createElement("img");
          img.src = planeSvgDataUrl(color, f.heading, size);
          img.width = size;
          img.height = size;
          img.style.display = "block";
          tpl.content.appendChild(img);
          marker.append(tpl);

          marker.addEventListener("gmp-click", (e: any) => {
            e.stopPropagation();
            const sel = selectedRef.current;
            if (sel?.id === f.id) {
              onSelectRef.current(null);
            } else {
              const found = (window as any).__skyway_flights?.find((x: Flight) => x.id === f.id);
              if (found) onSelectRef.current(found);
            }
          });

          mapElRef.current.append(marker);
          existingMarkers.set(f.id, marker);
        }
      }

      // Store flights globally for click handler
      (window as any).__skyway_flights = flights;
    }, 100);

    return () => clearTimeout(timer);
  }, [flights, selectedFlight]);

  // Handle selection: fly camera + route line
  useEffect(() => {
    const mapEl = mapElRef.current;
    if (!mapEl) return;

    const timer = setTimeout(async () => {
      if (!mapElRef.current) return;
      const { Polyline3DElement } = await google.maps.importLibrary("maps3d");

      // Remove old route
      if (routeLineRef.current) {
        try { routeLineRef.current.remove(); } catch {}
        routeLineRef.current = null;
      }

      if (!selectedFlight) return;

      // Fly camera to selected flight
      const target = {
        lat: selectedFlight.currentLat,
        lng: selectedFlight.currentLng,
        altitude: 0,
      };

      if (mapElRef.current.flyCameraTo) {
        mapElRef.current.flyCameraTo({
          endCamera: {
            center: target,
            range: 800000,
            tilt: 45,
            heading: selectedFlight.heading,
          },
          durationMillis: 1500,
        });
      }

      // Draw route line
      const { origin, destination } = selectedFlight;
      const hasOrig = origin.lat !== 0 || origin.lng !== 0;
      const hasDest = destination.lat !== 0 || destination.lng !== 0;
      const coords: { lat: number; lng: number; altitude: number }[] = [];

      if (hasOrig) {
        coords.push({ lat: origin.lat, lng: origin.lng, altitude: 1000 });
      }
      coords.push({
        lat: selectedFlight.currentLat,
        lng: selectedFlight.currentLng,
        altitude: selectedFlight.altitude * 0.3048,
      });
      if (hasDest) {
        coords.push({ lat: destination.lat, lng: destination.lng, altitude: 1000 });
      }

      if (coords.length >= 2) {
        const polyline = new Polyline3DElement({
          altitudeMode: "ABSOLUTE",
          strokeColor: "#00e5ff",
          strokeWidth: 4,
          coordinates: coords,
          drawsOccludedSegments: true,
        });
        mapElRef.current.append(polyline);
        routeLineRef.current = polyline;
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [selectedFlight]);

  return <div ref={containerRef} className="absolute inset-0 z-0" />;
}

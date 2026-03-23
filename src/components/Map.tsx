"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Flight, Airport } from "@/lib/types";

interface MapProps {
  flights: Flight[];
  airports: Airport[];
  selectedFlight: Flight | null;
  onSelectFlight: (flight: Flight | null) => void;
}

// Generate a clean plane icon on canvas — FlightAware style
function createPlaneImage(color: string, size: number): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.translate(size / 2, size / 2);
  const s = size * 0.38;

  ctx.beginPath();
  ctx.moveTo(0, -s * 0.85);
  ctx.lineTo(s * 0.10, -s * 0.55);
  ctx.lineTo(s * 0.75, s * 0.05);
  ctx.lineTo(s * 0.70, s * 0.15);
  ctx.lineTo(s * 0.10, -s * 0.05);
  ctx.lineTo(s * 0.08, s * 0.50);
  ctx.lineTo(s * 0.32, s * 0.72);
  ctx.lineTo(s * 0.28, s * 0.82);
  ctx.lineTo(s * 0.05, s * 0.65);
  ctx.lineTo(0, s * 0.85);
  ctx.lineTo(-s * 0.05, s * 0.65);
  ctx.lineTo(-s * 0.28, s * 0.82);
  ctx.lineTo(-s * 0.32, s * 0.72);
  ctx.lineTo(-s * 0.08, s * 0.50);
  ctx.lineTo(-s * 0.10, -s * 0.05);
  ctx.lineTo(-s * 0.70, s * 0.15);
  ctx.lineTo(-s * 0.75, s * 0.05);
  ctx.lineTo(-s * 0.10, -s * 0.55);
  ctx.closePath();

  ctx.fillStyle = color;
  ctx.fill();

  return ctx.getImageData(0, 0, size, size);
}

// Dark basemap style spec using free CartoDB tiles (no API key needed)
const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: "SkyWay Dark",
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    "carto-dark": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution: "&copy; CartoDB &copy; OpenStreetMap contributors",
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#050d1a" },
    },
    {
      id: "carto-tiles",
      type: "raster",
      source: "carto-dark",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

export default function FlightMap({ flights, airports, selectedFlight, onSelectFlight }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const onSelectRef = useRef(onSelectFlight);
  onSelectRef.current = onSelectFlight;
  const selectedRef = useRef(selectedFlight);
  selectedRef.current = selectedFlight;

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_STYLE,
      center: [-95, 38],
      zoom: 3.2,
      minZoom: 1.5,
      maxZoom: 18,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "bottom-right");

    map.on("load", () => {
      // Generate plane icon images
      const planeNormal = createPlaneImage("rgba(225, 175, 55, 0.92)", 64);
      const planeSelected = createPlaneImage("rgba(0, 229, 255, 1.0)", 64);
      const planeDimmed = createPlaneImage("rgba(225, 175, 55, 0.25)", 64);

      map.addImage("plane-normal", planeNormal, { sdf: false });
      map.addImage("plane-selected", planeSelected, { sdf: false });
      map.addImage("plane-dimmed", planeDimmed, { sdf: false });

      // --- Airport layers ---
      map.addSource("airports", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "airport-glow",
        type: "circle",
        source: "airports",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 5, 6, 9, 10, 13],
          "circle-color": "rgba(40, 200, 80, 0.15)",
          "circle-blur": 1,
        },
      });

      map.addLayer({
        id: "airport-dots",
        type: "circle",
        source: "airports",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 2.5, 6, 4, 10, 6],
          "circle-color": "#2cc855",
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(40, 200, 80, 0.5)",
        },
      });

      map.addLayer({
        id: "airport-labels",
        type: "symbol",
        source: "airports",
        minzoom: 3,
        layout: {
          "text-field": ["get", "code"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 3, 10, 8, 13],
          "text-offset": [0, 1.2],
          "text-anchor": "top",
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#2cc855",
          "text-halo-color": "rgba(5, 10, 28, 0.95)",
          "text-halo-width": 1.5,
        },
      });

      // --- Flight layers: individual planes with rotation ---
      map.addSource("flights", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Plane icons — symbol layer with rotation
      map.addLayer({
        id: "flight-planes",
        type: "symbol",
        source: "flights",
        layout: {
          "icon-image": [
            "case",
            ["==", ["get", "selectState"], "selected"], "plane-selected",
            ["==", ["get", "selectState"], "dimmed"], "plane-dimmed",
            "plane-normal",
          ],
          "icon-size": ["interpolate", ["linear"], ["zoom"],
            1.5, 0.28,
            3, 0.38,
            5, 0.55,
            8, 0.75,
            12, 1.0,
          ],
          "icon-rotate": ["get", "heading"],
          "icon-rotation-alignment": "map",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "symbol-sort-key": [
            "case",
            ["==", ["get", "selectState"], "selected"], 1,
            0,
          ],
        },
      });

      // Flight callsign labels — visible at closer zoom
      map.addLayer({
        id: "flight-labels",
        type: "symbol",
        source: "flights",
        minzoom: 7,
        filter: ["!", ["==", ["get", "selectState"], "dimmed"]],
        layout: {
          "text-field": ["get", "flightNumber"],
          "text-size": 10,
          "text-offset": [0, 1.6],
          "text-anchor": "top",
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "rgba(225, 175, 55, 0.85)",
          "text-halo-color": "rgba(0, 0, 0, 0.85)",
          "text-halo-width": 1,
        },
      });

      // --- Route line for selected flight ---
      map.addSource("route", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "route-glow",
        type: "line",
        source: "route",
        paint: {
          "line-color": "#00e5ff",
          "line-width": 4,
          "line-opacity": 0.15,
          "line-blur": 3,
        },
      });

      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        paint: {
          "line-color": "#00e5ff",
          "line-width": 2,
          "line-opacity": 0.7,
          "line-dasharray": [4, 4],
        },
      });
    });

    // Click on flight plane
    map.on("click", "flight-planes", (e) => {
      if (!e.features || e.features.length === 0) return;
      const id = e.features[0].properties?.id;
      if (selectedRef.current?.id === id) {
        onSelectRef.current(null);
      } else {
        const found = (window as unknown as { __skyway_flights?: Flight[] }).__skyway_flights?.find(
          (f: Flight) => f.id === id
        );
        if (found) onSelectRef.current(found);
      }
    });

    map.on("mouseenter", "flight-planes", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "flight-planes", () => {
      map.getCanvas().style.cursor = "";
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update airport data
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const update = () => {
      const source = map.getSource("airports") as maplibregl.GeoJSONSource | undefined;
      if (!source) return;
      source.setData({
        type: "FeatureCollection",
        features: airports.map((a) => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [a.lng, a.lat] },
          properties: { code: a.code, name: a.name, city: a.city },
        })),
      });
    };

    if (map.isStyleLoaded()) update();
    else map.on("load", update);
  }, [airports]);

  // Update flight data
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    (window as unknown as { __skyway_flights?: Flight[] }).__skyway_flights = flights;

    const airborne = flights.filter(
      (f) => !f.onGround && f.currentLat !== 0 && f.currentLng !== 0
    );

    const hasSelection = selectedRef.current !== null;

    const update = () => {
      const source = map.getSource("flights") as maplibregl.GeoJSONSource | undefined;
      if (!source) return;
      source.setData({
        type: "FeatureCollection",
        features: airborne.map((f) => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [f.currentLng, f.currentLat] },
          properties: {
            id: f.id,
            flightNumber: f.flightNumber,
            heading: f.heading,
            altitude: f.altitude,
            speed: f.speed,
            selectState: hasSelection
              ? (f.id === selectedRef.current?.id ? "selected" : "dimmed")
              : "normal",
          },
        })),
      });
    };

    if (map.isStyleLoaded()) update();
    else map.on("load", update);
  }, [flights, selectedFlight]);

  // Route line + fly-to for selected flight
  const updateRoute = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    popupRef.current?.remove();

    const source = map.getSource("route") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    if (!selectedFlight) {
      source.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    // Great circle route
    const { origin, destination } = selectedFlight;
    const hasOrig = origin.lat !== 0 || origin.lng !== 0;
    const hasDest = destination.lat !== 0 || destination.lng !== 0;
    const coords: [number, number][] = [];
    const steps = 80;

    if (hasOrig && hasDest) {
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        coords.push([
          origin.lng + t * (destination.lng - origin.lng),
          origin.lat + t * (destination.lat - origin.lat),
        ]);
      }
    } else if (hasOrig) {
      coords.push([origin.lng, origin.lat], [selectedFlight.currentLng, selectedFlight.currentLat]);
    } else if (hasDest) {
      coords.push([selectedFlight.currentLng, selectedFlight.currentLat], [destination.lng, destination.lat]);
    }

    source.setData({
      type: "FeatureCollection",
      features: coords.length > 1
        ? [{ type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} }]
        : [],
    });

    // Fly to selected aircraft
    map.flyTo({
      center: [selectedFlight.currentLng, selectedFlight.currentLat],
      zoom: Math.max(map.getZoom(), 5),
      duration: 1500,
      essential: true,
    });

    // Popup
    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: "flight-popup",
      offset: [0, -16],
      maxWidth: "240px",
    })
      .setLngLat([selectedFlight.currentLng, selectedFlight.currentLat])
      .setHTML(
        `<div class="popup-inner">
          <div class="popup-flight">${selectedFlight.flightNumber}</div>
          <div class="popup-airline">${selectedFlight.airline.name}${selectedFlight.aircraft ? " &middot; " + selectedFlight.aircraft : ""}</div>
          <div class="popup-route">${selectedFlight.origin.code} &rarr; ${selectedFlight.destination.code}</div>
          <div class="popup-details">
            <span>${selectedFlight.altitude.toLocaleString()} ft</span>
            <span>${selectedFlight.speed} kts</span>
            <span>HDG ${selectedFlight.heading}&deg;</span>
          </div>
        </div>`
      )
      .addTo(map);

    popupRef.current = popup;
  }, [selectedFlight]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (map.isStyleLoaded()) updateRoute();
    else map.on("load", updateRoute);
  }, [updateRoute]);

  return (
    <>
      <style>{`
        .flight-popup .maplibregl-popup-content {
          background: rgba(8, 16, 32, 0.88) !important;
          backdrop-filter: blur(16px) saturate(1.5) !important;
          -webkit-backdrop-filter: blur(16px) saturate(1.5) !important;
          border: 1px solid rgba(0, 229, 255, 0.2) !important;
          border-radius: 12px !important;
          padding: 0 !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 24px rgba(0, 229, 255, 0.06) !important;
        }
        .flight-popup .maplibregl-popup-tip {
          border-top-color: rgba(8, 16, 32, 0.88) !important;
        }
        .popup-inner {
          padding: 12px 16px;
          color: #c8dae8;
          font-size: 12px;
          line-height: 1.6;
        }
        .popup-flight {
          font-weight: 700;
          font-size: 15px;
          color: #00e5ff;
          letter-spacing: 0.6px;
        }
        .popup-airline {
          color: #6d8899;
          font-size: 11px;
          margin-top: 1px;
        }
        .popup-route {
          color: #8ab4cc;
          margin-top: 4px;
          font-weight: 500;
        }
        .popup-details {
          margin-top: 8px;
          display: flex;
          gap: 12px;
          color: #4a7090;
          font-size: 10px;
          font-family: "SF Mono", "Menlo", monospace;
          letter-spacing: 0.3px;
        }
      `}</style>
      <div ref={containerRef} className="absolute inset-0 z-0" />
    </>
  );
}

"use client";

import { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Flight, Airport } from "@/lib/types";

interface MapProps {
  flights: Flight[];
  airports: Airport[];
  selectedFlight: Flight | null;
  onSelectFlight: (flight: Flight | null) => void;
}

export default function FlightMap({ flights, airports, selectedFlight, onSelectFlight }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const onSelectRef = useRef(onSelectFlight);
  onSelectRef.current = onSelectFlight;

  const selectedRef = useRef(selectedFlight);
  selectedRef.current = selectedFlight;

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      containerRef.current.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100%;background:#050d1a;color:#3bb8e8;font-family:sans-serif;padding:2rem;text-align:center;">
          <div>
            <p style="font-size:1.1rem;margin-bottom:0.5rem;">Mapbox token required</p>
            <p style="color:#4a6080;font-size:0.85rem;">Set <code style="color:#3bb8e8;">NEXT_PUBLIC_MAPBOX_TOKEN</code> in your <code style="color:#3bb8e8;">.env.local</code> file</p>
          </div>
        </div>`;
      return;
    }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/satellite-v9",
      projection: "globe",
      center: [-95, 38],
      zoom: 2.8,
      minZoom: 1.5,
      maxZoom: 14,
      attributionControl: false,
      antialias: true,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), "bottom-right");

    map.on("style.load", () => {
      // Dark atmosphere / space feel
      map.setFog({
        color: "rgb(5, 10, 28)",
        "high-color": "rgb(20, 40, 80)",
        "horizon-blend": 0.08,
        "space-color": "rgb(3, 5, 12)",
        "star-intensity": 0.95,
      });

      // Airport dots layer
      map.addSource("airports", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addLayer({
        id: "airport-glow",
        type: "circle",
        source: "airports",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 6, 6, 10, 10, 14],
          "circle-color": "rgba(59, 184, 232, 0.12)",
          "circle-blur": 1,
        },
      });

      map.addLayer({
        id: "airport-dots",
        type: "circle",
        source: "airports",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 2.5, 6, 4, 10, 6],
          "circle-color": "#3bb8e8",
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(59, 184, 232, 0.4)",
        },
      });

      map.addLayer({
        id: "airport-labels",
        type: "symbol",
        source: "airports",
        minzoom: 3,
        layout: {
          "text-field": ["get", "code"],
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 3, 9, 8, 12],
          "text-offset": [0, 1.2],
          "text-anchor": "top",
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#6badc9",
          "text-halo-color": "rgba(5, 10, 28, 0.9)",
          "text-halo-width": 1.5,
        },
      });

      // Flight dots layer
      map.addSource("flights", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 5,
        clusterRadius: 30,
      });

      // Cluster circles
      map.addLayer({
        id: "flight-clusters",
        type: "circle",
        source: "flights",
        filter: ["has", "point_count"],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "point_count"], 2, 8, 50, 18, 200, 24],
          "circle-color": "rgba(59, 184, 232, 0.25)",
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(59, 184, 232, 0.5)",
          "circle-blur": 0.3,
        },
      });

      map.addLayer({
        id: "flight-cluster-count",
        type: "symbol",
        source: "flights",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
          "text-size": 11,
        },
        paint: {
          "text-color": "#3bb8e8",
        },
      });

      // Individual flight dots with glow
      map.addLayer({
        id: "flight-glow",
        type: "circle",
        source: "flights",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 4, 6, 7, 10, 10],
          "circle-color": "rgba(59, 184, 232, 0.15)",
          "circle-blur": 1,
        },
      });

      map.addLayer({
        id: "flight-dots",
        type: "circle",
        source: "flights",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 1.5, 6, 3, 10, 5],
          "circle-color": [
            "case",
            ["==", ["get", "selected"], true],
            "#00e5ff",
            "#3bb8e8",
          ],
          "circle-stroke-width": [
            "case",
            ["==", ["get", "selected"], true],
            2,
            0.5,
          ],
          "circle-stroke-color": [
            "case",
            ["==", ["get", "selected"], true],
            "rgba(0, 229, 255, 0.6)",
            "rgba(59, 184, 232, 0.3)",
          ],
        },
      });

      // Route line for selected flight
      map.addSource("route", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        paint: {
          "line-color": "#3bb8e8",
          "line-width": 1.5,
          "line-opacity": 0.6,
          "line-dasharray": [3, 3],
        },
      });
    });

    // Click on flight dot
    map.on("click", "flight-dots", (e) => {
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

    // Click cluster to zoom
    map.on("click", "flight-clusters", (e) => {
      if (!e.features || e.features.length === 0) return;
      const clusterId = e.features[0].properties?.cluster_id;
      const source = map.getSource("flights") as mapboxgl.GeoJSONSource;
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err || zoom == null) return;
        const geom = e.features![0].geometry;
        if (geom.type === "Point") {
          map.easeTo({
            center: geom.coordinates as [number, number],
            zoom,
          });
        }
      });
    });

    map.on("mouseenter", "flight-dots", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "flight-dots", () => {
      map.getCanvas().style.cursor = "";
    });
    map.on("mouseenter", "flight-clusters", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "flight-clusters", () => {
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
      const source = map.getSource("airports") as mapboxgl.GeoJSONSource | undefined;
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
    else map.on("style.load", update);
  }, [airports]);

  // Update flight data
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Store flights globally for click handler lookup
    (window as unknown as { __skyway_flights?: Flight[] }).__skyway_flights = flights;

    const airborne = flights.filter(
      (f) => f.status === "en-route" || (f.progress > 0 && f.progress < 1)
    );

    const update = () => {
      const source = map.getSource("flights") as mapboxgl.GeoJSONSource | undefined;
      if (!source) return;
      source.setData({
        type: "FeatureCollection",
        features: airborne.map((f) => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [f.currentLng, f.currentLat] },
          properties: {
            id: f.id,
            flightNumber: f.flightNumber,
            selected: f.id === selectedFlight?.id,
          },
        })),
      });
    };

    if (map.isStyleLoaded()) update();
    else map.on("style.load", update);
  }, [flights, selectedFlight]);

  // Update route line + popup for selected flight
  const updateRoute = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    popupRef.current?.remove();

    const source = map.getSource("route") as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;

    if (!selectedFlight) {
      source.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    // Great circle approximation with intermediate points
    const coords: [number, number][] = [];
    const steps = 80;
    const { origin, destination } = selectedFlight;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const lat = origin.lat + t * (destination.lat - origin.lat);
      const lng = origin.lng + t * (destination.lng - origin.lng);
      coords.push([lng, lat]);
    }

    source.setData({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "LineString", coordinates: coords },
          properties: {},
        },
      ],
    });

    // Popup on the aircraft position
    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: "flight-popup-3d",
      offset: [0, -12],
      maxWidth: "220px",
    })
      .setLngLat([selectedFlight.currentLng, selectedFlight.currentLat])
      .setHTML(
        `<div class="popup-inner">
          <div class="popup-flight">${selectedFlight.flightNumber}</div>
          <div class="popup-airline">${selectedFlight.airline.name}</div>
          <div class="popup-route">${selectedFlight.origin.code} → ${selectedFlight.destination.code}</div>
          <div class="popup-details">
            <span>ALT ${(selectedFlight.altitude / 1000).toFixed(1)}k</span>
            <span>SPD ${selectedFlight.speed} kts</span>
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
    else map.on("style.load", updateRoute);
  }, [updateRoute]);

  return (
    <>
      <style>{`
        .flight-popup-3d .mapboxgl-popup-content {
          background: rgba(8, 16, 32, 0.85) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(59, 184, 232, 0.25) !important;
          border-radius: 10px !important;
          padding: 0 !important;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5), 0 0 20px rgba(59, 184, 232, 0.08) !important;
        }
        .flight-popup-3d .mapboxgl-popup-tip {
          border-top-color: rgba(8, 16, 32, 0.85) !important;
        }
        .popup-inner {
          padding: 10px 14px;
          color: #c8dae8;
          font-size: 12px;
          line-height: 1.5;
        }
        .popup-flight {
          font-weight: 700;
          font-size: 14px;
          color: #00e5ff;
          letter-spacing: 0.5px;
        }
        .popup-airline { color: #8899aa; font-size: 11px; }
        .popup-route { color: #6badc9; margin-top: 2px; }
        .popup-details {
          margin-top: 6px;
          display: flex;
          gap: 10px;
          color: #4a6d85;
          font-size: 10px;
          font-family: monospace;
        }
      `}</style>
      <div ref={containerRef} className="absolute inset-0 z-0" />
    </>
  );
}

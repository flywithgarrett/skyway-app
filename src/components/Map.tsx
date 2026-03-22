"use client";

import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Flight, Airport } from "@/lib/types";

const AIRCRAFT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`;

const SELECTED_AIRCRAFT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3bb8e8" width="22" height="22"><path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`;

function createAircraftIcon(heading: number, selected: boolean): L.DivIcon {
  const svg = selected ? SELECTED_AIRCRAFT_SVG : AIRCRAFT_SVG;
  const size = selected ? 22 : 18;
  return L.divIcon({
    html: `<div style="transform: rotate(${heading}deg); display:flex; align-items:center; justify-content:center; filter: drop-shadow(0 0 ${selected ? "6px #3bb8e8" : "3px rgba(0,0,0,0.6)"});">${svg}</div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function createAirportIcon(): L.DivIcon {
  return L.divIcon({
    html: `<div style="width:8px;height:8px;background:#3bb8e8;border-radius:50%;border:2px solid #0a1628;box-shadow:0 0 6px rgba(59,184,232,0.5);"></div>`,
    className: "",
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

interface MapProps {
  flights: Flight[];
  airports: Airport[];
  selectedFlight: Flight | null;
  onSelectFlight: (flight: Flight | null) => void;
}

export default function Map({ flights, airports, selectedFlight, onSelectFlight }: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const flightMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const routeLineRef = useRef<L.Polyline | null>(null);
  const popupRef = useRef<L.Popup | null>(null);

  const handleFlightClick = useCallback(
    (flight: Flight) => {
      onSelectFlight(selectedFlight?.id === flight.id ? null : flight);
    },
    [selectedFlight, onSelectFlight]
  );

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [30, 0],
      zoom: 3,
      zoomControl: false,
      attributionControl: false,
      minZoom: 2,
      maxZoom: 12,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Draw airport markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const markers: L.Marker[] = [];
    airports.forEach((airport) => {
      const marker = L.marker([airport.lat, airport.lng], {
        icon: createAirportIcon(),
      })
        .bindTooltip(
          `<div style="background:#0f1d35;color:#e0e7ef;border:1px solid #3bb8e8;padding:4px 8px;border-radius:6px;font-size:12px;font-weight:600;">${airport.code}<br/><span style="font-weight:400;font-size:10px;color:#8899aa;">${airport.city}</span></div>`,
          { direction: "top", offset: [0, -8], className: "airport-tooltip" }
        )
        .addTo(map);
      markers.push(marker);
    });

    return () => {
      markers.forEach((m) => m.remove());
    };
  }, [airports]);

  // Draw flight markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existingIds = new Set(flightMarkersRef.current.keys());
    const currentIds = new Set<string>();

    const enRouteFlights = flights.filter(
      (f) => f.status === "en-route" || (f.status === "delayed" && f.progress > 0) || (f.status === "on-time" && f.progress > 0)
    );

    enRouteFlights.forEach((flight) => {
      currentIds.add(flight.id);
      const isSelected = selectedFlight?.id === flight.id;
      const icon = createAircraftIcon(flight.heading, isSelected);

      if (flightMarkersRef.current.has(flight.id)) {
        const marker = flightMarkersRef.current.get(flight.id)!;
        marker.setLatLng([flight.currentLat, flight.currentLng]);
        marker.setIcon(icon);
        if (isSelected) marker.setZIndexOffset(1000);
        else marker.setZIndexOffset(0);
      } else {
        const marker = L.marker([flight.currentLat, flight.currentLng], {
          icon,
          zIndexOffset: isSelected ? 1000 : 0,
        }).addTo(map);

        marker.on("click", () => handleFlightClick(flight));
        flightMarkersRef.current.set(flight.id, marker);
      }
    });

    // Remove stale markers
    existingIds.forEach((id) => {
      if (!currentIds.has(id)) {
        flightMarkersRef.current.get(id)?.remove();
        flightMarkersRef.current.delete(id);
      }
    });
  }, [flights, selectedFlight, handleFlightClick]);

  // Draw route line and popup for selected flight
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    routeLineRef.current?.remove();
    popupRef.current?.remove();

    if (!selectedFlight) return;

    const points: L.LatLngExpression[] = [];
    const steps = 50;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const lat = selectedFlight.origin.lat + t * (selectedFlight.destination.lat - selectedFlight.origin.lat);
      const lng = selectedFlight.origin.lng + t * (selectedFlight.destination.lng - selectedFlight.origin.lng);
      points.push([lat, lng]);
    }

    routeLineRef.current = L.polyline(points, {
      color: "#3bb8e8",
      weight: 2,
      opacity: 0.7,
      dashArray: "8 6",
    }).addTo(map);

    const popup = L.popup({
      closeButton: false,
      className: "flight-popup",
      offset: [0, -14],
      autoPan: false,
    })
      .setLatLng([selectedFlight.currentLat, selectedFlight.currentLng])
      .setContent(
        `<div style="background:#0f1d35;border:1px solid #3bb8e8;border-radius:8px;padding:8px 12px;color:#e0e7ef;font-size:12px;min-width:140px;">
          <div style="font-weight:700;font-size:14px;color:#3bb8e8;margin-bottom:4px;">${selectedFlight.flightNumber}</div>
          <div>${selectedFlight.airline.name}</div>
          <div style="color:#8899aa;margin-top:2px;">${selectedFlight.origin.code} → ${selectedFlight.destination.code}</div>
          <div style="color:#8899aa;">${selectedFlight.aircraft}</div>
          <div style="margin-top:4px;display:flex;gap:8px;">
            <span>ALT ${(selectedFlight.altitude / 1000).toFixed(1)}k ft</span>
            <span>SPD ${selectedFlight.speed} kts</span>
          </div>
        </div>`
      )
      .openOn(map);

    popupRef.current = popup;
  }, [selectedFlight]);

  return (
    <>
      <style>{`
        .flight-popup .leaflet-popup-content-wrapper {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
          border-radius: 0 !important;
        }
        .flight-popup .leaflet-popup-content {
          margin: 0 !important;
        }
        .flight-popup .leaflet-popup-tip {
          background: #0f1d35 !important;
          border: 1px solid #3bb8e8 !important;
          border-top: none !important;
          border-left: none !important;
        }
        .airport-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
      `}</style>
      <div ref={containerRef} className="absolute inset-0 z-0" />
    </>
  );
}

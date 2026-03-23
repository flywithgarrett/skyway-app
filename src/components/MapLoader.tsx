"use client";

import dynamic from "next/dynamic";
import { Flight, Airport } from "@/lib/types";

const FlightMap = dynamic(() => import("./Map"), { ssr: false });

interface MapLoaderProps {
  flights: Flight[];
  airports: Airport[];
  selectedFlight: Flight | null;
  onSelectFlight: (flight: Flight | null) => void;
  issPosition: { lat: number; lng: number; alt: number; velocity: number } | null;
  flyToISS: boolean;
  onFlyToISSComplete: () => void;
  flyToAirport?: Airport | null;
  onFlyToAirportComplete?: () => void;
  highlightedCallsign?: string | null;
  onHighlightComplete?: () => void;
}

export default function MapLoader(props: MapLoaderProps) {
  return <FlightMap {...props} />;
}

"use client";

import dynamic from "next/dynamic";
import { Flight, Airport } from "@/lib/types";

const Globe = dynamic(() => import("./Globe"), { ssr: false });

interface MapLoaderProps {
  flights: Flight[];
  airports: Airport[];
  selectedFlight: Flight | null;
  onSelectFlight: (flight: Flight | null) => void;
}

export default function MapLoader(props: MapLoaderProps) {
  return <Globe {...props} />;
}

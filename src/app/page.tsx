"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import MapLoader from "@/components/MapLoader";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import Panel from "@/components/Panel";
import SearchOverlay from "@/components/SearchOverlay";
import { airports } from "@/lib/data";
import { useLiveFlights } from "@/lib/api";
import { Flight } from "@/lib/types";

const FlightDetailPanel = dynamic(() => import("@/components/FlightDetailPanel"), { ssr: false });

type Tab = "map" | "flights" | "airports" | "atc" | "alerts";

export default function Home() {
  const { flights, loading } = useLiveFlights(10000);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [detailFlight, setDetailFlight] = useState<Flight | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("map");

  const enRouteCount = flights.length; // All returned flights are airborne

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: "#030610" }}>
      {loading && flights.length === 0 && (
        <div className="absolute inset-0 z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-3" />
            <div className="text-sm text-white/40">Loading live flights...</div>
          </div>
        </div>
      )}

      <MapLoader
        flights={flights}
        airports={airports}
        selectedFlight={selectedFlight}
        onSelectFlight={setSelectedFlight}
      />

      <TopBar
        totalFlights={flights.length}
        enRouteCount={enRouteCount}
        onSearchOpen={() => setSearchOpen(true)}
        selectedFlight={selectedFlight}
      />

      {selectedFlight && !detailFlight && (
        <Panel
          flight={selectedFlight}
          onClose={() => setSelectedFlight(null)}
          onViewDetails={(f) => setDetailFlight(f)}
        />
      )}

      {detailFlight && (
        <FlightDetailPanel
          flight={detailFlight}
          onClose={() => setDetailFlight(null)}
        />
      )}

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {searchOpen && (
        <SearchOverlay
          flights={flights}
          onSelect={(flight) => setSelectedFlight(flight)}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </div>
  );
}

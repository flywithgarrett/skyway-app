"use client";

import { useState, useMemo } from "react";
import MapLoader from "@/components/MapLoader";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import Panel from "@/components/Panel";
import SearchOverlay from "@/components/SearchOverlay";
import { generateFlights } from "@/lib/data";
import { airports } from "@/lib/data";
import { Flight } from "@/lib/types";

type Tab = "map" | "flights" | "airports" | "atc" | "alerts";

export default function Home() {
  const flights = useMemo(() => generateFlights(1000), []);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("map");

  const enRouteCount = useMemo(
    () => flights.filter((f) => f.status === "en-route").length,
    [flights]
  );

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: "#030610" }}>
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

      {selectedFlight && (
        <Panel flight={selectedFlight} onClose={() => setSelectedFlight(null)} />
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

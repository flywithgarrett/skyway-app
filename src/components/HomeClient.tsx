"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import MapLoader from "@/components/MapLoader";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import Panel from "@/components/Panel";
import SearchOverlay from "@/components/SearchOverlay";
import AlertsView from "@/components/AlertsView";
import PlaceholderView from "@/components/PlaceholderView";
import { airports } from "@/lib/data";
import { useLiveFlights } from "@/lib/api";
import { Flight } from "@/lib/types";

const FlightDetailPanel = dynamic(() => import("@/components/FlightDetailPanel"), { ssr: false });

type Tab = "map" | "flights" | "airports" | "atc" | "alerts";

const placeholders: Record<string, { title: string; icon: string; description: string }> = {
  flights: {
    title: "Flight Board",
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`,
    description: "Live departure and arrival boards with real-time status updates, gate assignments, and delay tracking.",
  },
  airports: {
    title: "Airport Explorer",
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/></svg>`,
    description: "Detailed airport information including weather, runway status, terminal maps, and traffic density.",
  },
  atc: {
    title: "ATC Live Feed",
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`,
    description: "Live air traffic control audio streams with frequency monitoring and controller communication logs.",
  },
};

interface HomeClientProps {
  initialFlights: Flight[];
}

export default function HomeClient({ initialFlights }: HomeClientProps) {
  const { flights } = useLiveFlights(10000, initialFlights);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [detailFlight, setDetailFlight] = useState<Flight | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("map");

  const enRouteCount = flights.length;

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab !== "map") {
      setSelectedFlight(null);
      setDetailFlight(null);
    }
  };

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

      {activeTab === "map" && selectedFlight && !detailFlight && (
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

      {activeTab === "alerts" && (
        <AlertsView
          onSelectFlight={(f) => setSelectedFlight(f)}
          onSwitchToMap={() => setActiveTab("map")}
        />
      )}

      {activeTab in placeholders && (
        <PlaceholderView {...placeholders[activeTab]} />
      )}

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {searchOpen && (
        <SearchOverlay
          flights={flights}
          onSelect={(flight) => { setSelectedFlight(flight); setActiveTab("map"); }}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </div>
  );
}

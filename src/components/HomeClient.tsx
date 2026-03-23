"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import MapLoader from "@/components/MapLoader";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import Panel from "@/components/Panel";
import FlightListSidebar from "@/components/FlightListSidebar";
import SearchOverlay from "@/components/SearchOverlay";
import AlertsView from "@/components/AlertsView";
import CommunityView from "@/components/CommunityView";
import PlaceholderView from "@/components/PlaceholderView";
import { airports } from "@/lib/data";
import { useLiveFlights, useFlightDetails } from "@/lib/api";
import { Flight } from "@/lib/types";

const FlightDetailPanel = dynamic(() => import("@/components/FlightDetailPanel"), { ssr: false });

type Tab = "map" | "flights" | "airports" | "community" | "alerts";

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
};

interface HomeClientProps {
  initialFlights: Flight[];
}

export default function HomeClient({ initialFlights }: HomeClientProps) {
  const { flights, error: apiError } = useLiveFlights(60000, initialFlights);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [detailFlight, setDetailFlight] = useState<Flight | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("map");

  // Fetch FlightAware premium data for the selected flight
  const { detail, loading: detailLoading } = useFlightDetails(selectedFlight?.callsign || null);

  // Merge FlightAware premium data into the selected flight for Globe jetstream
  const enrichedSelectedFlight = useMemo(() => {
    if (!selectedFlight) return null;
    if (!detail) return selectedFlight;
    return {
      ...selectedFlight,
      aircraft: detail.aircraftType || selectedFlight.aircraft,
      registration: detail.registration || selectedFlight.registration,
      scheduledDep: detail.scheduledDep || selectedFlight.scheduledDep,
      actualDep: detail.actualDep || selectedFlight.actualDep,
      scheduledArr: detail.scheduledArr || selectedFlight.scheduledArr,
      estimatedArr: detail.estimatedArr || selectedFlight.estimatedArr,
      actualArr: detail.actualArr || selectedFlight.actualArr,
      progress: detail.progress || selectedFlight.progress,
      routeDistance: detail.routeDistance || selectedFlight.routeDistance,
      origin: detail.origin ? {
        code: detail.origin.code,
        icao: detail.origin.icao,
        name: detail.origin.name,
        city: detail.origin.city,
        country: selectedFlight.origin.country,
        lat: detail.origin.lat,
        lng: detail.origin.lng,
      } : selectedFlight.origin,
      destination: detail.destination ? {
        code: detail.destination.code,
        icao: detail.destination.icao,
        name: detail.destination.name,
        city: detail.destination.city,
        country: selectedFlight.destination.country,
        lat: detail.destination.lat,
        lng: detail.destination.lng,
      } : selectedFlight.destination,
    };
  }, [selectedFlight, detail]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab !== "map") {
      setSelectedFlight(null);
      setDetailFlight(null);
    }
  };

  const handleSidebarSelect = (flight: Flight) => {
    setSelectedFlight(flight);
    setActiveTab("map");
  };

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: "#030610" }}>
      <MapLoader
        flights={flights}
        airports={airports}
        selectedFlight={enrichedSelectedFlight}
        onSelectFlight={setSelectedFlight}
      />

      {apiError && (
        <div
          style={{
            position: "absolute",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            maxWidth: 560,
            width: "90%",
            padding: "14px 20px",
            borderRadius: 10,
            background: "rgba(20, 8, 8, 0.92)",
            border: "1px solid rgba(255, 60, 60, 0.35)",
            backdropFilter: "blur(16px)",
            color: "#ff6b6b",
            fontSize: 13,
            fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
            lineHeight: 1.5,
            boxShadow: "0 4px 24px rgba(0,0,0,0.5), 0 0 12px rgba(255,60,60,0.08)",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 16, lineHeight: "20px", flexShrink: 0 }}>&#9888;</span>
          <span style={{ opacity: 0.95 }}>{apiError}</span>
        </div>
      )}

      <TopBar
        totalFlights={flights.length}
        enRouteCount={flights.length}
        onSearchOpen={() => setSearchOpen(true)}
        selectedFlight={enrichedSelectedFlight}
      />

      {/* Left sidebar — flight list */}
      {activeTab === "map" && (
        <FlightListSidebar
          flights={flights}
          selectedFlightId={selectedFlight?.id || null}
          onSelectFlight={handleSidebarSelect}
        />
      )}

      {activeTab === "map" && enrichedSelectedFlight && !detailFlight && (
        <Panel
          flight={enrichedSelectedFlight}
          detail={detail}
          detailLoading={detailLoading}
          onClose={() => setSelectedFlight(null)}
          onViewDetails={(f) => setDetailFlight(f)}
        />
      )}

      {detailFlight && (
        <FlightDetailPanel
          flight={detailFlight}
          detail={detail}
          onClose={() => setDetailFlight(null)}
          onShowOnMap={() => {
            setSelectedFlight(detailFlight);
            setDetailFlight(null);
            setActiveTab("map");
          }}
        />
      )}

      {activeTab === "community" && <CommunityView />}

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

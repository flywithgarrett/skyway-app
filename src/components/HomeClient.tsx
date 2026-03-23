"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import MapLoader from "@/components/MapLoader";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import Panel from "@/components/Panel";
import FlightListSidebar from "@/components/FlightListSidebar";
import SearchOverlay from "@/components/SearchOverlay";
import AlertsView from "@/components/AlertsView";
import CommunityView from "@/components/CommunityView";
import SatelliteView from "@/components/SatelliteView";
import PlaceholderView from "@/components/PlaceholderView";
import ATCPanel, { ATCAlertBanner } from "@/components/ATCPanel";
import { useATCFeed } from "@/hooks/useATCFeed";
import type { ATCAlert } from "@/hooks/useATCFeed";
import { airports } from "@/lib/data";
import { useLiveFlights, useFlightDetails } from "@/lib/api";
import { Flight } from "@/lib/types";

interface ISSPosition {
  lat: number;
  lng: number;
  alt: number;
  velocity: number;
}

function useISSPosition(intervalMs = 5000) {
  const [iss, setIss] = useState<ISSPosition | null>(null);

  const fetchISS = useCallback(() => {
    fetch("/api/iss")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data && data.lat !== undefined) setIss(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchISS();
    const id = setInterval(fetchISS, intervalMs);
    return () => clearInterval(id);
  }, [fetchISS, intervalMs]);

  return iss;
}

const FlightDetailPanel = dynamic(() => import("@/components/FlightDetailPanel"), { ssr: false });

type Tab = "map" | "flights" | "satellites" | "community" | "alerts";

const placeholders: Record<string, { title: string; icon: string; description: string }> = {
  flights: {
    title: "Flight Board",
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`,
    description: "Live departure and arrival boards with real-time status updates, gate assignments, and delay tracking.",
  },
};

interface HomeClientProps {
  initialFlights: Flight[];
}

export default function HomeClient({ initialFlights }: HomeClientProps) {
  const { flights, error: apiError } = useLiveFlights(60000, initialFlights);
  const issPosition = useISSPosition(5000);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [detailFlight, setDetailFlight] = useState<Flight | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("map");
  const [flyToISS, setFlyToISS] = useState(false);

  // ATC feed state
  const [atcAirport, setAtcAirport] = useState<string | null>(null);
  const { transcripts: atcTranscripts, alerts: atcAlerts, isConnected: atcConnected } = useATCFeed(atcAirport);
  const [highlightedCallsign, setHighlightedCallsign] = useState<string | null>(null);
  const [activeAlertBanner, setActiveAlertBanner] = useState<ATCAlert | null>(null);

  // Show alert banner when new alert arrives
  useEffect(() => {
    if (atcAlerts.length > 0) {
      setActiveAlertBanner(atcAlerts[0]);
    }
  }, [atcAlerts]);

  const handleATCCallsignClick = useCallback((callsign: string, _lat: number | null, _lng: number | null) => {
    setHighlightedCallsign(callsign);
  }, []);

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


  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: "#030610" }}>
      <MapLoader
        flights={flights}
        airports={airports}
        selectedFlight={enrichedSelectedFlight}
        onSelectFlight={setSelectedFlight}
        issPosition={issPosition}
        flyToISS={flyToISS}
        onFlyToISSComplete={() => setFlyToISS(false)}
        highlightedCallsign={highlightedCallsign}
        onHighlightComplete={() => setHighlightedCallsign(null)}
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

      {/* Left sidebar — aviation stats */}
      {activeTab === "map" && (
        <FlightListSidebar flights={flights} />
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

      {activeTab === "satellites" && <SatelliteView />}

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

      {/* ISS Tracker — liquid glass, click to zoom */}
      {activeTab === "map" && issPosition && (
        <button
          onClick={() => setFlyToISS(true)}
          className="glass-panel"
          style={{
            position: "absolute",
            bottom: 76,
            right: 16,
            zIndex: 50,
            padding: "12px 16px",
            cursor: "pointer",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            minWidth: 200,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(251,191,36,0.25)";
            e.currentTarget.style.boxShadow = "0 8px 40px rgba(0,0,0,0.5), 0 0 20px rgba(251,191,36,0.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "";
            e.currentTarget.style.boxShadow = "";
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{
              width: 7, height: 7, borderRadius: 4,
              background: "#fbbf24",
              boxShadow: "0 0 8px rgba(251,191,36,0.5)",
            }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: "#fbbf24", letterSpacing: "0.12em" }}>ISS LIVE</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" style={{ marginLeft: "auto" }}>
              <path d="M15 3h6v6M14 10l6.1-6.1M9 21H3v-6M10 14l-6.1 6.1" />
            </svg>
          </div>
          <div style={{ display: "flex", gap: 16, fontFamily: "'SF Mono', Menlo, monospace" }}>
            <div>
              <div style={{ fontSize: 8, letterSpacing: "0.12em", color: "rgba(255,255,255,0.2)", marginBottom: 2 }}>LAT</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{issPosition.lat.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ fontSize: 8, letterSpacing: "0.12em", color: "rgba(255,255,255,0.2)", marginBottom: 2 }}>LNG</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{issPosition.lng.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ fontSize: 8, letterSpacing: "0.12em", color: "rgba(255,255,255,0.2)", marginBottom: 2 }}>ALT</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#fbbf24" }}>{issPosition.alt.toFixed(0)} km</div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 6, fontFamily: "'SF Mono', Menlo, monospace", display: "flex", alignItems: "center", gap: 6 }}>
            <span>{(issPosition.velocity * 3600).toFixed(0)} km/h</span>
            <span style={{ color: "rgba(255,255,255,0.1)" }}>|</span>
            <span style={{ fontSize: 9, color: "rgba(251,191,36,0.4)" }}>Click to track</span>
          </div>
        </button>
      )}

      {/* ATC Alert Banner — full-width at top of screen */}
      {activeAlertBanner && (
        <ATCAlertBanner
          alert={activeAlertBanner}
          onDismiss={() => setActiveAlertBanner(null)}
        />
      )}

      {/* ATC Panel — right side */}
      {activeTab === "map" && (
        <ATCPanel
          transcripts={atcTranscripts}
          alerts={atcAlerts}
          isConnected={atcConnected}
          activeAirport={atcAirport}
          onAirportChange={setAtcAirport}
          onCallsignClick={handleATCCallsignClick}
        />
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

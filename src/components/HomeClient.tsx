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
import NotificationToast from "@/components/NotificationToast";
import AuthModal from "@/components/AuthModal";
import LoadingScreen from "@/components/LoadingScreen";
import SatelliteView from "@/components/SatelliteView";
import PlaceholderView from "@/components/PlaceholderView";
import MyFlightsView from "@/components/MyFlightsView";
import AirportView from "@/components/AirportView";
import ATCPanel, { ATCAlertBanner } from "@/components/ATCPanel";
import { useATCFeed } from "@/hooks/useATCFeed";
import type { ATCAlert } from "@/hooks/useATCFeed";
import { airports } from "@/lib/data";
import { useLiveFlights, useFlightDetails } from "@/lib/api";
import { useFlightAlerts, useATCAdvisories } from "@/lib/alerts";
import { useAuth, useSavedFlights } from "@/lib/supabase/hooks";
import { Flight, Airport } from "@/lib/types";

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

type Tab = "map" | "airports" | "flights" | "satellites" | "community" | "alerts";

const placeholders: Record<string, { title: string; icon: string; description: string }> = {
  community: {
    title: "Community",
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>`,
    description: "Connect with fellow aviation enthusiasts, share sightings, and discuss live traffic.",
  },
};

interface HomeClientProps {
  initialFlights: Flight[];
}

export default function HomeClient({ initialFlights }: HomeClientProps) {
  const { flights, error: apiError } = useLiveFlights(12000, initialFlights);
  const issPosition = useISSPosition(5000);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [detailFlight, setDetailFlight] = useState<Flight | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("map");
  const [flyToISS, setFlyToISS] = useState(false);
  const [flyToAirport, setFlyToAirport] = useState<Airport | null>(null);

  // Auth + saved flights
  const { user, signInWithEmail, signUpWithEmail, signInWithOAuth, resetPassword, signOut } = useAuth();
  const { savedFlights, saveFlight, unsaveFlight, isSaved } = useSavedFlights(user?.id ?? null);

  // ATC feed state
  const [atcAirport, setAtcAirport] = useState<string | null>(null);
  const { transcripts: atcTranscripts, alerts: atcAlerts, isConnected: atcConnected, isDemo: atcIsDemo } = useATCFeed(atcAirport);
  const [highlightedCallsign, setHighlightedCallsign] = useState<string | null>(null);
  const [activeAlertBanner, setActiveAlertBanner] = useState<ATCAlert | null>(null);

  // Flight alerts: only monitor SAVED flights (not all 5000+)
  const savedCallsignSet = useMemo(() => new Set(savedFlights.map(f => f.callsign)), [savedFlights]);
  const { alerts: flightAlerts, newAlerts, dismissToast, markRead, markAllRead, unreadCount } = useFlightAlerts(flights, savedCallsignSet);
  const { advisories: atcAdvisories, lastUpdated: atcLastUpdated } = useATCAdvisories(300000);

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

  // Merge FlightAware premium data into the selected flight
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
        code: detail.origin.code, icao: detail.origin.icao, name: detail.origin.name,
        city: detail.origin.city, country: selectedFlight.origin.country,
        lat: detail.origin.lat, lng: detail.origin.lng,
      } : selectedFlight.origin,
      destination: detail.destination ? {
        code: detail.destination.code, icao: detail.destination.icao, name: detail.destination.name,
        city: detail.destination.city, country: selectedFlight.destination.country,
        lat: detail.destination.lat, lng: detail.destination.lng,
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

  const handleSelectAirport = (airport: Airport) => {
    setFlyToAirport(airport);
    setActiveTab("map");
  };

  const handleSearchAirport = (airport: Airport) => {
    setFlyToAirport(airport);
    setActiveTab("map");
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden", background: "#0A0A0F" }}>
      {/* Loading screen */}
      <LoadingScreen />

      {/* Atmosphere glow — centered ellipse behind globe */}
      <div style={{
        position: "fixed",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: "90vw", height: "90vh",
        borderRadius: "50%",
        background: "radial-gradient(ellipse, transparent 55%, rgba(10,132,255,0.06) 75%, rgba(10,132,255,0.12) 100%)",
        pointerEvents: "none",
        zIndex: 1,
      }} />

      <MapLoader
        flights={flights}
        airports={airports}
        selectedFlight={enrichedSelectedFlight}
        onSelectFlight={setSelectedFlight}
        issPosition={issPosition}
        flyToISS={flyToISS}
        onFlyToISSComplete={() => setFlyToISS(false)}
        flyToAirport={flyToAirport}
        onFlyToAirportComplete={() => setFlyToAirport(null)}
        highlightedCallsign={highlightedCallsign}
        onHighlightComplete={() => setHighlightedCallsign(null)}
      />

      {apiError && (
        <div style={{
          position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
          zIndex: 9999, maxWidth: 560, width: "90%", padding: "14px 20px", borderRadius: 10,
          background: "rgba(20, 8, 8, 0.92)", border: "1px solid rgba(255, 60, 60, 0.35)",
          backdropFilter: "blur(16px)", color: "#ff6b6b", fontSize: 13,
          fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace", lineHeight: 1.5,
          boxShadow: "0 4px 24px rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-start", gap: 10,
        }}>
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
      {activeTab === "map" && <FlightListSidebar flights={flights} />}

      {activeTab === "map" && enrichedSelectedFlight && !detailFlight && (
        <Panel
          flight={enrichedSelectedFlight}
          detail={detail}
          detailLoading={detailLoading}
          onClose={() => setSelectedFlight(null)}
          onViewDetails={(f) => setDetailFlight(f)}
          isSaved={isSaved(enrichedSelectedFlight.callsign)}
          onSave={user ? () => saveFlight({
            callsign: enrichedSelectedFlight.callsign,
            flightNumber: enrichedSelectedFlight.flightNumber,
            airlineCode: enrichedSelectedFlight.airline.code,
            airlineName: enrichedSelectedFlight.airline.name,
            originCode: enrichedSelectedFlight.origin.code,
            destinationCode: enrichedSelectedFlight.destination.code,
            aircraftType: enrichedSelectedFlight.aircraft || undefined,
            registration: enrichedSelectedFlight.registration || undefined,
          }) : () => setAuthOpen(true)}
          onUnsave={() => unsaveFlight(enrichedSelectedFlight.callsign)}
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
          isSaved={isSaved(detailFlight.callsign)}
          onSave={user ? () => saveFlight({
            callsign: detailFlight.callsign,
            flightNumber: detailFlight.flightNumber,
            airlineCode: detailFlight.airline.code,
            airlineName: detailFlight.airline.name,
            originCode: detailFlight.origin.code,
            destinationCode: detailFlight.destination.code,
            aircraftType: detailFlight.aircraft || undefined,
            registration: detailFlight.registration || undefined,
          }) : () => setAuthOpen(true)}
          onUnsave={() => unsaveFlight(detailFlight.callsign)}
        />
      )}

      {/* Airports tab */}
      {activeTab === "airports" && (
        <AirportView
          airports={airports}
          flights={flights}
          onSelectAirport={handleSelectAirport}
          onSelectFlight={(f) => { setSelectedFlight(f); setActiveTab("map"); }}
        />
      )}

      {activeTab === "flights" && (
        <MyFlightsView
          savedFlights={savedFlights}
          liveFights={flights}
          onSelectFlight={(f) => { setSelectedFlight(f); setActiveTab("map"); }}
          onUnsave={unsaveFlight}
          onAddFlight={() => { setActiveTab("map"); setSearchOpen(true); }}
          isSignedIn={!!user}
          onSignIn={() => setAuthOpen(true)}
        />
      )}

      {activeTab === "satellites" && <SatelliteView />}

      {activeTab === "alerts" && (
        <AlertsView
          onSelectFlight={(f) => setSelectedFlight(f)}
          onSwitchToMap={() => setActiveTab("map")}
          flightAlerts={flightAlerts}
          atcAdvisories={atcAdvisories}
          atcLastUpdated={atcLastUpdated}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
          unreadCount={unreadCount}
          onAddFlight={() => { setActiveTab("map"); setSearchOpen(true); }}
          isSignedIn={!!user}
          onSignIn={() => setAuthOpen(true)}
        />
      )}

      {activeTab in placeholders && (
        <PlaceholderView {...placeholders[activeTab]} />
      )}

      {/* ISS Tracker — compact pill, top-right corner */}
      {activeTab === "map" && issPosition && (
        <button
          onClick={() => setFlyToISS(true)}
          style={{
            position: "absolute", top: 56, right: 12, zIndex: 50,
            padding: "6px 12px", cursor: "pointer",
            background: "rgba(255,255,255,0.07)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10,
            display: "flex", alignItems: "center", gap: 8,
            transition: "background 0.15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
        >
          <div style={{ width: 6, height: 6, borderRadius: 3, background: "#fff" }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.1em" }}>ISS</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.5)", fontFamily: "'SF Mono', Menlo, monospace" }}>
            {issPosition.lat.toFixed(1)}° {issPosition.lng.toFixed(1)}°
          </span>
          <span style={{ fontSize: 9, color: "rgba(52,199,89,0.6)", fontFamily: "'SF Mono', Menlo, monospace" }}>
            {issPosition.alt.toFixed(0)}km
          </span>
        </button>
      )}

      {/* ATC Alert Banner */}
      {activeAlertBanner && (
        <ATCAlertBanner alert={activeAlertBanner} onDismiss={() => setActiveAlertBanner(null)} />
      )}

      {/* ATC Panel — right side */}
      {activeTab === "map" && (
        <ATCPanel
          transcripts={atcTranscripts}
          alerts={atcAlerts}
          isConnected={atcConnected}
          isDemo={atcIsDemo}
          activeAirport={atcAirport}
          onAirportChange={setAtcAirport}
          onCallsignClick={handleATCCallsignClick}
        />
      )}

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Auth modal */}
      {authOpen && (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          onSignIn={signInWithEmail}
          onSignUp={signUpWithEmail}
          onOAuth={signInWithOAuth}
          onResetPassword={resetPassword}
        />
      )}

      {/* User account button — inside top nav bar */}
      <div style={{ position: "fixed", top: 10, right: 16, zIndex: 1001 }}>
        {user ? (
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "#0A84FF", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700, color: "#fff",
              }}
            >
              {(user.email || "U")[0].toUpperCase()}
            </button>

            {/* Dropdown menu */}
            {userMenuOpen && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: -1 }} onClick={() => setUserMenuOpen(false)} />
                <div style={{
                  position: "absolute", top: 40, right: 0, width: 200,
                  background: "rgba(28,28,40,0.96)",
                  backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 14, padding: "6px",
                  boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
                }}>
                  {[
                    { label: "My Flights", action: () => { setActiveTab("flights"); setUserMenuOpen(false); } },
                    { label: "Alerts", action: () => { setActiveTab("alerts"); setUserMenuOpen(false); } },
                    { label: "Airports", action: () => { setActiveTab("airports"); setUserMenuOpen(false); } },
                  ].map(item => (
                    <button key={item.label} onClick={item.action} style={{
                      width: "100%", textAlign: "left", padding: "10px 14px",
                      background: "none", border: "none", borderRadius: 8,
                      color: "#fff", fontSize: 14, cursor: "pointer",
                    }}>{item.label}</button>
                  ))}
                  <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "4px 10px" }} />
                  <button onClick={() => { signOut(); setUserMenuOpen(false); }} style={{
                    width: "100%", textAlign: "left", padding: "10px 14px",
                    background: "none", border: "none", borderRadius: 8,
                    color: "#FF3B30", fontSize: 14, cursor: "pointer",
                  }}>Sign Out</button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={() => setAuthOpen(true)}
            style={{
              background: "#0A84FF", border: "none",
              borderRadius: 10, padding: "7px 16px", cursor: "pointer",
              fontSize: 14, fontWeight: 600, color: "#fff",
            }}
          >
            Sign In
          </button>
        )}
      </div>

      {/* Notification toasts */}
      <NotificationToast
        alerts={newAlerts}
        onDismiss={dismissToast}
        onTap={(alert) => {
          // Find the flight and open it
          const f = flights.find(fl => fl.id === alert.flightId);
          if (f) { setSelectedFlight(f); setActiveTab("map"); }
        }}
      />

      {searchOpen && (
        <SearchOverlay
          flights={flights}
          airports={airports}
          onSelect={(flight) => { setSelectedFlight(flight); setActiveTab("map"); }}
          onSelectAirport={handleSearchAirport}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </div>
  );
}

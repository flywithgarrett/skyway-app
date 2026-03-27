"use client";

type Tab = "map" | "airports" | "flights" | "satellites" | "community" | "alerts";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "map", label: "Map", icon: "🌍" },
  { id: "airports", label: "Airports", icon: "✈" },
  { id: "flights", label: "Flights", icon: "🛫" },
  { id: "satellites", label: "Satellites", icon: "📡" },
  { id: "alerts", label: "Alerts", icon: "⚠" },
];

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      height: 68, zIndex: 1000,
      background: "rgba(10,10,15,0.95)",
      backdropFilter: "blur(24px) saturate(180%)",
      WebkitBackdropFilter: "blur(24px) saturate(180%)",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      display: "flex", alignItems: "center",
      justifyContent: "space-around",
      padding: "0 8px",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
      fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif",
    }}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 3,
              padding: "8px 20px", background: "none",
              border: "none", cursor: "pointer",
              color: isActive ? "#0A84FF" : "rgba(255,255,255,0.30)",
              transition: "color 0.15s ease",
            }}
          >
            <span style={{ fontSize: 22 }}>{tab.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.02em" }}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

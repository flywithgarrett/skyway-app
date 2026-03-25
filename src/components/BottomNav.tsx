"use client";

type Tab = "map" | "airports" | "flights" | "satellites" | "community" | "alerts";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: string }[] = [
  {
    id: "map",
    label: "Map",
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  },
  {
    id: "airports",
    label: "Airports",
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 22h20"/><path d="M6.36 17.4 4 17l-2-4 1.1-.55a2 2 0 0 1 1.8 0l.17.1a2 2 0 0 0 1.8 0L8 12l5 6h3.28a2 2 0 0 0 1.64-.85L22 11"/><path d="m22 2-1.5 1.5"/><path d="M18 6l-1 1"/><path d="m14.5 8.5-1 1"/></svg>`,
  },
  {
    id: "flights",
    label: "Flights",
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`,
  },
  {
    id: "satellites",
    label: "Satellites",
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>`,
  },
  {
    id: "alerts",
    label: "Alerts",
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  },
];

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 glass-bar-bottom" style={{ height: 68, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          height: "100%",
          padding: "0 8px",
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                padding: "6px 16px",
                border: "none",
                cursor: "pointer",
                color: isActive ? "#0A84FF" : "rgba(255,255,255,0.30)",
                background: "transparent",
                transition: "color 0.2s ease",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = "rgba(255,255,255,0.55)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = "rgba(255,255,255,0.30)";
              }}
            >
              <div dangerouslySetInnerHTML={{ __html: tab.icon }} />
              <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.01em" }}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

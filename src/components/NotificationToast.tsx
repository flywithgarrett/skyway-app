"use client";

import { useEffect, useState } from "react";
import { FlightAlert, AlertSeverity } from "@/lib/alerts";

interface NotificationToastProps {
  alerts: FlightAlert[];
  onDismiss: (id: string) => void;
  onTap: (alert: FlightAlert) => void;
}

const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  good: "#34C759",
  warning: "#FF9500",
  bad: "#FF3B30",
  info: "#0A84FF",
};

const AUTO_DISMISS_MS = 6000;
const MAX_VISIBLE = 3;

function ToastItem({ alert, onDismiss, onTap, index }: {
  alert: FlightAlert; onDismiss: () => void; onTap: () => void; index: number;
}) {
  const [exiting, setExiting] = useState(false);
  const stripe = SEVERITY_COLORS[alert.severity];

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onDismiss, 300);
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      onClick={onTap}
      style={{
        position: "relative",
        background: "rgba(28,28,40,0.95)",
        backdropFilter: "blur(20px) saturate(1.3)",
        WebkitBackdropFilter: "blur(20px) saturate(1.3)",
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: 14,
        padding: "12px 14px 12px 18px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        cursor: "pointer",
        overflow: "hidden",
        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        transform: exiting ? "translateY(-20px)" : "translateY(0)",
        opacity: exiting ? 0 : 1,
        marginBottom: 8,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        // Stacking offset
        ...(index > 0 ? { marginTop: -4 } : {}),
      }}
    >
      {/* Colored left stripe */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0,
        width: 3, background: stripe, borderRadius: "14px 0 0 14px",
      }} />

      {/* Airline badge */}
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        background: `linear-gradient(135deg, ${alert.airlineColor}, ${alert.airlineColor}88)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, fontWeight: 700, color: "#fff", letterSpacing: "0.05em",
        flexShrink: 0,
      }}>
        {alert.airlineCode}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 700, color: "#fff",
          letterSpacing: "-0.01em",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {alert.title}
        </div>
        <div style={{
          fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {alert.subtitle}
        </div>
      </div>

      {/* Time badge */}
      <div style={{
        fontSize: 10, color: "rgba(255,255,255,0.30)",
        fontVariantNumeric: "tabular-nums", flexShrink: 0,
      }}>
        now
      </div>
    </div>
  );
}

export default function NotificationToast({ alerts, onDismiss, onTap }: NotificationToastProps) {
  const visible = alerts.slice(0, MAX_VISIBLE);
  if (visible.length === 0) return null;

  return (
    <div style={{
      position: "fixed",
      top: 60, // Below top bar
      left: "50%",
      transform: "translateX(-50%)",
      width: "min(420px, calc(100% - 32px))",
      zIndex: 50,
      pointerEvents: "auto",
    }}>
      <style>{`
        @keyframes toastSlideIn {
          from { transform: translateY(-30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      {visible.map((alert, i) => (
        <div key={alert.id} style={{ animation: "toastSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)" }}>
          <ToastItem
            alert={alert}
            index={i}
            onDismiss={() => onDismiss(alert.id)}
            onTap={() => {
              onDismiss(alert.id);
              onTap(alert);
            }}
          />
        </div>
      ))}
    </div>
  );
}

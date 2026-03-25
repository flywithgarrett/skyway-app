"use client";

import { useEffect, useState } from "react";
import { FlightAlert } from "@/lib/alerts";

interface NotificationToastProps {
  alerts: FlightAlert[];
  onDismiss: (id: string) => void;
  onTap: (alert: FlightAlert) => void;
}

const AUTO_DISMISS_MS = 6000;
const MAX_VISIBLE = 3;

function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function ToastItem({ alert, onDismiss, onTap }: {
  alert: FlightAlert; onDismiss: () => void; onTap: () => void;
}) {
  const [exiting, setExiting] = useState(false);

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
        background: "rgba(28,28,40,0.96)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderLeft: `3px solid ${alert.color}`,
        borderRadius: 14,
        padding: "12px 14px",
        display: "flex",
        gap: 10,
        cursor: "pointer",
        width: 320,
        marginBottom: 8,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        transform: exiting ? "translateX(340px)" : "translateX(0)",
        opacity: exiting ? 0 : 1,
        position: "relative",
      }}
    >
      {/* Icon */}
      <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>
        {alert.icon}
      </span>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", letterSpacing: "-0.01em" }}>
          {alert.title}
        </div>
        <div style={{
          fontSize: 13, color: "rgba(255,255,255,0.60)", marginTop: 2,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {alert.body}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
          {timeAgo(alert.timestamp)}
        </div>
      </div>

      {/* Dismiss X */}
      <button
        onClick={(e) => { e.stopPropagation(); setExiting(true); setTimeout(onDismiss, 300); }}
        style={{
          position: "absolute", top: 8, right: 8,
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(255,255,255,0.30)", padding: 4,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

export default function NotificationToast({ alerts, onDismiss, onTap }: NotificationToastProps) {
  const visible = alerts.slice(0, MAX_VISIBLE);
  if (visible.length === 0) return null;

  return (
    <div style={{
      position: "fixed",
      top: 70,
      right: 16,
      zIndex: 9999,
      pointerEvents: "auto",
    }}>
      <style>{`
        @keyframes toastSlideIn {
          from { transform: translateX(340px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      {visible.map((alert) => (
        <div key={alert.id} style={{ animation: "toastSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
          <ToastItem
            alert={alert}
            onDismiss={() => onDismiss(alert.id)}
            onTap={() => { onDismiss(alert.id); onTap(alert); }}
          />
        </div>
      ))}
    </div>
  );
}

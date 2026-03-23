"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ATCTranscript, ATCAlert } from "@/hooks/useATCFeed";

/* ── ATC airport list for the selector dropdown ── */
const ATC_AIRPORTS: { icao: string; name: string }[] = [
  { icao: "KJFK", name: "John F. Kennedy" },
  { icao: "KLAX", name: "Los Angeles" },
  { icao: "KORD", name: "Chicago O'Hare" },
  { icao: "KATL", name: "Hartsfield-Jackson" },
  { icao: "KDFW", name: "Dallas/Fort Worth" },
  { icao: "KDEN", name: "Denver" },
  { icao: "KSFO", name: "San Francisco" },
  { icao: "KBOS", name: "Boston Logan" },
  { icao: "KMIA", name: "Miami" },
  { icao: "KEWR", name: "Newark Liberty" },
];

/* ── Alert sound via Web Audio API ── */
let audioCtx: AudioContext | null = null;
function playAlertBeep() {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.4);
  } catch {}
}

/* ── Timestamp formatter ── */
function fmtTime(ts: number): string {
  const d = new Date(ts);
  return d.toISOString().slice(11, 19);
}

/* ── Alert Banner (renders at top of entire screen) ── */
export function ATCAlertBanner({
  alert,
  onDismiss,
}: {
  alert: ATCAlert;
  onDismiss: () => void;
}) {
  useEffect(() => {
    playAlertBeep();
    const t = setTimeout(onDismiss, 15000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        background:
          alert.severity === "high" || alert.severity === "critical"
            ? "linear-gradient(135deg, rgba(220,38,38,0.95), rgba(180,30,30,0.95))"
            : "linear-gradient(135deg, rgba(217,119,6,0.92), rgba(180,90,0,0.92))",
        backdropFilter: "blur(16px)",
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        boxShadow: "0 4px 32px rgba(0,0,0,0.5), 0 0 60px rgba(220,38,38,0.2)",
        animation: "atcBannerSlideIn 0.3s ease-out",
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          background: "#fff",
          animation: "atcPulseDot 0.6s ease-in-out infinite alternate",
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {alert.icao} — {alert.alertType.replace(/_/g, " ")}
          </span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "rgba(255,255,255,0.6)",
              background: "rgba(0,0,0,0.25)",
              padding: "2px 6px",
              borderRadius: 4,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {alert.severity}
          </span>
        </div>
        <div
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.9)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {alert.text}
        </div>
      </div>
      <button
        onClick={onDismiss}
        style={{
          background: "rgba(0,0,0,0.2)",
          border: "none",
          color: "rgba(255,255,255,0.7)",
          cursor: "pointer",
          width: 28,
          height: 28,
          borderRadius: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

/* ── Main ATC Panel ── */
interface ATCPanelProps {
  transcripts: ATCTranscript[];
  alerts: ATCAlert[];
  isConnected: boolean;
  activeAirport: string | null;
  onAirportChange: (icao: string) => void;
  onCallsignClick: (callsign: string, lat: number | null, lng: number | null) => void;
}

export default function ATCPanel({
  transcripts,
  alerts,
  isConnected,
  activeAirport,
  onAirportChange,
  onCallsignClick,
}: ATCPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [audioOn, setAudioOn] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledRef = useRef(false);
  const prevTranscriptCountRef = useRef(0);

  // Auto-scroll logic: scroll to top (newest) unless user scrolled away
  useEffect(() => {
    if (!scrollRef.current || userScrolledRef.current) return;
    if (transcripts.length > prevTranscriptCountRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    prevTranscriptCountRef.current = transcripts.length;
  }, [transcripts.length]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    // If user scrolls away from top, pause auto-scroll
    userScrolledRef.current = scrollRef.current.scrollTop > 40;
  }, []);

  // Audio: play the actual Broadcastify stream
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (audioOn && activeAirport) {
      // We don't have the actual stream URL client-side, so just toggle state
      // In production this would connect to the stream proxy
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [audioOn, activeAirport]);

  return (
    <>
      {/* Injected keyframe styles */}
      <style>{`
        @keyframes atcSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes atcFadeInLine { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes atcPulseDot { from { opacity: 1; } to { opacity: 0.3; } }
        @keyframes atcBannerSlideIn { from { transform: translateY(-100%); } to { transform: translateY(0); } }
        @keyframes atcPulseGlow { 0% { box-shadow: 0 0 4px rgba(0,229,255,0.4); } 50% { box-shadow: 0 0 12px rgba(0,229,255,0.8); } 100% { box-shadow: 0 0 4px rgba(0,229,255,0.4); } }
      `}</style>

      {/* Collapsed tab */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          style={{
            position: "fixed",
            right: 0,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 200,
            width: 40,
            height: 140,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRight: "none",
            borderRadius: "10px 0 0 10px",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: 0,
          }}
        >
          {/* Pulsing green dot when connected */}
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: 4,
              background: isConnected ? "#22c55e" : "#6b7280",
              boxShadow: isConnected ? "0 0 8px rgba(34,197,94,0.6)" : "none",
              animation: isConnected ? "atcPulseDot 1.2s ease-in-out infinite alternate" : "none",
            }}
          />
          {/* Vertical text */}
          <span
            style={{
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.15em",
              color: "rgba(255,255,255,0.7)",
              fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
            }}
          >
            ATC LIVE
          </span>
        </button>
      )}

      {/* Expanded panel */}
      {expanded && (
        <div
          style={{
            position: "fixed",
            right: 0,
            top: 0,
            bottom: 0,
            width: 320,
            zIndex: 200,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(12px)",
            borderLeft: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            flexDirection: "column",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            animation: "atcSlideIn 0.3s ease",
          }}
        >
          {/* ── Header ── */}
          <div
            style={{
              padding: "16px 14px 12px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              flexShrink: 0,
            }}
          >
            {/* Close + title row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <button
                onClick={() => setExpanded(false)}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "none",
                  color: "rgba(255,255,255,0.5)",
                  cursor: "pointer",
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                ›
              </button>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: "rgba(255,255,255,0.6)",
                  letterSpacing: "0.12em",
                }}
              >
                ATC LIVE
              </span>
              {/* Connection indicator */}
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: "auto" }}>
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    background: isConnected ? "#22c55e" : "#6b7280",
                    boxShadow: isConnected ? "0 0 6px rgba(34,197,94,0.5)" : "none",
                  }}
                />
                <span style={{ fontSize: 9, color: isConnected ? "#22c55e" : "#6b7280", fontWeight: 600 }}>
                  {isConnected ? "LIVE" : "OFFLINE"}
                </span>
              </div>
            </div>

            {/* Airport selector + audio toggle */}
            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={activeAirport || ""}
                onChange={(e) => onAirportChange(e.target.value)}
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "8px 10px",
                  cursor: "pointer",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              >
                <option value="" style={{ background: "#111" }}>
                  Select Airport...
                </option>
                {ATC_AIRPORTS.map((a) => (
                  <option key={a.icao} value={a.icao} style={{ background: "#111" }}>
                    {a.icao} — {a.name}
                  </option>
                ))}
              </select>
              {/* Speaker toggle */}
              <button
                onClick={() => setAudioOn(!audioOn)}
                style={{
                  background: audioOn ? "rgba(0,229,255,0.15)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${audioOn ? "rgba(0,229,255,0.3)" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 8,
                  width: 38,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: audioOn ? "#00e5ff" : "rgba(255,255,255,0.4)",
                  fontSize: 16,
                }}
                title={audioOn ? "Mute ATC audio" : "Play ATC audio"}
              >
                {audioOn ? "🔊" : "🔇"}
              </button>
            </div>
          </div>

          {/* ── Transcript feed ── */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              padding: "8px 0",
            }}
          >
            {transcripts.length === 0 && (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  color: "rgba(255,255,255,0.2)",
                  fontSize: 12,
                }}
              >
                {activeAirport
                  ? "Waiting for ATC transmissions..."
                  : "Select an airport to listen"}
              </div>
            )}

            {transcripts.map((t, i) => {
              const isEmergency =
                alerts.some((a) => a.timestamp === t.timestamp && a.icao === t.icao);
              return (
                <div
                  key={`${t.timestamp}-${i}`}
                  style={{
                    padding: "6px 14px",
                    fontSize: 12,
                    lineHeight: 1.5,
                    background: isEmergency ? "rgba(255,60,0,0.2)" : "transparent",
                    borderLeft: isEmergency ? "3px solid #ff6b35" : "3px solid transparent",
                    animation: "atcFadeInLine 0.15s ease-out",
                  }}
                >
                  {/* Timestamp */}
                  <span style={{ color: "rgba(255,255,255,0.25)", fontFamily: "'SF Mono', Menlo, monospace", fontSize: 10 }}>
                    [{fmtTime(t.timestamp)}]
                  </span>{" "}
                  {/* Callsign (clickable) */}
                  {t.callsign && (
                    <>
                      <button
                        onClick={() => onCallsignClick(t.callsign!, t.lat, t.lng)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#00e5ff",
                          cursor: "pointer",
                          fontWeight: 700,
                          fontSize: 12,
                          fontFamily: "'SF Mono', Menlo, monospace",
                          padding: 0,
                          textDecoration: "none",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
                      >
                        {t.callsign}
                      </button>{" "}
                    </>
                  )}
                  {/* Transcript text */}
                  <span style={{ color: isEmergency ? "#ff8c42" : "rgba(255,255,255,0.8)" }}>
                    {t.text}
                  </span>
                </div>
              );
            })}
          </div>

          {/* ── Footer stats ── */}
          <div
            style={{
              padding: "10px 14px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              justifyContent: "space-between",
              fontSize: 9,
              color: "rgba(255,255,255,0.25)",
              fontFamily: "'SF Mono', Menlo, monospace",
              letterSpacing: "0.05em",
              flexShrink: 0,
            }}
          >
            <span>{transcripts.length} transcripts</span>
            <span>{alerts.length} alerts</span>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { ATCTranscript, ATCAlert } from "@/hooks/useATCFeed";
import atcAirportsJson from "@/data/atc-airports.json";

/* ── ATC airport list derived from the shared JSON ── */
interface ATCFrequency {
  type: string;
  mhz: number;
}

interface ATCAirportEntry {
  icao: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  broadcastifyFeedId: string;
  frequencies: ATCFrequency[];
}

const ATC_AIRPORTS: ATCAirportEntry[] = atcAirportsJson as ATCAirportEntry[];

function getStreamUrl(icao: string): string | null {
  const airport = ATC_AIRPORTS.find((a) => a.icao === icao);
  if (!airport) return null;
  return `https://audio.broadcastify.com/${airport.broadcastifyFeedId}.mp3`;
}

/* ── Alert sound via Web Audio API ── */
let alertCtx: AudioContext | null = null;
function playAlertBeep() {
  try {
    if (!alertCtx) alertCtx = new AudioContext();
    const osc = alertCtx.createOscillator();
    const gain = alertCtx.createGain();
    osc.connect(gain);
    gain.connect(alertCtx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.15, alertCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, alertCtx.currentTime + 0.4);
    osc.start(alertCtx.currentTime);
    osc.stop(alertCtx.currentTime + 0.4);
  } catch {}
}

/* ── Timestamp formatter ── */
function fmtTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
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

  const isHigh = alert.severity === "high" || alert.severity === "critical";

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        background: isHigh
          ? "linear-gradient(135deg, rgba(220,38,38,0.95), rgba(180,30,30,0.95))"
          : "linear-gradient(135deg, rgba(217,119,6,0.92), rgba(180,90,0,0.92))",
        backdropFilter: "blur(16px)",
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
        boxShadow: "0 4px 32px rgba(0,0,0,0.5)",
        animation: "atcBannerSlideIn 0.3s ease-out",
      }}
    >
      <div style={{ width: 8, height: 8, borderRadius: 4, background: "#fff", animation: "atcPulseDot 0.6s ease-in-out infinite alternate", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.05em" }}>
            {alert.icao} — {alert.alertType.replace(/_/g, " ")}
          </span>
          <span style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.7)", background: "rgba(0,0,0,0.2)", padding: "2px 6px", borderRadius: 4 }}>
            {alert.severity}
          </span>
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.9)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {alert.text}
        </div>
      </div>
      <button onClick={onDismiss} style={{ background: "rgba(0,0,0,0.2)", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", width: 28, height: 28, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
        ×
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Audio Engine — manages HTML5 Audio + Web Audio API analyser
   ═══════════════════════════════════════════════════════════════════════════ */

interface AudioEngine {
  audio: HTMLAudioElement;
  ctx: AudioContext;
  analyser: AnalyserNode;
  source: MediaElementAudioSourceNode;
  gainNode: GainNode;
}

function createAudioEngine(streamUrl: string, volume: number): AudioEngine {
  const audio = new Audio();
  audio.crossOrigin = "anonymous";
  audio.preload = "none";
  audio.src = streamUrl;

  const ctx = new AudioContext();
  const source = ctx.createMediaElementSource(audio);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.7;

  const gainNode = ctx.createGain();
  gainNode.gain.value = volume / 100;

  source.connect(analyser);
  analyser.connect(gainNode);
  gainNode.connect(ctx.destination);

  return { audio, ctx, analyser, source, gainNode };
}

function destroyAudioEngine(engine: AudioEngine | null) {
  if (!engine) return;
  try { engine.audio.pause(); } catch {}
  try { engine.audio.removeAttribute("src"); engine.audio.load(); } catch {}
  try { engine.source.disconnect(); } catch {}
  try { engine.analyser.disconnect(); } catch {}
  try { engine.gainNode.disconnect(); } catch {}
  try { engine.ctx.close(); } catch {}
}

/* ═══════════════════════════════════════════════════════════════════════════
   Waveform Visualizer — smooth rounded bars
   ═══════════════════════════════════════════════════════════════════════════ */

const VIS_W = 280;
const VIS_H = 48;
const BAR_W = 3;
const BAR_GAP = 2;
const BAR_COUNT = Math.floor((VIS_W + BAR_GAP) / (BAR_W + BAR_GAP));
const MIN_BAR_H = 1;
const REC_THRESHOLD = 15;

function useWaveformRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  analyser: AnalyserNode | null,
  active: boolean,
  onRecChange: (rec: boolean) => void,
) {
  const rafRef = useRef<number>(0);
  const rollingAvgRef = useRef<number[]>([]);

  useEffect(() => {
    if (!active || !analyser || !canvasRef.current) {
      const c = canvasRef.current;
      if (c) {
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, VIS_W, VIS_H);
          const cy = VIS_H / 2;
          for (let i = 0; i < BAR_COUNT; i++) {
            const x = i * (BAR_W + BAR_GAP);
            ctx.fillStyle = "rgba(255,255,255,0.06)";
            ctx.beginPath();
            ctx.roundRect(x, cy - MIN_BAR_H, BAR_W, MIN_BAR_H * 2, 1);
            ctx.fill();
          }
        }
      }
      onRecChange(false);
      return;
    }

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    function draw() {
      if (!canvasRef.current || !analyser) return;
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;

      analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const avg = sum / dataArray.length;
      const rolling = rollingAvgRef.current;
      rolling.push(avg);
      if (rolling.length > 6) rolling.shift();
      const rollingAvg = rolling.reduce((a, b) => a + b, 0) / rolling.length;
      onRecChange(rollingAvg > REC_THRESHOLD);

      ctx.clearRect(0, 0, VIS_W, VIS_H);
      const cy = VIS_H / 2;
      const binStep = Math.floor(dataArray.length / BAR_COUNT);

      for (let i = 0; i < BAR_COUNT; i++) {
        const binIdx = Math.min(i * binStep, dataArray.length - 1);
        const val = dataArray[binIdx] / 255;
        const barH = Math.max(MIN_BAR_H, val * (VIS_H / 2 - 2));
        const x = i * (BAR_W + BAR_GAP);

        const alpha = 0.15 + val * 0.85;
        ctx.fillStyle = `rgba(52, 211, 153, ${alpha})`;

        ctx.beginPath();
        ctx.roundRect(x, cy - barH, BAR_W, barH * 2, BAR_W / 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rollingAvgRef.current = [];
    };
  }, [active, analyser, canvasRef, onRecChange]);
}

/* ── Highlight search matches ── */
function highlightMatches(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} style={{ background: "rgba(52,211,153,0.3)", color: "#34d399", borderRadius: 2, padding: "0 1px" }}>{part}</mark>
    ) : (
      part
    )
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main ATC Panel — Apple-style design
   ═══════════════════════════════════════════════════════════════════════════ */

interface ATCPanelProps {
  transcripts: ATCTranscript[];
  alerts: ATCAlert[];
  isConnected: boolean;
  isDemo?: boolean;
  activeAirport: string | null;
  onAirportChange: (icao: string) => void;
  onCallsignClick: (callsign: string, lat: number | null, lng: number | null) => void;
}

export default function ATCPanel({
  transcripts,
  alerts,
  isConnected,
  isDemo = false,
  activeAirport,
  onAirportChange,
  onCallsignClick,
}: ATCPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [audioOn, setAudioOn] = useState(false);
  const [volume, setVolume] = useState(70);
  const [isRec, setIsRec] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledRef = useRef(false);
  const prevTranscriptCountRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const engineRef = useRef<AudioEngine | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRecChange = useCallback((rec: boolean) => setIsRec(rec), []);

  const connected = isConnected || isDemo;

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "t" || e.key === "T") setExpanded((prev) => !prev);
      else if (e.key === "m" || e.key === "M") setAudioOn((prev) => !prev);
      else if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useWaveformRenderer(canvasRef, engineRef.current?.analyser ?? null, audioOn && !!activeAirport, handleRecChange);

  // Audio lifecycle
  const startAudio = useCallback((icao: string) => {
    destroyAudioEngine(engineRef.current);
    engineRef.current = null;
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
    if (loadTimerRef.current) { clearTimeout(loadTimerRef.current); loadTimerRef.current = null; }
    setFeedError(null);

    const url = getStreamUrl(icao);
    if (!url) { setFeedError("No stream URL"); return; }

    try {
      const engine = createAudioEngine(url, volume);
      engineRef.current = engine;

      loadTimerRef.current = setTimeout(() => {
        if (engine.audio.readyState < 2) {
          setFeedError("Connecting...");
          scheduleRetry(icao);
        }
      }, 5000);

      engine.audio.addEventListener("canplay", () => {
        if (loadTimerRef.current) { clearTimeout(loadTimerRef.current); loadTimerRef.current = null; }
        setFeedError(null);
      }, { once: true });

      engine.audio.addEventListener("error", () => {
        if (loadTimerRef.current) { clearTimeout(loadTimerRef.current); loadTimerRef.current = null; }
        setFeedError("Reconnecting...");
        scheduleRetry(icao);
      }, { once: true });

      engine.audio.play().catch(() => {
        setFeedError("Tap to enable audio");
      });
    } catch {
      setFeedError("Audio init failed");
      scheduleRetry(icao);
    }
  }, [volume]);

  const scheduleRetry = useCallback((icao: string) => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = setTimeout(() => {
      if (engineRef.current) return;
      startAudio(icao);
    }, 30000);
  }, [startAudio]);

  const stopAudio = useCallback(() => {
    if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
    if (loadTimerRef.current) { clearTimeout(loadTimerRef.current); loadTimerRef.current = null; }
    destroyAudioEngine(engineRef.current);
    engineRef.current = null;
    setFeedError(null);
    setIsRec(false);
  }, []);

  useEffect(() => {
    if (audioOn && activeAirport) startAudio(activeAirport);
    else stopAudio();
    return () => stopAudio();
  }, [audioOn, activeAirport, startAudio, stopAudio]);

  useEffect(() => {
    if (engineRef.current) engineRef.current.gainNode.gain.value = volume / 100;
  }, [volume]);

  // Auto-scroll
  useEffect(() => {
    if (!scrollRef.current || userScrolledRef.current) return;
    if (transcripts.length > prevTranscriptCountRef.current) scrollRef.current.scrollTop = 0;
    prevTranscriptCountRef.current = transcripts.length;
  }, [transcripts.length]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    userScrolledRef.current = scrollRef.current.scrollTop > 40;
  }, []);

  const selectedAirport = ATC_AIRPORTS.find((a) => a.icao === activeAirport);

  return (
    <>
      <style>{`
        @keyframes atcSlideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes atcFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes atcPulseDot { from { opacity: 1; } to { opacity: 0.3; } }
        @keyframes atcBannerSlideIn { from { transform: translateY(-100%); } to { transform: translateY(0); } }
        @keyframes atcLivePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>

      {/* ── Collapsed Tab ── */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          style={{
            position: "fixed",
            right: 0,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 200,
            width: 44,
            background: "rgba(10,10,10,0.85)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRight: "none",
            borderRadius: "12px 0 0 12px",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "14px 6px",
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              background: connected ? "#34d399" : "rgba(255,255,255,0.2)",
              boxShadow: connected ? "0 0 8px rgba(52,211,153,0.5)" : "none",
              animation: connected ? "atcLivePulse 2s ease-in-out infinite" : "none",
            }}
          />
          <span style={{ writingMode: "vertical-rl", textOrientation: "mixed", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "rgba(255,255,255,0.5)", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}>
            ATC
          </span>
        </button>
      )}

      {/* ── Expanded Panel ── */}
      {expanded && (
        <div
          style={{
            position: "fixed",
            right: 0,
            top: 0,
            bottom: 0,
            width: 340,
            zIndex: 200,
            background: "rgba(8,8,10,0.92)",
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
            borderLeft: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            flexDirection: "column",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', sans-serif",
            animation: "atcSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* ── Header ── */}
          <div style={{ padding: "20px 16px 16px", flexShrink: 0 }}>
            {/* Top row: close + title + status */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <button
                onClick={() => setExpanded(false)}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "none",
                  color: "rgba(255,255,255,0.4)",
                  cursor: "pointer",
                  width: 30,
                  height: 30,
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  flexShrink: 0,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
              <span style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.85)", letterSpacing: "-0.01em" }}>
                ATC Live
              </span>

              {/* Live indicator */}
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: "auto" }}>
                <div style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  background: connected ? "#34d399" : "rgba(255,255,255,0.15)",
                  boxShadow: connected ? "0 0 8px rgba(52,211,153,0.5)" : "none",
                  animation: connected ? "atcLivePulse 2s ease-in-out infinite" : "none",
                }} />
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: connected ? "#34d399" : "rgba(255,255,255,0.25)",
                  letterSpacing: "0.04em",
                }}>
                  {connected ? "Live" : "Offline"}
                </span>
              </div>
            </div>

            {/* Airport selector */}
            <div style={{
              background: "rgba(255,255,255,0.04)",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.06)",
              overflow: "hidden",
              marginBottom: 12,
            }}>
              <select
                value={activeAirport || ""}
                onChange={(e) => onAirportChange(e.target.value)}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  color: activeAirport ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)",
                  fontSize: 13,
                  fontWeight: 500,
                  padding: "12px 14px",
                  cursor: "pointer",
                  outline: "none",
                  fontFamily: "inherit",
                  appearance: "none",
                  WebkitAppearance: "none",
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.3)' stroke-width='2' stroke-linecap='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 12px center",
                  paddingRight: 36,
                }}
              >
                <option value="" style={{ background: "#111" }}>Select Airport...</option>
                {ATC_AIRPORTS.map((a) => (
                  <option key={a.icao} value={a.icao} style={{ background: "#111" }}>
                    {a.icao} — {a.city}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected airport name */}
            {selectedAirport && (
              <div style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.3)",
                marginBottom: 12,
                marginTop: -8,
                paddingLeft: 2,
                fontWeight: 400,
              }}>
                {selectedAirport.name}
              </div>
            )}

            {/* Audio Controls */}
            {activeAirport && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {/* Play/Stop button */}
                <button
                  onClick={() => setAudioOn((p) => !p)}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "10px 16px",
                    borderRadius: 12,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    transition: "all 0.2s",
                    background: audioOn ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.06)",
                    color: audioOn ? "#34d399" : "rgba(255,255,255,0.5)",
                  }}
                >
                  {audioOn ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                  )}
                  {audioOn ? "Listening" : "Listen Live"}
                </button>

                {/* Volume */}
                {audioOn && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 4px" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      {volume > 0 && <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />}
                      {volume > 50 && <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />}
                    </svg>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      style={{ width: 60, height: 3, accentColor: "#34d399", cursor: "pointer" }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Waveform + Status */}
            {audioOn && activeAirport && (
              <div style={{ marginTop: 12 }}>
                {feedError && (
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 8, fontWeight: 500 }}>
                    {feedError}
                  </div>
                )}
                <div style={{
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: 10,
                  padding: "8px 4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <canvas
                    ref={canvasRef}
                    width={VIS_W}
                    height={VIS_H}
                    style={{ width: VIS_W, height: VIS_H, display: "block" }}
                  />
                </div>
                {isRec && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                    <div style={{ width: 5, height: 5, borderRadius: 3, background: "#ef4444", boxShadow: "0 0 6px rgba(239,68,68,0.6)", animation: "atcLivePulse 1s ease-in-out infinite" }} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(239,68,68,0.8)", letterSpacing: "0.04em" }}>Transmission Active</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Frequency info bar ── */}
          {selectedAirport && (
            <div style={{
              padding: "8px 16px",
              borderTop: "1px solid rgba(255,255,255,0.04)",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              flexShrink: 0,
            }}>
              {selectedAirport.frequencies.slice(0, 4).map((f, i) => (
                <div key={i} style={{
                  padding: "3px 8px",
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.03)",
                  fontSize: 10,
                  color: "rgba(255,255,255,0.35)",
                  fontFamily: "'SF Mono', Menlo, monospace",
                  fontWeight: 500,
                }}>
                  <span style={{ color: "rgba(255,255,255,0.2)", textTransform: "uppercase", fontSize: 8, marginRight: 4 }}>{f.type}</span>
                  {f.mhz}
                </div>
              ))}
            </div>
          )}

          {/* ── Search ── */}
          {transcripts.length > 0 && (
            <div style={{ padding: "10px 16px 6px", flexShrink: 0 }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(255,255,255,0.04)",
                borderRadius: 10,
                padding: "0 12px",
                border: "1px solid rgba(255,255,255,0.04)",
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    padding: "8px 0",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.7)",
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
                {searchQuery && (
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontWeight: 500 }}>
                    {transcripts.filter((t) => t.text.toLowerCase().includes(searchQuery.toLowerCase()) || (t.callsign || "").toLowerCase().includes(searchQuery.toLowerCase())).length}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ── Transcript Feed ── */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              padding: "6px 0",
            }}
          >
            {transcripts.length === 0 && (
              <div style={{ padding: "60px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" style={{ margin: "0 auto" }}>
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", fontWeight: 500, marginBottom: 4 }}>
                  {activeAirport ? "Waiting for transmissions..." : "Select an airport"}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.12)" }}>
                  {activeAirport ? "Live ATC feed will appear here" : "Choose an airport above to start listening"}
                </div>
              </div>
            )}

            {transcripts
              .filter((t) => {
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                return t.text.toLowerCase().includes(q) || (t.callsign || "").toLowerCase().includes(q);
              })
              .map((t, i) => {
                const isEmergency = alerts.some((a) => a.timestamp === t.timestamp && a.icao === t.icao);
                return (
                  <div
                    key={`${t.timestamp}-${i}`}
                    style={{
                      padding: "10px 16px",
                      borderBottom: "1px solid rgba(255,255,255,0.02)",
                      animation: "atcFadeIn 0.2s ease-out",
                      background: isEmergency ? "rgba(239,68,68,0.06)" : "transparent",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => { if (!isEmergency) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                    onMouseLeave={(e) => { if (!isEmergency) e.currentTarget.style.background = "transparent"; }}
                  >
                    {/* Top row: callsign + time */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      {t.callsign && (
                        <button
                          onClick={() => onCallsignClick(t.callsign!, t.lat, t.lng)}
                          style={{
                            background: "rgba(52,211,153,0.08)",
                            border: "none",
                            color: "#34d399",
                            cursor: "pointer",
                            fontWeight: 600,
                            fontSize: 11,
                            fontFamily: "'SF Mono', Menlo, monospace",
                            padding: "2px 8px",
                            borderRadius: 6,
                            transition: "background 0.15s",
                            letterSpacing: "0.02em",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(52,211,153,0.15)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(52,211,153,0.08)"; }}
                        >
                          {t.callsign}
                        </button>
                      )}
                      {isEmergency && (
                        <span style={{ fontSize: 9, fontWeight: 600, color: "#ef4444", letterSpacing: "0.04em" }}>ALERT</span>
                      )}
                      <span style={{
                        fontSize: 10,
                        color: "rgba(255,255,255,0.15)",
                        marginLeft: "auto",
                        fontFamily: "'SF Mono', Menlo, monospace",
                        fontWeight: 400,
                      }}>
                        {fmtTime(t.timestamp)}
                      </span>
                    </div>
                    {/* Transcript text */}
                    <div style={{
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: isEmergency ? "rgba(248,113,113,0.9)" : "rgba(255,255,255,0.6)",
                      fontWeight: 400,
                      letterSpacing: "-0.005em",
                    }}>
                      {searchQuery ? highlightMatches(t.text, searchQuery) : t.text}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* ── Footer ── */}
          <div style={{
            padding: "12px 16px",
            borderTop: "1px solid rgba(255,255,255,0.04)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 10,
            color: "rgba(255,255,255,0.15)",
            fontWeight: 500,
            flexShrink: 0,
          }}>
            <span>{transcripts.length} transmissions</span>
            <div style={{ display: "flex", gap: 12 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <kbd style={{ background: "rgba(255,255,255,0.05)", padding: "1px 5px", borderRadius: 4, fontSize: 9, fontFamily: "'SF Mono', Menlo, monospace" }}>T</kbd>
                <span>toggle</span>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <kbd style={{ background: "rgba(255,255,255,0.05)", padding: "1px 5px", borderRadius: 4, fontSize: 9, fontFamily: "'SF Mono', Menlo, monospace" }}>M</kbd>
                <span>mute</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

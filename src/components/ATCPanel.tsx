"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ATCTranscript, ATCAlert } from "@/hooks/useATCFeed";

/* ── ATC airport list + Broadcastify stream URLs ── */
const ATC_AIRPORTS: { icao: string; name: string; stream: string }[] = [
  { icao: "KJFK", name: "John F. Kennedy", stream: "https://audio.broadcastify.com/tebmyznqc8audm.mp3" },
  { icao: "KLAX", name: "Los Angeles", stream: "https://audio.broadcastify.com/000000000.mp3" },
  { icao: "KORD", name: "Chicago O'Hare", stream: "https://audio.broadcastify.com/000000001.mp3" },
  { icao: "KATL", name: "Hartsfield-Jackson", stream: "https://audio.broadcastify.com/000000002.mp3" },
  { icao: "KDFW", name: "Dallas/Fort Worth", stream: "https://audio.broadcastify.com/000000003.mp3" },
  { icao: "KDEN", name: "Denver", stream: "https://audio.broadcastify.com/000000004.mp3" },
  { icao: "KSFO", name: "San Francisco", stream: "https://audio.broadcastify.com/000000005.mp3" },
  { icao: "KBOS", name: "Boston Logan", stream: "https://audio.broadcastify.com/000000006.mp3" },
  { icao: "KMIA", name: "Miami", stream: "https://audio.broadcastify.com/000000007.mp3" },
  { icao: "KEWR", name: "Newark Liberty", stream: "https://audio.broadcastify.com/000000008.mp3" },
];

function getStreamUrl(icao: string): string | null {
  return ATC_AIRPORTS.find((a) => a.icao === icao)?.stream ?? null;
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
   Waveform Visualizer — draws mirrored vertical bars on a canvas
   ═══════════════════════════════════════════════════════════════════════════ */

const VIS_W = 280;
const VIS_H = 40;
const BAR_W = 8;
const BAR_GAP = 4;
const BAR_COUNT = Math.floor((VIS_W + BAR_GAP) / (BAR_W + BAR_GAP));
const MIN_BAR_H = 2;
const REC_THRESHOLD = 15; // amplitude avg above this → someone is transmitting

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
      // Draw flatline when inactive
      const c = canvasRef.current;
      if (c) {
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, VIS_W, VIS_H);
          const cy = VIS_H / 2;
          ctx.fillStyle = "rgba(0,212,255,0.25)";
          for (let i = 0; i < BAR_COUNT; i++) {
            const x = i * (BAR_W + BAR_GAP);
            ctx.fillRect(x, cy - MIN_BAR_H, BAR_W, MIN_BAR_H * 2);
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

      // Compute average amplitude for REC indicator (rolling 100ms ~ 6 frames at 60fps)
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const avg = sum / dataArray.length;
      const rolling = rollingAvgRef.current;
      rolling.push(avg);
      if (rolling.length > 6) rolling.shift();
      const rollingAvg = rolling.reduce((a, b) => a + b, 0) / rolling.length;
      onRecChange(rollingAvg > REC_THRESHOLD);

      // Clear canvas
      ctx.clearRect(0, 0, VIS_W, VIS_H);

      const cy = VIS_H / 2;
      const binStep = Math.floor(dataArray.length / BAR_COUNT);

      for (let i = 0; i < BAR_COUNT; i++) {
        // Sample from frequency bins, bias toward lower frequencies (voice range)
        const binIdx = Math.min(i * binStep, dataArray.length - 1);
        const val = dataArray[binIdx] / 255;
        const barH = Math.max(MIN_BAR_H, val * (VIS_H / 2 - 2));

        const x = i * (BAR_W + BAR_GAP);

        // Gradient-like effect: brighter at center
        const brightness = 0.4 + val * 0.6;
        ctx.fillStyle = `rgba(0,212,255,${brightness})`;

        // Mirror vertically from center
        ctx.fillRect(x, cy - barH, BAR_W, barH); // top half
        ctx.fillRect(x, cy, BAR_W, barH);         // bottom half
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

/* ═══════════════════════════════════════════════════════════════════════════
   Main ATC Panel
   ═══════════════════════════════════════════════════════════════════════════ */

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
  const [volume, setVolume] = useState(70);
  const [isRec, setIsRec] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledRef = useRef(false);
  const prevTranscriptCountRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Audio engine ref
  const engineRef = useRef<AudioEngine | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stabilize the onRecChange callback
  const handleRecChange = useCallback((rec: boolean) => setIsRec(rec), []);

  // Waveform renderer
  useWaveformRenderer(
    canvasRef,
    engineRef.current?.analyser ?? null,
    audioOn && !!activeAirport,
    handleRecChange,
  );

  // ── Core audio lifecycle ──
  const startAudio = useCallback((icao: string) => {
    // Destroy previous
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

      // 5-second load timeout
      loadTimerRef.current = setTimeout(() => {
        if (engine.audio.readyState < 2) {
          setFeedError("Feed offline");
          scheduleRetry(icao);
        }
      }, 5000);

      engine.audio.addEventListener("canplay", () => {
        if (loadTimerRef.current) { clearTimeout(loadTimerRef.current); loadTimerRef.current = null; }
        setFeedError(null);
      }, { once: true });

      engine.audio.addEventListener("error", () => {
        if (loadTimerRef.current) { clearTimeout(loadTimerRef.current); loadTimerRef.current = null; }
        setFeedError("Feed offline");
        scheduleRetry(icao);
      }, { once: true });

      engine.audio.play().catch(() => {
        setFeedError("Autoplay blocked");
      });
    } catch (err) {
      setFeedError("Audio init failed");
      scheduleRetry(icao);
    }
  }, [volume]);

  const scheduleRetry = useCallback((icao: string) => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = setTimeout(() => {
      if (engineRef.current) return; // already replaced
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

  // Toggle audio on/off
  useEffect(() => {
    if (audioOn && activeAirport) {
      startAudio(activeAirport);
    } else {
      stopAudio();
    }
    return () => stopAudio();
  }, [audioOn, activeAirport, startAudio, stopAudio]);

  // Volume changes
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.gainNode.gain.value = volume / 100;
    }
  }, [volume]);

  // Auto-scroll logic
  useEffect(() => {
    if (!scrollRef.current || userScrolledRef.current) return;
    if (transcripts.length > prevTranscriptCountRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    prevTranscriptCountRef.current = transcripts.length;
  }, [transcripts.length]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    userScrolledRef.current = scrollRef.current.scrollTop > 40;
  }, []);

  return (
    <>
      {/* Injected keyframe styles */}
      <style>{`
        @keyframes atcSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes atcFadeInLine { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes atcPulseDot { from { opacity: 1; } to { opacity: 0.3; } }
        @keyframes atcBannerSlideIn { from { transform: translateY(-100%); } to { transform: translateY(0); } }
        @keyframes atcRecPulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
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

              {/* REC indicator */}
              {audioOn && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 4 }}>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      background: isRec ? "#ef4444" : "rgba(239,68,68,0.25)",
                      boxShadow: isRec ? "0 0 8px rgba(239,68,68,0.7)" : "none",
                      animation: isRec ? "atcRecPulse 0.8s ease-in-out infinite" : "none",
                      transition: "background 0.15s, box-shadow 0.15s",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      color: isRec ? "#ef4444" : "rgba(239,68,68,0.3)",
                      letterSpacing: "0.1em",
                      transition: "color 0.15s",
                    }}
                  >
                    REC
                  </span>
                </div>
              )}

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
                onClick={() => setAudioOn((p) => !p)}
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
                {audioOn ? "\u{1F50A}" : "\u{1F507}"}
              </button>
            </div>

            {/* ── Waveform visualizer + volume ── */}
            {audioOn && activeAirport && (
              <div style={{ marginTop: 10 }}>
                {/* Feed error message */}
                {feedError && (
                  <div
                    style={{
                      fontSize: 10,
                      color: "#f87171",
                      marginBottom: 6,
                      fontWeight: 600,
                      letterSpacing: "0.05em",
                    }}
                  >
                    {feedError} — retrying...
                  </div>
                )}

                {/* Canvas waveform */}
                <canvas
                  ref={canvasRef}
                  width={VIS_W}
                  height={VIS_H}
                  style={{
                    width: VIS_W,
                    height: VIS_H,
                    display: "block",
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.02)",
                  }}
                />

                {/* Volume slider */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round">
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
                    style={{
                      flex: 1,
                      height: 4,
                      accentColor: "#00d4ff",
                      cursor: "pointer",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 9,
                      color: "rgba(255,255,255,0.3)",
                      fontFamily: "'SF Mono', Menlo, monospace",
                      minWidth: 28,
                      textAlign: "right",
                    }}
                  >
                    {volume}%
                  </span>
                </div>
              </div>
            )}
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
              const isEmergency = alerts.some(
                (a) => a.timestamp === t.timestamp && a.icao === t.icao
              );
              return (
                <div
                  key={`${t.timestamp}-${i}`}
                  style={{
                    padding: "6px 14px",
                    fontSize: 12,
                    lineHeight: 1.5,
                    background: isEmergency ? "rgba(255,60,0,0.2)" : "transparent",
                    borderLeft: isEmergency
                      ? "3px solid #ff6b35"
                      : "3px solid transparent",
                    animation: "atcFadeInLine 0.15s ease-out",
                  }}
                >
                  <span
                    style={{
                      color: "rgba(255,255,255,0.25)",
                      fontFamily: "'SF Mono', Menlo, monospace",
                      fontSize: 10,
                    }}
                  >
                    [{fmtTime(t.timestamp)}]
                  </span>{" "}
                  {t.callsign && (
                    <>
                      <button
                        onClick={() =>
                          onCallsignClick(t.callsign!, t.lat, t.lng)
                        }
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
                        onMouseEnter={(e) => {
                          e.currentTarget.style.textDecoration = "underline";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.textDecoration = "none";
                        }}
                      >
                        {t.callsign}
                      </button>{" "}
                    </>
                  )}
                  <span
                    style={{
                      color: isEmergency
                        ? "#ff8c42"
                        : "rgba(255,255,255,0.8)",
                    }}
                  >
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

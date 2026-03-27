"use client";

import { useState, useEffect, useCallback } from "react";

interface AirplaneWindowIntroProps {
  onComplete: () => void;
}

export default function AirplaneWindowIntro({ onComplete }: AirplaneWindowIntroProps) {
  const [phase, setPhase] = useState<"window" | "expanding" | "done">("window");
  const [labelVisible, setLabelVisible] = useState(true);

  const finish = useCallback(() => {
    setPhase("done");
    try { sessionStorage.setItem("skyway_intro_seen", "true"); } catch {}
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    // 300ms: fade out label
    const t1 = setTimeout(() => setLabelVisible(false), 300);
    // 400ms: start expanding
    const t2 = setTimeout(() => setPhase("expanding"), 400);
    // 1300ms: expansion done, remove overlay
    const t3 = setTimeout(finish, 1300);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [finish]);

  if (phase === "done") return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden",
      fontFamily: "-apple-system, 'SF Pro Display', system-ui, sans-serif",
    }}>
      <style>{`
        @keyframes windowExpand {
          0% {
            width: 340px; height: 420px;
            border-radius: 45% / 40%;
            border-width: 18px;
            box-shadow: inset 0 0 40px rgba(0,0,0,0.4), 0 0 80px rgba(0,0,0,0.8);
          }
          50% {
            border-radius: 30% / 25%;
            border-width: 10px;
            box-shadow: inset 0 0 20px rgba(0,0,0,0.2), 0 0 40px rgba(0,0,0,0.4);
          }
          100% {
            width: 300vmax; height: 300vmax;
            border-radius: 0%;
            border-width: 0px;
            box-shadow: none;
          }
        }
        @keyframes cabinFade {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes skyToTransparent {
          0% { background: linear-gradient(180deg, #87CEEB 0%, #B8D4E8 60%, #E8F4F8 100%); }
          100% { background: transparent; }
        }
      `}</style>

      {/* Cabin interior background */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at center, #2a1f10 0%, #1a1208 50%, #0d0a04 100%)",
        animation: phase === "expanding" ? "cabinFade 600ms 200ms ease-out forwards" : undefined,
      }} />

      {/* Airplane window */}
      <div style={{
        position: "relative",
        width: phase === "expanding" ? undefined : 340,
        height: phase === "expanding" ? undefined : 420,
        borderRadius: phase === "expanding" ? undefined : "45% / 40%",
        border: `${phase === "expanding" ? 0 : 18}px solid #C4A882`,
        overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: phase === "expanding" ? undefined : "inset 0 0 40px rgba(0,0,0,0.4), 0 0 80px rgba(0,0,0,0.8), inset 0 0 0 4px #8B7355",
        animation: phase === "expanding" ? "windowExpand 900ms cubic-bezier(0.4, 0, 0.2, 1) forwards" : undefined,
        zIndex: 1,
      }}>
        {/* Sky view inside window — transitions to transparent to reveal map */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, #87CEEB 0%, #B8D4E8 60%, #E8F4F8 100%)",
          animation: phase === "expanding" ? "skyToTransparent 500ms 400ms ease-out forwards" : undefined,
        }}>
          {/* Cloud wisps */}
          <div style={{
            position: "absolute", top: "30%", left: "10%", width: "80%", height: 3,
            background: "rgba(255,255,255,0.6)", borderRadius: 2, filter: "blur(4px)",
            transform: "rotate(-2deg)",
          }} />
          <div style={{
            position: "absolute", top: "45%", left: "20%", width: "60%", height: 2,
            background: "rgba(255,255,255,0.4)", borderRadius: 2, filter: "blur(6px)",
            transform: "rotate(1deg)",
          }} />
          <div style={{
            position: "absolute", top: "55%", left: "5%", width: "50%", height: 4,
            background: "rgba(255,255,255,0.5)", borderRadius: 2, filter: "blur(8px)",
            transform: "rotate(-1deg)",
          }} />
        </div>

        {/* SkyWay label inside window */}
        <span style={{
          position: "relative", zIndex: 2,
          fontSize: 18, fontWeight: 300, color: "#fff",
          letterSpacing: "0.2em", textTransform: "uppercase",
          textShadow: "0 2px 12px rgba(0,0,0,0.3)",
          opacity: labelVisible ? 1 : 0,
          transition: "opacity 0.3s ease",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}>
          SkyWay
        </span>
      </div>

      {/* Skip button */}
      <button
        onClick={finish}
        style={{
          position: "absolute", bottom: 32, right: 32,
          background: "none", border: "none",
          color: "rgba(255,255,255,0.4)", fontSize: 13,
          cursor: "pointer", zIndex: 2,
          letterSpacing: "0.05em",
        }}
      >
        Skip
      </button>
    </div>
  );
}

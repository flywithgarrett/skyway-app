"use client";

import { useState, useEffect } from "react";

interface LoadingScreenProps {
  onComplete?: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // Animate progress bar over 2.5 seconds
    const start = Date.now();
    const duration = 2500;
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);
      if (elapsed < duration) {
        requestAnimationFrame(tick);
      } else {
        // Progress complete — fade out
        setFadeOut(true);
        setTimeout(() => {
          setHidden(true);
          onComplete?.();
        }, 600);
      }
    };
    requestAnimationFrame(tick);
  }, [onComplete]);

  if (hidden) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#0A0A0F",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      transition: "opacity 0.6s ease",
      opacity: fadeOut ? 0 : 1,
      pointerEvents: fadeOut ? "none" : "auto",
      fontFamily: "-apple-system, 'SF Pro Display', system-ui, sans-serif",
    }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

      {/* Logo with shimmer */}
      <div style={{
        fontSize: 48, fontWeight: 700, letterSpacing: "-0.03em",
        background: "linear-gradient(90deg, #FFFFFF 30%, rgba(255,255,255,0.4) 50%, #FFFFFF 70%)",
        backgroundSize: "200% auto",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        animation: "shimmer 2s ease-in-out infinite",
        userSelect: "none",
      }}>
        SkyWay
      </div>

      {/* Tagline */}
      <div style={{
        fontSize: 13, color: "rgba(255,255,255,0.30)", marginTop: 8,
        letterSpacing: "0.06em", fontWeight: 500,
      }}>
        LIVE FLIGHT TRACKER
      </div>

      {/* Progress bar */}
      <div style={{
        width: 200, height: 2, borderRadius: 1,
        background: "rgba(255,255,255,0.06)",
        marginTop: 32, overflow: "hidden",
      }}>
        <div style={{
          width: `${progress}%`,
          height: "100%",
          background: "linear-gradient(90deg, #0A84FF, #0A84FF)",
          borderRadius: 1,
          transition: "width 0.1s linear",
        }} />
      </div>
    </div>
  );
}

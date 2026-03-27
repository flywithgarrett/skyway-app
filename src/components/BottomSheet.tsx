"use client";

import { useRef, useState, useCallback, useEffect, ReactNode } from "react";

interface BottomSheetProps {
  children: ReactNode;
  onClose: () => void;
  initialHeight?: number; // percentage: 25, 50, 95
  snapPoints?: number[];
  showBackdrop?: boolean;
}

export default function BottomSheet({
  children, onClose,
  initialHeight = 50,
  snapPoints = [25, 50, 95],
  showBackdrop = true,
}: BottomSheetProps) {
  const [height, setHeight] = useState(initialHeight);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const startHeight = useRef(initialHeight);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    startHeight.current = height;
    setDragging(true);
  }, [height]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging) return;
    const delta = startY.current - e.touches[0].clientY;
    const newHeight = Math.max(10, Math.min(95, startHeight.current + (delta / window.innerHeight * 100)));
    setHeight(newHeight);
  }, [dragging]);

  const handleTouchEnd = useCallback(() => {
    setDragging(false);
    // Snap to nearest point
    const closest = snapPoints.reduce((a, b) =>
      Math.abs(b - height) < Math.abs(a - height) ? b : a
    );
    if (height < 15) {
      onClose();
    } else {
      setHeight(closest);
    }
    // Haptic feedback
    try { navigator.vibrate?.(10); } catch {}
  }, [height, snapPoints, onClose]);

  // Close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      {showBackdrop && (
        <div
          onClick={onClose}
          style={{
            position: "fixed", inset: 0, zIndex: 45,
            background: `rgba(0,0,0,${Math.min(0.5, height / 100 * 0.6)})`,
            transition: dragging ? "none" : "opacity 0.3s ease",
          }}
        />
      )}
      <div
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50,
          height: `${height}vh`,
          background: "rgba(17,17,24,0.98)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          borderRadius: "20px 20px 0 0",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.4)",
          transition: dragging ? "none" : "height 350ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          display: "flex", flexDirection: "column",
          fontFamily: "-apple-system, 'SF Pro Display', system-ui, sans-serif",
          overflow: "hidden",
        }}
      >
        {/* Drag handle */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={(e) => {
            startY.current = e.clientY;
            startHeight.current = height;
            setDragging(true);
            const onMove = (ev: MouseEvent) => {
              const delta = startY.current - ev.clientY;
              setHeight(Math.max(10, Math.min(95, startHeight.current + (delta / window.innerHeight * 100))));
            };
            const onUp = () => {
              setDragging(false);
              const closest = snapPoints.reduce((a, b) =>
                Math.abs(b - height) < Math.abs(a - height) ? b : a
              );
              if (height < 15) onClose();
              else setHeight(closest);
              window.removeEventListener("mousemove", onMove);
              window.removeEventListener("mouseup", onUp);
            };
            window.addEventListener("mousemove", onMove);
            window.addEventListener("mouseup", onUp);
          }}
          style={{
            padding: "10px 0 6px", cursor: "grab",
            display: "flex", justifyContent: "center", flexShrink: 0,
          }}
        >
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: "rgba(255,255,255,0.25)",
          }} />
        </div>

        {/* Content */}
        <div className="scroll-container" style={{ flex: 1, overflow: "auto" }}>
          {children}
        </div>
      </div>
    </>
  );
}

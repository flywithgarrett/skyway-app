"use client";

import { useState, useRef, useEffect } from "react";
import { Flight } from "@/lib/types";

interface SearchOverlayProps {
  flights: Flight[];
  onSelect: (flight: Flight) => void;
  onClose: () => void;
}

export default function SearchOverlay({ flights, onSelect, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const q = query.toLowerCase().trim();
  const results = q.length < 1
    ? []
    : flights
        .filter(
          (f) =>
            f.flightNumber.toLowerCase().includes(q) ||
            f.airline.name.toLowerCase().includes(q) ||
            f.origin.code.toLowerCase().includes(q) ||
            f.destination.code.toLowerCase().includes(q) ||
            f.origin.city.toLowerCase().includes(q) ||
            f.destination.city.toLowerCase().includes(q)
        )
        .slice(0, 20);

  return (
    <div className="fixed inset-0 z-50 flex flex-col glass-overlay">
      {/* Search bar */}
      <div className="flex items-center gap-3 px-4 py-3 glass-bar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 4px rgba(0,229,255,0.3))" }}>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search flights, airports, airlines..."
          className="flex-1 bg-transparent outline-none text-sm text-white/80 placeholder:text-white/20"
        />
        <button onClick={onClose} className="text-xs font-medium px-2.5 py-1 rounded-xl text-glow-cyan glass-button">
          Cancel
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {q.length > 0 && results.length === 0 && (
          <div className="text-center py-16 text-sm text-white/25">
            No flights found for &quot;{query}&quot;
          </div>
        )}

        {results.map((flight) => (
          <button
            key={flight.id}
            onClick={() => {
              onSelect(flight);
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 transition-all hover:bg-white/[0.03] text-left"
            style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.03)" }}
          >
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center text-[9px] font-bold shrink-0"
              style={{
                background: `linear-gradient(135deg, ${flight.airline.color}, ${flight.airline.color}88)`,
                color: "#fff",
              }}
            >
              {flight.airline.code}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-glow-cyan">{flight.flightNumber}</span>
                <span className="text-[10px] text-white/25">{flight.airline.name}</span>
              </div>
              <div className="text-[11px] mt-0.5 text-white/30">
                {flight.origin.code} ({flight.origin.city}) → {flight.destination.code} ({flight.destination.city})
              </div>
            </div>
            <div className="shrink-0">
              <span
                className="text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full tracking-wide"
                style={{
                  color: flight.status === "en-route" ? "#34d399" : flight.status === "delayed" ? "#ef4444" : "#00e5ff",
                  background:
                    flight.status === "en-route"
                      ? "rgba(52,211,153,0.08)"
                      : flight.status === "delayed"
                        ? "rgba(239,68,68,0.08)"
                        : "rgba(0,229,255,0.08)",
                }}
              >
                {flight.status}
              </span>
            </div>
          </button>
        ))}

        {q.length === 0 && (
          <div className="text-center py-16">
            <div className="text-white/20 text-sm">Start typing to search flights...</div>
            <div className="text-white/10 text-[10px] mt-2">Search by flight number, airline, airport code, or city</div>
          </div>
        )}
      </div>
    </div>
  );
}

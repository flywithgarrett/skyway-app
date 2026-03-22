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
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(10,22,40,0.97)" }}>
      {/* Search bar */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid rgba(59,184,232,0.15)" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3bb8e8" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search flights, airports, airlines..."
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: "#e0e7ef" }}
        />
        <button onClick={onClose} className="text-sm font-medium px-2 py-1" style={{ color: "#3bb8e8" }}>
          Cancel
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {q.length > 0 && results.length === 0 && (
          <div className="text-center py-12 text-sm" style={{ color: "#4a6080" }}>
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
            className="w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/5 text-left"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: flight.airline.color, color: "#fff" }}
            >
              {flight.airline.code}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm" style={{ color: "#e0e7ef" }}>
                  {flight.flightNumber}
                </span>
                <span className="text-xs" style={{ color: "#4a6080" }}>{flight.airline.name}</span>
              </div>
              <div className="text-xs mt-0.5" style={{ color: "#6b8299" }}>
                {flight.origin.code} ({flight.origin.city}) → {flight.destination.code} ({flight.destination.city})
              </div>
            </div>
            <div className="shrink-0">
              <span
                className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full"
                style={{
                  color: flight.status === "en-route" ? "#22c55e" : flight.status === "delayed" ? "#ef4444" : "#3bb8e8",
                  background:
                    flight.status === "en-route"
                      ? "rgba(34,197,94,0.12)"
                      : flight.status === "delayed"
                        ? "rgba(239,68,68,0.12)"
                        : "rgba(59,184,232,0.12)",
                }}
              >
                {flight.status}
              </span>
            </div>
          </button>
        ))}

        {q.length === 0 && (
          <div className="text-center py-12 text-sm" style={{ color: "#4a6080" }}>
            Start typing to search flights...
          </div>
        )}
      </div>
    </div>
  );
}

// Aviation-grade data formatting utilities

const COMPASS_DIRS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"] as const;

/** Format altitude as Flight Level (above 18,000 ft) or standard feet */
export function fmtAltitude(feet: number): string {
  if (feet <= 0) return "---";
  if (feet >= 18000) return `FL${Math.round(feet / 100)}`;
  return `${feet.toLocaleString()} ft`;
}

/** Format heading with compass direction (e.g., "138° SE") */
export function fmtHeading(deg: number): string {
  if (deg <= 0 && deg >= 0) return "---";
  const idx = Math.round(((deg % 360) + 360) % 360 / 22.5) % 16;
  return `${Math.round(deg)}° ${COMPASS_DIRS[idx]}`;
}

/** Format speed in knots */
export function fmtSpeed(kts: number): string {
  if (kts <= 0) return "---";
  return `${kts} kts`;
}

/** Format time from ISO string */
export function fmtTime(iso: string | null): string {
  if (!iso) return "---";
  try {
    const d = new Date(iso);
    return `${d.getUTCHours().toString().padStart(2, "0")}:${d.getUTCMinutes().toString().padStart(2, "0")}Z`;
  } catch { return "---"; }
}

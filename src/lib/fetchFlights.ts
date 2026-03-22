import { Flight } from "./types";
import { lookupAirline, UNKNOWN_AIRPORT } from "./data";

// --- Server-side cache (30s TTL) to protect AeroAPI rate limits ---
let cache: { data: Flight[]; timestamp: number } | null = null;
const CACHE_TTL = 30000;

const FA_BASE = "https://aeroapi.flightaware.com/aeroapi";
const MAX_FLIGHTS = 200;

function faHeaders(): Record<string, string> {
  const key = process.env.FLIGHTAWARE_API_KEY;
  if (!key) throw new Error("FLIGHTAWARE_API_KEY not set");
  return { "x-apikey": key, Accept: "application/json" };
}

function mapAirport(
  fa: { code_iata?: string; code_icao?: string; name?: string; city?: string; latitude?: number; longitude?: number } | null | undefined
): Flight["origin"] {
  if (!fa) return { ...UNKNOWN_AIRPORT };
  return {
    code: fa.code_iata || fa.code_icao || "---",
    icao: fa.code_icao || "----",
    name: fa.name || "Unknown",
    city: fa.city || "---",
    country: "",
    lat: fa.latitude || 0,
    lng: fa.longitude || 0,
  };
}

function mapStatus(s: string | undefined): Flight["status"] {
  if (!s) return "unknown";
  const lower = s.toLowerCase();
  if (lower.includes("en route") || lower.includes("enroute") || lower === "active") return "en-route";
  if (lower.includes("landed") || lower.includes("arrived")) return "landed";
  if (lower.includes("scheduled") || lower.includes("filed")) return "scheduled";
  if (lower.includes("taxi")) return "taxiing";
  return "unknown";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformFlight(f: any): Flight | null {
  const pos = f.last_position;
  if (!pos) return null;
  const lat = pos.latitude;
  const lng = pos.longitude;
  if (lat == null || lng == null) return null;

  const ident: string = f.ident || f.ident_iata || "";
  const airline = lookupAirline(f.ident_icao || ident);

  return {
    id: f.fa_flight_id || ident,
    flightNumber: f.ident_iata || f.ident || ident,
    callsign: f.ident_icao || f.ident || "",
    airline,
    origin: mapAirport(f.origin),
    destination: mapAirport(f.destination),
    status: mapStatus(f.status),
    scheduledDep: f.scheduled_out || f.scheduled_off || null,
    actualDep: f.actual_out || f.actual_off || null,
    scheduledArr: f.scheduled_in || f.scheduled_on || null,
    estimatedArr: f.estimated_in || f.estimated_on || null,
    actualArr: f.actual_in || f.actual_on || null,
    aircraft: f.aircraft_type || null,
    registration: f.registration || null,
    altitude: (pos.altitude || 0) * 100, // AeroAPI returns altitude in hundreds of feet
    speed: pos.groundspeed || 0,
    heading: pos.heading || 0,
    progress: f.progress_percent || 0,
    currentLat: lat,
    currentLng: lng,
    originCountry: "",
    onGround: pos.altitude != null && pos.altitude < 1,
    verticalRate: null,
    squawk: null,
    geoAltitude: (pos.altitude || 0) * 100,
    lastContact: pos.timestamp ? Math.floor(new Date(pos.timestamp).getTime() / 1000) : Math.floor(Date.now() / 1000),
    routeDistance: f.route_distance ? Math.round(f.route_distance) : null,
  };
}

// --- Main fetch: FlightAware AeroAPI v4 — airborne flights only ---

export async function fetchLiveFlights(): Promise<{ flights: Flight[]; source: string; error?: string }> {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return { flights: cache.data, source: "cache" };
  }

  const apiKey = process.env.FLIGHTAWARE_API_KEY;
  if (!apiKey) {
    console.error("[SkyWay] FATAL: FLIGHTAWARE_API_KEY not set.");
    return { flights: [], source: "error:no-api-key", error: "FlightAware API Key Missing — set FLIGHTAWARE_API_KEY in environment variables." };
  }

  try {
    console.log("[SkyWay] Fetching FlightAware AeroAPI v4 (airborne flights)...");

    // Simple query — all filtering done server-side after fetch
    const url = `${FA_BASE}/flights/search?query=${encodeURIComponent("-inAir 1")}&max_pages=1`;
    const res = await fetch(url, {
      headers: faHeaders(),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[SkyWay] AeroAPI FAILED — HTTP ${res.status} ${res.statusText}`);
      console.error(`[SkyWay] Response body: ${body.substring(0, 500)}`);

      const reason = res.status === 401 ? "Unauthorized — Check API Key"
        : res.status === 403 ? "Forbidden — API key lacks permission for this endpoint"
        : res.status === 429 ? "Rate Limited — Too many requests, increase cache TTL"
        : res.status === 402 ? "Payment Required — Upgrade FlightAware plan"
        : `${res.statusText || "Unknown error"}`;
      const errorMsg = `FlightAware API Error: ${res.status} ${reason}`;

      if (cache) {
        console.warn("[SkyWay] Returning stale cache.");
        return { flights: cache.data, source: "stale-cache" };
      }
      return { flights: [], source: `error:http-${res.status}`, error: errorMsg };
    }

    const json = await res.json();
    const rawFlights: unknown[] = json.flights || [];
    console.log(`[SkyWay] AeroAPI returned ${rawFlights.length} raw flights`);

    // Server-side filtering: commercial airliners over North America
    const flights: Flight[] = [];
    for (const f of rawFlights) {
      if (flights.length >= MAX_FLIGHTS) break;
      const mapped = transformFlight(f);
      if (!mapped || mapped.onGround) continue;
      // Require 3-letter ICAO airline prefix (UAL, DAL, AAL) — skip GA tail numbers
      const cs = mapped.callsign;
      if (!cs || cs.length < 4 || !/^[A-Z]{3}/.test(cs)) continue;
      // Altitude filter: above FL200 (20,000 ft) — skip low GA/helicopters
      if (mapped.altitude < 20000) continue;
      // Geographic bounding box: North America (lat 24-50, lng -130 to -60)
      if (mapped.currentLat < 24 || mapped.currentLat > 50 || mapped.currentLng < -130 || mapped.currentLng > -60) continue;
      flights.push(mapped);
    }

    console.log(`[SkyWay] ${flights.length} airborne flights (capped at ${MAX_FLIGHTS})`);

    cache = { data: flights, timestamp: Date.now() };
    return { flights, source: "flightaware" };
  } catch (err) {
    console.error("[SkyWay] AeroAPI network error:", err instanceof Error ? err.message : String(err));

    if (cache) {
      console.warn("[SkyWay] Returning stale cache after network error.");
      return { flights: cache.data, source: "stale-cache" };
    }
    return { flights: [], source: "error:network", error: `Network Error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

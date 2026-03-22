import { Flight } from "./types";
import { lookupAirline, UNKNOWN_AIRPORT } from "./data";

// --- Aggressive server-side cache (30s TTL) to protect API costs ---
let cache: { data: Flight[]; timestamp: number } | null = null;
const CACHE_TTL = 30000;

const FA_BASE = "https://aeroapi.flightaware.com/aeroapi";

function faHeaders(): Record<string, string> {
  const key = process.env.FLIGHTAWARE_API_KEY;
  if (!key) throw new Error("FLIGHTAWARE_API_KEY not set");
  return { "x-apikey": key, Accept: "application/json" };
}

function mapAirport(fa: { code_iata?: string; code_icao?: string; name?: string; city?: string; latitude?: number; longitude?: number } | null | undefined): Flight["origin"] {
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
    altitude: (pos.altitude || 0) * 100,
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

// --- Main fetch function (NO mock data — empty array on failure) ---

export async function fetchLiveFlights(): Promise<{ flights: Flight[]; source: string; error?: string }> {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return { flights: cache.data, source: "cache" };
  }

  const apiKey = process.env.FLIGHTAWARE_API_KEY;
  if (!apiKey) {
    console.error("[SkyWay] FATAL: FLIGHTAWARE_API_KEY environment variable is not set. Add it to your Vercel environment variables.");
    return { flights: [], source: "error:no-api-key" };
  }

  try {
    console.log("[SkyWay] Fetching FlightAware AeroAPI...");

    const url = `${FA_BASE}/flights/search?query=-latlong+"20 -130 65 60"&max_pages=1`;
    const res = await fetch(url, {
      headers: faHeaders(),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[SkyWay] AeroAPI FAILED — HTTP ${res.status} ${res.statusText}`);
      console.error(`[SkyWay] Response body: ${body.substring(0, 500)}`);

      if (res.status === 401) console.error("[SkyWay] CAUSE: Invalid API key. Check FLIGHTAWARE_API_KEY in Vercel env vars.");
      if (res.status === 403) console.error("[SkyWay] CAUSE: API key lacks permission for this endpoint.");
      if (res.status === 429) console.error("[SkyWay] CAUSE: Rate limit exceeded. Cache TTL may be too aggressive.");

      const reason = res.status === 401 ? "Unauthorized — Check API Key"
        : res.status === 403 ? "Forbidden — API key lacks permission"
        : res.status === 429 ? "Rate Limited — Too many requests"
        : `${res.statusText || "Unknown error"}`;
      const errorMsg = `FlightAware API Error: ${res.status} ${reason}`;

      if (cache) {
        console.warn("[SkyWay] Returning stale cache from previous successful fetch.");
        return { flights: cache.data, source: "stale-cache" };
      }
      return { flights: [], source: `error:http-${res.status}`, error: errorMsg };
    }

    const json = await res.json();
    const rawFlights: unknown[] = json.flights || [];
    console.log(`[SkyWay] AeroAPI returned ${rawFlights.length} flights`);

    const flights: Flight[] = [];
    for (const f of rawFlights) {
      const mapped = transformFlight(f);
      if (mapped && !mapped.onGround) flights.push(mapped);
    }

    console.log(`[SkyWay] ${flights.length} airborne flights after filtering`);

    cache = { data: flights, timestamp: Date.now() };
    return { flights, source: "flightaware" };
  } catch (err) {
    console.error("[SkyWay] AeroAPI network error:", err instanceof Error ? err.message : String(err));

    if (cache) {
      console.warn("[SkyWay] Returning stale cache after network error.");
      return { flights: cache.data, source: "stale-cache" };
    }
    return { flights: [], source: `error:network`, error: `Network Error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

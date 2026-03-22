import { Flight } from "./types";
import { lookupAirline, UNKNOWN_AIRPORT } from "./data";

// --- Server-side cache (60s TTL) — max 1 API call per minute ---
let cache: { data: Flight[]; timestamp: number } | null = null;
const CACHE_TTL = 60000;

const MAX_FLIGHTS = 4000;

// OpenSky / ADSB.lol state vector indices
// [0] icao24, [1] callsign, [2] origin_country, [3] time_position,
// [4] last_contact, [5] longitude, [6] latitude, [7] baro_altitude,
// [8] on_ground, [9] velocity, [10] true_track, [11] vertical_rate,
// [12] sensors, [13] geo_altitude, [14] squawk, [15] spi, [16] position_source
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformStateVector(sv: any[]): Flight | null {
  const lat = sv[6];
  const lng = sv[5];
  if (lat == null || lng == null) return null;
  if (sv[8] === true) return null; // on ground

  const callsign = (sv[1] || "").trim();
  const airline = lookupAirline(callsign);

  // Velocity from m/s to knots
  const speedKts = sv[9] != null ? Math.round(sv[9] * 1.94384) : 0;
  // Altitude from meters to feet
  const altFt = sv[7] != null ? Math.round(sv[7] * 3.28084) : 0;
  const geoAltFt = sv[13] != null ? Math.round(sv[13] * 3.28084) : altFt;
  const heading = sv[10] != null ? Math.round(sv[10]) : 0;
  const vertRate = sv[11] != null ? Math.round(sv[11] * 196.85) : null; // m/s to fpm

  return {
    id: sv[0] || callsign || `${lat}-${lng}`,
    flightNumber: callsign || sv[0] || "???",
    callsign,
    airline,
    origin: { ...UNKNOWN_AIRPORT },
    destination: { ...UNKNOWN_AIRPORT },
    status: "en-route",
    scheduledDep: null,
    actualDep: null,
    scheduledArr: null,
    estimatedArr: null,
    actualArr: null,
    aircraft: null,
    registration: null,
    altitude: altFt,
    speed: speedKts,
    heading,
    progress: 0,
    currentLat: lat,
    currentLng: lng,
    originCountry: sv[2] || "",
    onGround: false,
    verticalRate: vertRate,
    squawk: sv[14] || null,
    geoAltitude: geoAltFt,
    lastContact: sv[4] || Math.floor(Date.now() / 1000),
    routeDistance: null,
  };
}

// --- Data sources: cascade through available ADS-B aggregators ---

interface RawResult { states: unknown[][]; source: string }

const SOURCES = [
  { name: "opensky", url: "https://opensky-network.org/api/states/all" },
  { name: "adsb.lol", url: "https://api.adsb.lol/v2/states/all" },
];

async function fetchFromSource(source: { name: string; url: string }): Promise<RawResult> {
  const res = await fetch(source.url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  // Both OpenSky and ADSB.lol use { states: [...] }
  const states: unknown[][] = json.states || [];
  return { states, source: source.name };
}

async function fetchWithCascade(): Promise<RawResult> {
  for (const source of SOURCES) {
    try {
      console.log(`[SkyWay] Trying ${source.name}...`);
      const result = await fetchFromSource(source);
      console.log(`[SkyWay] ${source.name} returned ${result.states.length} state vectors`);
      return result;
    } catch (err) {
      console.warn(`[SkyWay] ${source.name} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new Error("All ADS-B data sources unavailable");
}

// --- Main fetch ---

export async function fetchLiveFlights(): Promise<{ flights: Flight[]; source: string; error?: string }> {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return { flights: cache.data, source: "cache" };
  }

  try {
    const { states, source } = await fetchWithCascade();

    const flights: Flight[] = [];
    for (const sv of states) {
      if (flights.length >= MAX_FLIGHTS) break;
      const mapped = transformStateVector(sv);
      if (!mapped) continue;
      // Skip very low altitude (< 1000 ft) to filter ground vehicles / noise
      if (mapped.altitude < 1000) continue;
      flights.push(mapped);
    }

    console.log(`[SkyWay] ${flights.length} airborne flights from ${source} (capped at ${MAX_FLIGHTS})`);

    cache = { data: flights, timestamp: Date.now() };
    return { flights, source };
  } catch (err) {
    console.error("[SkyWay] All sources failed:", err instanceof Error ? err.message : String(err));

    if (cache) {
      console.warn("[SkyWay] Returning stale cache after all sources failed.");
      return { flights: cache.data, source: "stale-cache" };
    }
    return { flights: [], source: "error:network", error: `All ADS-B sources unavailable. ${err instanceof Error ? err.message : String(err)}` };
  }
}

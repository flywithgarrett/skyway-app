import { Flight } from "./types";
import { lookupAirline, UNKNOWN_AIRPORT } from "./data";

// --- Server-side cache (60s TTL) — max 1 API call per minute ---
let cache: { data: Flight[]; timestamp: number } | null = null;
const CACHE_TTL = 60000;

const MAX_FLIGHTS = 4000;

// ADSB.lol state vector indices (OpenSky-compatible format)
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

// --- Main fetch: ADSB.lol global firehose ---

export async function fetchLiveFlights(): Promise<{ flights: Flight[]; source: string; error?: string }> {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return { flights: cache.data, source: "cache" };
  }

  try {
    console.log("[SkyWay] Fetching ADSB.lol global state vectors...");

    const res = await fetch("https://api.adsb.lol/v2/states/all", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[SkyWay] ADSB.lol FAILED — HTTP ${res.status} ${res.statusText}`);
      console.error(`[SkyWay] Response body: ${body.substring(0, 500)}`);

      if (cache) {
        console.warn("[SkyWay] Returning stale cache.");
        return { flights: cache.data, source: "stale-cache" };
      }
      return { flights: [], source: `error:http-${res.status}`, error: `ADSB.lol API Error: ${res.status} ${res.statusText}` };
    }

    const json = await res.json();
    const states: unknown[][] = json.states || [];
    console.log(`[SkyWay] ADSB.lol returned ${states.length} state vectors`);

    const flights: Flight[] = [];
    for (const sv of states) {
      if (flights.length >= MAX_FLIGHTS) break;
      const mapped = transformStateVector(sv);
      if (!mapped) continue;
      // Skip very low altitude (< 1000 ft) to filter ground vehicles / noise
      if (mapped.altitude < 1000) continue;
      flights.push(mapped);
    }

    console.log(`[SkyWay] ${flights.length} airborne flights (capped at ${MAX_FLIGHTS})`);

    cache = { data: flights, timestamp: Date.now() };
    return { flights, source: "adsb.lol" };
  } catch (err) {
    console.error("[SkyWay] ADSB.lol network error:", err instanceof Error ? err.message : String(err));

    if (cache) {
      console.warn("[SkyWay] Returning stale cache after network error.");
      return { flights: cache.data, source: "stale-cache" };
    }
    return { flights: [], source: "error:network", error: `Network Error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

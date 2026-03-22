import { Flight } from "./types";
import { lookupAirline, UNKNOWN_AIRPORT } from "./data";

// --- Server-side cache (60s TTL) — max 1 API call per minute ---
let cache: { data: Flight[]; timestamp: number } | null = null;
const CACHE_TTL = 60000;

const MAX_FLIGHTS = 4000;

// --- Transform: OpenSky / ADSB.lol state vector format ---
// [0] icao24, [1] callsign, [2] origin_country, [3] time_position,
// [4] last_contact, [5] longitude, [6] latitude, [7] baro_altitude (meters),
// [8] on_ground, [9] velocity (m/s), [10] true_track, [11] vertical_rate (m/s),
// [12] sensors, [13] geo_altitude (meters), [14] squawk, [15] spi, [16] position_source
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformStateVector(sv: any[]): Flight | null {
  const lat = sv[6];
  const lng = sv[5];
  if (lat == null || lng == null) return null;
  if (sv[8] === true) return null; // on ground

  const callsign = (sv[1] || "").trim();
  const airline = lookupAirline(callsign);

  const speedKts = sv[9] != null ? Math.round(sv[9] * 1.94384) : 0;
  const altFt = sv[7] != null ? Math.round(sv[7] * 3.28084) : 0;
  const geoAltFt = sv[13] != null ? Math.round(sv[13] * 3.28084) : altFt;
  const heading = sv[10] != null ? Math.round(sv[10]) : 0;
  const vertRate = sv[11] != null ? Math.round(sv[11] * 196.85) : null;

  return {
    id: sv[0] || callsign || `${lat}-${lng}`,
    flightNumber: callsign || sv[0] || "???",
    callsign,
    airline,
    origin: { ...UNKNOWN_AIRPORT },
    destination: { ...UNKNOWN_AIRPORT },
    status: "en-route",
    scheduledDep: null, actualDep: null,
    scheduledArr: null, estimatedArr: null, actualArr: null,
    aircraft: null, registration: null,
    altitude: altFt, speed: speedKts, heading,
    progress: 0,
    currentLat: lat, currentLng: lng,
    originCountry: sv[2] || "",
    onGround: false,
    verticalRate: vertRate,
    squawk: sv[14] || null,
    geoAltitude: geoAltFt,
    lastContact: sv[4] || Math.floor(Date.now() / 1000),
    routeDistance: null,
  };
}

// --- Transform: ADSBx v2 format (airplanes.live / adsb.fi / adsb.one) ---
// Named JSON objects, already in imperial units (feet, knots, fpm)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformADSBxAircraft(ac: any): Flight | null {
  const lat = ac.lat;
  const lng = ac.lon;
  if (lat == null || lng == null) return null;

  const altRaw = ac.alt_baro;
  if (altRaw === "ground" || altRaw === 0) return null;
  const altFt = typeof altRaw === "number" ? altRaw : 0;

  const callsign = (ac.flight || "").trim();
  const airline = lookupAirline(callsign);
  const hex = ac.hex || "";

  return {
    id: hex || callsign || `${lat}-${lng}`,
    flightNumber: callsign || hex || "???",
    callsign,
    airline,
    origin: { ...UNKNOWN_AIRPORT },
    destination: { ...UNKNOWN_AIRPORT },
    status: "en-route",
    scheduledDep: null, actualDep: null,
    scheduledArr: null, estimatedArr: null, actualArr: null,
    aircraft: ac.t || null,
    registration: ac.r || null,
    altitude: altFt,
    speed: ac.gs != null ? Math.round(ac.gs) : 0,
    heading: ac.track != null ? Math.round(ac.track) : (ac.true_heading != null ? Math.round(ac.true_heading) : 0),
    progress: 0,
    currentLat: lat, currentLng: lng,
    originCountry: "",
    onGround: false,
    verticalRate: ac.baro_rate != null ? Math.round(ac.baro_rate) : null,
    squawk: ac.squawk || null,
    geoAltitude: ac.alt_geom || altFt,
    lastContact: Math.floor(Date.now() / 1000),
    routeDistance: null,
  };
}

// --- Multi-source cascade ---

interface FetchResult { flights: Flight[]; source: string }

// Minimum viable flight count — if a source returns fewer, try the next one
const MIN_FLIGHTS = 500;

// Tier 1: Global state-vector endpoints (OpenSky format)
// ADSB.lol first (better global coverage), OpenSky as backup
const GLOBAL_SOURCES = [
  { name: "adsb.lol", url: "https://api.adsb.lol/v2/states/all" },
  { name: "opensky", url: "https://opensky-network.org/api/states/all" },
];

async function fetchGlobalSource(source: { name: string; url: string }): Promise<FetchResult> {
  const res = await fetch(source.url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const json = await res.json();
  const states: unknown[][] = json.states || [];
  if (states.length === 0) throw new Error("Empty states array");

  const flights: Flight[] = [];
  for (const sv of states) {
    if (flights.length >= MAX_FLIGHTS) break;
    const mapped = transformStateVector(sv);
    if (!mapped || mapped.altitude < 1000) continue;
    flights.push(mapped);
  }
  if (flights.length < MIN_FLIGHTS) {
    throw new Error(`Only ${flights.length} flights (below ${MIN_FLIGHTS} threshold)`);
  }
  return { flights, source: source.name };
}

// Tier 2: ADSBx v2 point queries (airplanes.live) — covers major global regions
// Each point query covers a 250nm radius circle. We pick strategic centers for density.
const POINT_REGIONS = [
  { lat: 40, lon: -75, label: "US-NE" },        // NYC corridor
  { lat: 33, lon: -84, label: "US-SE" },         // ATL/MIA
  { lat: 40, lon: -100, label: "US-Central" },   // ORD/DEN
  { lat: 35, lon: -118, label: "US-West" },      // LAX/SFO
  { lat: 51, lon: -1, label: "UK" },             // LHR
  { lat: 49, lon: 8, label: "Europe-C" },        // FRA/CDG/AMS
  { lat: 40, lon: 25, label: "Europe-E" },       // IST/Mediterranean
  { lat: 25, lon: 55, label: "Middle-East" },    // DXB/DOH
  { lat: 35, lon: 140, label: "East-Asia" },     // HND/ICN
  { lat: 1, lon: 104, label: "SE-Asia" },        // SIN
  { lat: 45, lon: -30, label: "N-Atlantic" },    // Oceanic tracks
  { lat: -25, lon: -46, label: "S-America" },    // GRU
];

async function fetchAirplanesLive(): Promise<FetchResult> {
  const seen = new Set<string>();
  const allFlights: Flight[] = [];

  // Fetch regions sequentially (1 req/sec rate limit)
  for (const region of POINT_REGIONS) {
    if (allFlights.length >= MAX_FLIGHTS) break;
    try {
      const url = `https://api.airplanes.live/v2/point/${region.lat}/${region.lon}/250`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) continue;
      const json = await res.json();
      const aircraft = json.ac || [];
      for (const ac of aircraft) {
        if (allFlights.length >= MAX_FLIGHTS) break;
        const mapped = transformADSBxAircraft(ac);
        if (!mapped || mapped.altitude < 1000) continue;
        if (seen.has(mapped.id)) continue;
        seen.add(mapped.id);
        allFlights.push(mapped);
      }
      // Respect 1 req/sec rate limit
      if (allFlights.length < MAX_FLIGHTS) {
        await new Promise((r) => setTimeout(r, 1100));
      }
    } catch {
      // Skip failed region, continue with next
    }
  }

  if (allFlights.length === 0) throw new Error("airplanes.live returned no data");
  return { flights: allFlights, source: "airplanes.live" };
}

async function fetchWithCascade(): Promise<FetchResult> {
  // Tier 1: try global endpoints
  for (const source of GLOBAL_SOURCES) {
    try {
      console.log(`[SkyWay] Trying ${source.name}...`);
      const result = await fetchGlobalSource(source);
      console.log(`[SkyWay] ${source.name} returned ${result.flights.length} flights`);
      return result;
    } catch (err) {
      console.warn(`[SkyWay] ${source.name} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Tier 2: fall back to airplanes.live point queries
  try {
    console.log("[SkyWay] Global sources failed. Falling back to airplanes.live point queries...");
    const result = await fetchAirplanesLive();
    console.log(`[SkyWay] airplanes.live returned ${result.flights.length} flights across ${POINT_REGIONS.length} regions`);
    return result;
  } catch (err) {
    console.warn(`[SkyWay] airplanes.live failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  throw new Error("All ADS-B data sources unavailable");
}

// --- Main fetch ---

export async function fetchLiveFlights(): Promise<{ flights: Flight[]; source: string; error?: string }> {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return { flights: cache.data, source: "cache" };
  }

  try {
    const result = await fetchWithCascade();

    console.log(`[SkyWay] ${result.flights.length} airborne flights from ${result.source} (capped at ${MAX_FLIGHTS})`);

    cache = { data: result.flights, timestamp: Date.now() };
    return { flights: result.flights, source: result.source };
  } catch (err) {
    console.error("[SkyWay] All sources failed:", err instanceof Error ? err.message : String(err));

    if (cache) {
      console.warn("[SkyWay] Returning stale cache after all sources failed.");
      return { flights: cache.data, source: "stale-cache" };
    }
    return { flights: [], source: "error:network", error: `All ADS-B sources unavailable. ${err instanceof Error ? err.message : String(err)}` };
  }
}

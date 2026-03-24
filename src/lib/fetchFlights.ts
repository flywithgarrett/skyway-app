import { Flight } from "./types";
import { lookupAirline, UNKNOWN_AIRPORT } from "./data";

// --- Server-side cache (60s TTL) — max 1 API call per minute ---
let cache: { data: Flight[]; timestamp: number } | null = null;
const CACHE_TTL = 60000;

const MAX_FLIGHTS = 6000;

// --- Transform: OpenSky / ADSB.lol state vector format ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformStateVector(sv: any[]): Flight | null {
  const lat = sv[6];
  const lng = sv[5];
  // Only reject if coords are truly missing — don't require callsign
  if (lat == null || lng == null) return null;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  if (lat === 0 && lng === 0) return null;  // Null Island = bad data

  const isOnGround = sv[8] === true;
  const callsign = (sv[1] || "").trim();
  const airline = lookupAirline(callsign);
  const speedKts = sv[9] != null ? Math.round(sv[9] * 1.94384) : 0;
  const altFt = sv[7] != null ? Math.round(sv[7] * 3.28084) : 0;
  const geoAltFt = sv[13] != null ? Math.round(sv[13] * 3.28084) : altFt;
  const heading = sv[10] != null ? Math.round(sv[10]) : 0;
  const vertRate = sv[11] != null ? Math.round(sv[11] * 196.85) : null;
  const hex = (sv[0] || "").trim();

  return {
    id: hex || callsign || `${lat.toFixed(4)}-${lng.toFixed(4)}`,
    flightNumber: callsign || hex || "???",
    callsign, airline,
    origin: { ...UNKNOWN_AIRPORT }, destination: { ...UNKNOWN_AIRPORT },
    status: isOnGround ? "taxiing" : "en-route",
    scheduledDep: null, actualDep: null,
    scheduledArr: null, estimatedArr: null, actualArr: null,
    aircraft: null, registration: null,
    altitude: altFt, speed: speedKts, heading, progress: 0,
    currentLat: lat, currentLng: lng,
    originCountry: sv[2] || "",
    onGround: isOnGround, verticalRate: vertRate,
    squawk: sv[14] || null, geoAltitude: geoAltFt,
    lastContact: sv[4] || Math.floor(Date.now() / 1000),
    routeDistance: null,
  };
}

// --- Transform: ADSBx v2 format (airplanes.live) ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformADSBxAircraft(ac: any): Flight | null {
  const lat = ac.lat;
  const lng = ac.lon;
  // Only reject if coords are truly missing — flights with no callsign
  // but valid hex + position are real (common over oceans)
  if (lat == null || lng == null) return null;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  if (lat === 0 && lng === 0) return null;

  const altRaw = ac.alt_baro;
  const isOnGround = altRaw === "ground" || ac.ground === true || altRaw === 0;
  const altFt = typeof altRaw === "number" ? altRaw : 0;

  const callsign = (ac.flight || "").trim();
  const airline = lookupAirline(callsign);
  const hex = ac.hex || "";

  return {
    id: hex || callsign || `${lat.toFixed(4)}-${lng.toFixed(4)}`,
    flightNumber: callsign || hex || "???",
    callsign, airline,
    origin: { ...UNKNOWN_AIRPORT }, destination: { ...UNKNOWN_AIRPORT },
    status: isOnGround ? "taxiing" : "en-route",
    scheduledDep: null, actualDep: null,
    scheduledArr: null, estimatedArr: null, actualArr: null,
    aircraft: ac.t || null, registration: ac.r || null,
    altitude: altFt,
    speed: ac.gs != null ? Math.round(ac.gs) : 0,
    heading: ac.track != null ? Math.round(ac.track) : (ac.true_heading != null ? Math.round(ac.true_heading) : 0),
    progress: 0,
    currentLat: lat, currentLng: lng,
    originCountry: "",
    onGround: isOnGround,
    verticalRate: ac.baro_rate != null ? Math.round(ac.baro_rate) : null,
    squawk: ac.squawk || null,
    geoAltitude: ac.alt_geom || altFt,
    lastContact: Math.floor(Date.now() / 1000),
    routeDistance: null,
  };
}

// --- Data sources ---

interface FetchResult { flights: Flight[]; source: string }

// Primary: airplanes.live point queries — reliable, global, parallel fetch
// 250nm radius per point = ~460km. Must cover oceans and ALL continents.
const POINT_REGIONS = [
  // --- North America ---
  { lat: 40, lon: -75 },   // US-NE (NYC/BOS/PHL)
  { lat: 33, lon: -84 },   // US-SE (ATL/MIA/CLT)
  { lat: 42, lon: -95 },   // US-Central (ORD/MSP/DEN)
  { lat: 35, lon: -118 },  // US-West (LAX/SFO)
  { lat: 48, lon: -122 },  // Pacific NW (SEA/PDX/YVR)
  { lat: 48, lon: -60 },   // Canada-East (YYZ/YUL)
  { lat: 30, lon: -97 },   // US-South (DFW/IAH/AUS)
  { lat: 20, lon: -100 },  // Mexico (MEX/CUN)
  // --- Europe ---
  { lat: 52, lon: -1 },    // UK/Ireland (LHR/DUB)
  { lat: 49, lon: 8 },     // Europe-C (FRA/CDG/AMS)
  { lat: 42, lon: 20 },    // Europe-SE (IST/ATH)
  { lat: 60, lon: 15 },    // Scandinavia
  { lat: 40, lon: -4 },    // Iberia (MAD/BCN/LIS)
  { lat: 45, lon: 12 },    // Italy (FCO/MXP)
  // --- Atlantic Ocean (transatlantic routes) ---
  { lat: 55, lon: -30 },   // N-Atlantic tracks (NATS west)
  { lat: 50, lon: -15 },   // N-Atlantic tracks (NATS east)
  { lat: 45, lon: -45 },   // Mid-Atlantic
  { lat: 30, lon: -50 },   // S-Atlantic / Caribbean routes
  // --- Middle East & Africa ---
  { lat: 25, lon: 55 },    // Middle-East (DXB/DOH)
  { lat: 30, lon: 32 },    // Egypt/North Africa (CAI)
  { lat: 5, lon: 3 },      // West Africa (LOS)
  { lat: -4, lon: 37 },    // East Africa (NBO/DAR)
  { lat: -26, lon: 28 },   // South Africa (JNB)
  // --- Asia ---
  { lat: 35, lon: 140 },   // East-Asia (HND/ICN/NRT)
  { lat: 25, lon: 121 },   // Taiwan / South China (TPE/HKG)
  { lat: 1, lon: 104 },    // SE-Asia (SIN/BKK)
  { lat: 25, lon: 80 },    // India (DEL/BOM)
  { lat: 40, lon: 70 },    // Central Asia (TAS/ALM)
  { lat: 55, lon: 80 },    // Russia/Siberia
  // --- Pacific Ocean ---
  { lat: 35, lon: 170 },   // N-Pacific (Japan → US routes)
  { lat: 25, lon: -155 },  // Hawaii / Central Pacific
  { lat: 40, lon: -140 },  // NE Pacific (transpacific routes)
  // --- South America & Oceania ---
  { lat: -25, lon: -46 },  // S-America (GRU/GIG)
  { lat: -5, lon: -60 },   // Amazon / N-South America
  { lat: -33, lon: 151 },  // Australia (SYD/MEL)
  { lat: -37, lon: 175 },  // New Zealand (AKL)
];

async function fetchAirplanesLive(): Promise<FetchResult> {
  console.log(`[SkyWay] Fetching airplanes.live (parallel, ${POINT_REGIONS.length} regions)...`);
  const seen = new Set<string>();
  const allFlights: Flight[] = [];

  // Fetch all regions in parallel for speed
  const results = await Promise.allSettled(
    POINT_REGIONS.map(async (region) => {
      const url = `https://api.airplanes.live/v2/point/${region.lat}/${region.lon}/250`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.ac || [];
    })
  );

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const ac of result.value) {
      if (allFlights.length >= MAX_FLIGHTS) break;
      const mapped = transformADSBxAircraft(ac);
      if (!mapped) continue;
      if (seen.has(mapped.id)) continue;
      seen.add(mapped.id);
      allFlights.push(mapped);
    }
  }

  if (allFlights.length === 0) throw new Error("airplanes.live returned no data");
  console.log(`[SkyWay] airplanes.live returned ${allFlights.length} flights`);
  return { flights: allFlights, source: "airplanes.live" };
}

// Fallback: global state-vector endpoints
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
    if (!mapped) continue;
    flights.push(mapped);
  }
  if (flights.length < 500) throw new Error(`Only ${flights.length} flights`);
  return { flights, source: source.name };
}

async function fetchWithCascade(): Promise<FetchResult> {
  // Primary: airplanes.live (reliable, global, parallel)
  try {
    return await fetchAirplanesLive();
  } catch (err) {
    console.warn(`[SkyWay] airplanes.live failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Fallback: global state-vector endpoints
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

  throw new Error("All ADS-B data sources unavailable");
}

// --- Main fetch ---

export async function fetchLiveFlights(): Promise<{ flights: Flight[]; source: string; error?: string }> {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return { flights: cache.data, source: "cache" };
  }

  try {
    const result = await fetchWithCascade();
    console.log(`[SkyWay] ${result.flights.length} airborne flights from ${result.source}`);
    cache = { data: result.flights, timestamp: Date.now() };
    return { flights: result.flights, source: result.source };
  } catch (err) {
    console.error("[SkyWay] All sources failed:", err instanceof Error ? err.message : String(err));
    if (cache) {
      console.warn("[SkyWay] Returning stale cache.");
      return { flights: cache.data, source: "stale-cache" };
    }
    return { flights: [], source: "error:network", error: `All ADS-B sources unavailable. ${err instanceof Error ? err.message : String(err)}` };
  }
}

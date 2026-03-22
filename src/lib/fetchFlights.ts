import { Flight } from "./types";
import { lookupAirline, UNKNOWN_AIRPORT } from "./data";

// --- Aggressive server-side cache (30s TTL) to protect API costs ---
let cache: { data: Flight[]; timestamp: number } | null = null;
const CACHE_TTL = 30000; // 30 seconds — max 2 API calls per minute

const FA_BASE = "https://aeroapi.flightaware.com/aeroapi";

function faHeaders(): Record<string, string> {
  const key = process.env.FLIGHTAWARE_API_KEY;
  if (!key) throw new Error("FLIGHTAWARE_API_KEY not set");
  return { "x-apikey": key, Accept: "application/json" };
}

function mapAirport(fa: { code_iata?: string; code_icao?: string; name?: string; city?: string; timezone?: string; latitude?: number; longitude?: number } | null | undefined): Flight["origin"] {
  if (!fa) return { ...UNKNOWN_AIRPORT, icao: "----" };
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

// --- Fallback flights when API key is missing or API fails ---

function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
}

function generateFallbackFlights(): Flight[] {
  const rand = seededRandom(Date.now() % 100000);
  const flights: Flight[] = [];
  const routes = [
    { cs: "UAL452", lat: 40.2, lng: -78.5, alt: 350, spd: 470, hdg: 270, co: "US", orig: "KJFK", dest: "KLAX" },
    { cs: "DAL1872", lat: 33.8, lng: -86.3, alt: 370, spd: 480, hdg: 180, co: "US", orig: "KATL", dest: "KMIA" },
    { cs: "AAL295", lat: 32.5, lng: -100.2, alt: 330, spd: 450, hdg: 90, co: "US", orig: "KDFW", dest: "KJFK" },
    { cs: "SWA1423", lat: 37.1, lng: -110.5, alt: 340, spd: 440, hdg: 245, co: "US", orig: "KDEN", dest: "KLAX" },
    { cs: "JBU837", lat: 41.8, lng: -72.5, alt: 280, spd: 410, hdg: 210, co: "US", orig: "KBOS", dest: "KJFK" },
    { cs: "UAL1097", lat: 39.5, lng: -104.8, alt: 390, spd: 490, hdg: 80, co: "US", orig: "KDEN", dest: "KORD" },
    { cs: "DAL587", lat: 35.2, lng: -90.4, alt: 360, spd: 460, hdg: 320, co: "US", orig: "KATL", dest: "KORD" },
    { cs: "AAL1750", lat: 25.9, lng: -80.1, alt: 310, spd: 435, hdg: 350, co: "US", orig: "KMIA", dest: "KJFK" },
    { cs: "BAW178", lat: 52.5, lng: -30.0, alt: 390, spd: 510, hdg: 280, co: "GB", orig: "EGLL", dest: "KJFK" },
    { cs: "DLH402", lat: 53.0, lng: -18.0, alt: 400, spd: 495, hdg: 85, co: "DE", orig: "KJFK", dest: "EDDF" },
    { cs: "AFR007", lat: 48.0, lng: -20.0, alt: 380, spd: 505, hdg: 275, co: "FR", orig: "LFPG", dest: "KJFK" },
    { cs: "UAE205", lat: 35.0, lng: 40.0, alt: 400, spd: 510, hdg: 310, co: "AE", orig: "OMDB", dest: "KJFK" },
  ];
  for (let pass = 0; pass < 9; pass++) {
    for (const r of routes) {
      const latV = (rand() - 0.5) * 5 * (pass + 1);
      const lngV = (rand() - 0.5) * 7 * (pass + 1);
      const cs = r.cs + (pass === 0 ? "" : `${pass}`);
      flights.push({
        id: `fallback-${flights.length}`, flightNumber: cs, callsign: cs,
        airline: lookupAirline(cs),
        origin: { code: r.orig.slice(1), icao: r.orig, name: "", city: "", country: r.co, lat: 0, lng: 0 },
        destination: { code: r.dest.slice(1), icao: r.dest, name: "", city: "", country: r.co, lat: 0, lng: 0 },
        status: "en-route", scheduledDep: null, actualDep: null, scheduledArr: null,
        estimatedArr: null, actualArr: null, aircraft: null, registration: null,
        altitude: (r.alt + Math.floor((rand() - 0.5) * 40)) * 100,
        speed: Math.max(200, r.spd + Math.floor((rand() - 0.5) * 40)),
        heading: ((r.hdg + (rand() - 0.5) * 30) % 360 + 360) % 360,
        progress: Math.floor(rand() * 100), currentLat: r.lat + latV, currentLng: r.lng + lngV,
        originCountry: r.co, onGround: false, verticalRate: null, squawk: null,
        geoAltitude: null, lastContact: Math.floor(Date.now() / 1000),
        routeDistance: null,
      });
    }
  }
  return flights;
}

// --- Main fetch function ---

export async function fetchLiveFlights(): Promise<{ flights: Flight[]; source: string }> {
  // Return cached if fresh
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return { flights: cache.data, source: "cache" };
  }

  const apiKey = process.env.FLIGHTAWARE_API_KEY;
  if (!apiKey) {
    console.warn("[SkyWay] FLIGHTAWARE_API_KEY not set — using fallback");
    const fallback = generateFallbackFlights();
    return { flights: fallback, source: "fallback" };
  }

  try {
    console.log("[SkyWay] Fetching FlightAware AeroAPI...");

    // Fetch global en-route flights with position data
    const url = `${FA_BASE}/flights/search?query=-latlong+"20 -130 65 60"&max_pages=1`;
    const res = await fetch(url, {
      headers: faHeaders(),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[SkyWay] AeroAPI HTTP ${res.status}: ${body}`);
      if (cache) return { flights: cache.data, source: "stale-cache" };
      return { flights: generateFallbackFlights(), source: "fallback" };
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
    console.error("[SkyWay] AeroAPI error:", err);
    if (cache) return { flights: cache.data, source: "stale-cache" };
    return { flights: generateFallbackFlights(), source: "fallback" };
  }
}

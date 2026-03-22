import { Flight } from "@/lib/types";
import { lookupAirline, callsignToFlightNumber, UNKNOWN_AIRPORT } from "@/lib/data";

// Server-side cache to respect OpenSky rate limits
let cache: { data: Flight[]; timestamp: number } | null = null;
const CACHE_TTL = 10000; // 10 seconds

// --- Fallback: generate realistic mock flights when API fails ---

function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
}

function generateFallbackFlights(): Flight[] {
  const rand = seededRandom(Date.now() % 100000);
  const flights: Flight[] = [];

  // Realistic routes over US and Europe
  const routes: { callsign: string; lat: number; lng: number; alt: number; spd: number; hdg: number; country: string }[] = [
    // US domestic
    { callsign: "UAL452", lat: 40.2 + rand()*2, lng: -78.5 + rand()*3, alt: 35000, spd: 470, hdg: 270, country: "United States" },
    { callsign: "DAL1872", lat: 33.8 + rand()*2, lng: -86.3 + rand()*3, alt: 37000, spd: 480, hdg: 180, country: "United States" },
    { callsign: "AAL295", lat: 32.5 + rand()*2, lng: -100.2 + rand()*4, alt: 33000, spd: 450, hdg: 90, country: "United States" },
    { callsign: "SWA1423", lat: 37.1 + rand()*2, lng: -110.5 + rand()*5, alt: 34000, spd: 440, hdg: 245, country: "United States" },
    { callsign: "JBU837", lat: 41.8 + rand(), lng: -72.5 + rand()*2, alt: 28000, spd: 410, hdg: 210, country: "United States" },
    { callsign: "UAL1097", lat: 39.5 + rand()*2, lng: -104.8 + rand()*2, alt: 39000, spd: 490, hdg: 80, country: "United States" },
    { callsign: "DAL587", lat: 35.2 + rand()*2, lng: -90.4 + rand()*3, alt: 36000, spd: 460, hdg: 320, country: "United States" },
    { callsign: "AAL1750", lat: 25.9 + rand(), lng: -80.1 + rand(), alt: 31000, spd: 435, hdg: 350, country: "United States" },
    { callsign: "SWA2981", lat: 34.0 + rand()*2, lng: -118.0 + rand()*2, alt: 25000, spd: 390, hdg: 130, country: "United States" },
    { callsign: "UAL682", lat: 47.5 + rand(), lng: -122.3 + rand(), alt: 38000, spd: 475, hdg: 160, country: "United States" },
    { callsign: "ASA327", lat: 45.2 + rand()*2, lng: -120.5 + rand()*3, alt: 35000, spd: 460, hdg: 195, country: "United States" },
    { callsign: "FFT912", lat: 39.8 + rand(), lng: -104.7 + rand(), alt: 33000, spd: 445, hdg: 55, country: "United States" },
    { callsign: "NKS431", lat: 28.5 + rand()*2, lng: -81.3 + rand()*2, alt: 36000, spd: 450, hdg: 290, country: "United States" },
    { callsign: "DAL2109", lat: 42.3 + rand(), lng: -83.0 + rand()*2, alt: 29000, spd: 420, hdg: 240, country: "United States" },
    { callsign: "AAL587", lat: 29.9 + rand(), lng: -95.3 + rand()*2, alt: 34000, spd: 455, hdg: 5, country: "United States" },
    // Transatlantic
    { callsign: "BAW178", lat: 52.5 + rand()*3, lng: -30.0 + rand()*10, alt: 39000, spd: 510, hdg: 280, country: "United Kingdom" },
    { callsign: "UAL110", lat: 55.0 + rand()*3, lng: -25.0 + rand()*8, alt: 37000, spd: 500, hdg: 260, country: "United States" },
    { callsign: "DAL47", lat: 50.5 + rand()*4, lng: -35.0 + rand()*12, alt: 41000, spd: 520, hdg: 90, country: "United States" },
    { callsign: "AFR007", lat: 48.0 + rand()*5, lng: -20.0 + rand()*15, alt: 38000, spd: 505, hdg: 275, country: "France" },
    { callsign: "DLH402", lat: 53.0 + rand()*3, lng: -18.0 + rand()*10, alt: 40000, spd: 495, hdg: 85, country: "Germany" },
    // European
    { callsign: "BAW456", lat: 51.5 + rand(), lng: -0.5 + rand(), alt: 15000, spd: 300, hdg: 90, country: "United Kingdom" },
    { callsign: "DLH932", lat: 50.0 + rand(), lng: 8.5 + rand(), alt: 32000, spd: 440, hdg: 180, country: "Germany" },
    { callsign: "AFR1682", lat: 49.0 + rand(), lng: 2.5 + rand(), alt: 28000, spd: 410, hdg: 150, country: "France" },
    { callsign: "KLM643", lat: 52.3 + rand(), lng: 4.7 + rand(), alt: 34000, spd: 450, hdg: 120, country: "Netherlands" },
    { callsign: "RYR8824", lat: 53.3 + rand()*2, lng: -6.2 + rand()*3, alt: 37000, spd: 445, hdg: 100, country: "Ireland" },
    { callsign: "EZY54", lat: 48.5 + rand()*2, lng: 2.0 + rand()*4, alt: 35000, spd: 430, hdg: 210, country: "United Kingdom" },
    { callsign: "SAS937", lat: 59.6 + rand(), lng: 17.9 + rand()*2, alt: 36000, spd: 455, hdg: 195, country: "Sweden" },
    { callsign: "THY45", lat: 41.3 + rand(), lng: 28.7 + rand()*2, alt: 38000, spd: 470, hdg: 60, country: "Turkey" },
    { callsign: "IBE3172", lat: 40.4 + rand(), lng: -3.7 + rand(), alt: 33000, spd: 440, hdg: 45, country: "Spain" },
    // Middle East / Asia
    { callsign: "UAE205", lat: 25.2 + rand()*5, lng: 55.3 + rand()*10, alt: 40000, spd: 510, hdg: 310, country: "United Arab Emirates" },
    { callsign: "QTR7", lat: 30.0 + rand()*5, lng: 45.0 + rand()*10, alt: 39000, spd: 505, hdg: 290, country: "Qatar" },
    { callsign: "SIA21", lat: 20.0 + rand()*10, lng: 80.0 + rand()*15, alt: 41000, spd: 520, hdg: 45, country: "Singapore" },
    { callsign: "CPA841", lat: 35.0 + rand()*5, lng: 120.0 + rand()*10, alt: 37000, spd: 495, hdg: 250, country: "Hong Kong" },
    { callsign: "ANA9", lat: 45.0 + rand()*5, lng: 150.0 + rand()*10, alt: 38000, spd: 500, hdg: 70, country: "Japan" },
  ];

  // Duplicate with variation to reach ~100 flights
  for (let pass = 0; pass < 3; pass++) {
    for (const route of routes) {
      const latVar = (rand() - 0.5) * 6 * (pass + 1);
      const lngVar = (rand() - 0.5) * 8 * (pass + 1);
      const altVar = Math.floor((rand() - 0.5) * 6000);
      const spdVar = Math.floor((rand() - 0.5) * 40);
      const hdgVar = (rand() - 0.5) * 30;
      const suffix = pass === 0 ? "" : `${pass}`;
      const callsign = route.callsign + suffix;
      const icao = Math.floor(rand() * 0xffffff).toString(16).padStart(6, "0");

      const airline = lookupAirline(callsign);

      flights.push({
        id: icao,
        flightNumber: callsignToFlightNumber(callsign),
        callsign,
        airline,
        origin: UNKNOWN_AIRPORT,
        destination: UNKNOWN_AIRPORT,
        status: "en-route",
        departureTime: null,
        arrivalTime: null,
        aircraft: null,
        altitude: Math.max(5000, route.alt + altVar),
        speed: Math.max(200, route.spd + spdVar),
        heading: ((route.hdg + hdgVar) % 360 + 360) % 360,
        progress: 0,
        currentLat: route.lat + latVar,
        currentLng: route.lng + lngVar,
        icao24: icao,
        originCountry: route.country,
        onGround: false,
        verticalRate: (rand() - 0.5) * 5,
        squawk: null,
        geoAltitude: Math.max(5000, route.alt + altVar + 200),
        lastContact: Math.floor(Date.now() / 1000) - Math.floor(rand() * 10),
      });
    }
  }

  return flights;
}

// --- Main handler ---

export async function GET() {
  // Return cached data if fresh
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return Response.json({ flights: cache.data, source: "cache", count: cache.data.length });
  }

  try {
    console.log("[SkyWay API] Fetching from OpenSky Network...");

    const res = await fetch("https://opensky-network.org/api/states/all", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      console.error(`[SkyWay API] OpenSky returned HTTP ${res.status}`);

      // Return stale cache if available
      if (cache) {
        console.log("[SkyWay API] Returning stale cache");
        return Response.json({ flights: cache.data, source: "stale-cache", count: cache.data.length });
      }

      // Fall back to mock data
      console.log("[SkyWay API] Falling back to mock flights");
      const fallback = generateFallbackFlights();
      return Response.json({ flights: fallback, source: "fallback", count: fallback.length });
    }

    const json = await res.json();
    const states: unknown[][] = json.states || [];

    console.log(`[SkyWay API] Received ${states.length} state vectors`);

    const flights: Flight[] = [];

    for (const s of states) {
      const lat = s[6] as number | null;
      const lng = s[5] as number | null;
      const onGround = s[8] as boolean;

      if (lat == null || lng == null || onGround) continue;

      const icao24 = (s[0] as string) || "";
      const callsign = ((s[1] as string) || "").trim();
      const originCountry = (s[2] as string) || "";
      const baroAltitude = s[7] as number | null;
      const velocity = s[9] as number | null;
      const trueTrack = s[10] as number | null;
      const verticalRate = s[11] as number | null;
      const geoAltitude = s[13] as number | null;
      const squawk = s[14] as string | null;
      const lastContact = (s[4] as number) || 0;

      const airline = lookupAirline(callsign);
      const altFt = baroAltitude != null ? Math.round(baroAltitude * 3.28084) : 0;
      const spdKts = velocity != null ? Math.round(velocity * 1.94384) : 0;

      flights.push({
        id: icao24,
        flightNumber: callsignToFlightNumber(callsign),
        callsign,
        airline,
        origin: UNKNOWN_AIRPORT,
        destination: UNKNOWN_AIRPORT,
        status: "en-route",
        departureTime: null,
        arrivalTime: null,
        aircraft: null,
        altitude: altFt,
        speed: spdKts,
        heading: trueTrack ?? 0,
        progress: 0,
        currentLat: lat,
        currentLng: lng,
        icao24,
        originCountry,
        onGround: false,
        verticalRate,
        squawk,
        geoAltitude: geoAltitude != null ? Math.round(geoAltitude * 3.28084) : null,
        lastContact,
      });
    }

    console.log(`[SkyWay API] Processed ${flights.length} airborne flights`);

    cache = { data: flights, timestamp: Date.now() };
    return Response.json({ flights, source: "live", count: flights.length });

  } catch (err) {
    console.error("[SkyWay API] Error fetching OpenSky:", err);

    // Return stale cache on network error
    if (cache) {
      console.log("[SkyWay API] Returning stale cache after error");
      return Response.json({ flights: cache.data, source: "stale-cache", count: cache.data.length });
    }

    // Fall back to mock data
    console.log("[SkyWay API] Falling back to mock flights after error");
    const fallback = generateFallbackFlights();
    return Response.json({ flights: fallback, source: "fallback", count: fallback.length });
  }
}

import { Flight } from "./types";
import { lookupAirline, callsignToFlightNumber, UNKNOWN_AIRPORT } from "./data";

// Server-side cache shared across requests
let cache: { data: Flight[]; timestamp: number } | null = null;
const CACHE_TTL = 10000;

function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
}

function generateFallbackFlights(): Flight[] {
  const rand = seededRandom(Date.now() % 100000);
  const flights: Flight[] = [];

  const routes: { cs: string; lat: number; lng: number; alt: number; spd: number; hdg: number; co: string }[] = [
    { cs: "UAL452", lat: 40.2, lng: -78.5, alt: 35000, spd: 470, hdg: 270, co: "United States" },
    { cs: "DAL1872", lat: 33.8, lng: -86.3, alt: 37000, spd: 480, hdg: 180, co: "United States" },
    { cs: "AAL295", lat: 32.5, lng: -100.2, alt: 33000, spd: 450, hdg: 90, co: "United States" },
    { cs: "SWA1423", lat: 37.1, lng: -110.5, alt: 34000, spd: 440, hdg: 245, co: "United States" },
    { cs: "JBU837", lat: 41.8, lng: -72.5, alt: 28000, spd: 410, hdg: 210, co: "United States" },
    { cs: "UAL1097", lat: 39.5, lng: -104.8, alt: 39000, spd: 490, hdg: 80, co: "United States" },
    { cs: "DAL587", lat: 35.2, lng: -90.4, alt: 36000, spd: 460, hdg: 320, co: "United States" },
    { cs: "AAL1750", lat: 25.9, lng: -80.1, alt: 31000, spd: 435, hdg: 350, co: "United States" },
    { cs: "SWA2981", lat: 34.0, lng: -118.0, alt: 25000, spd: 390, hdg: 130, co: "United States" },
    { cs: "UAL682", lat: 47.5, lng: -122.3, alt: 38000, spd: 475, hdg: 160, co: "United States" },
    { cs: "ASA327", lat: 45.2, lng: -120.5, alt: 35000, spd: 460, hdg: 195, co: "United States" },
    { cs: "FFT912", lat: 39.8, lng: -104.7, alt: 33000, spd: 445, hdg: 55, co: "United States" },
    { cs: "NKS431", lat: 28.5, lng: -81.3, alt: 36000, spd: 450, hdg: 290, co: "United States" },
    { cs: "DAL2109", lat: 42.3, lng: -83.0, alt: 29000, spd: 420, hdg: 240, co: "United States" },
    { cs: "AAL587", lat: 29.9, lng: -95.3, alt: 34000, spd: 455, hdg: 5, co: "United States" },
    { cs: "BAW178", lat: 52.5, lng: -30.0, alt: 39000, spd: 510, hdg: 280, co: "United Kingdom" },
    { cs: "UAL110", lat: 55.0, lng: -25.0, alt: 37000, spd: 500, hdg: 260, co: "United States" },
    { cs: "DAL47", lat: 50.5, lng: -35.0, alt: 41000, spd: 520, hdg: 90, co: "United States" },
    { cs: "AFR007", lat: 48.0, lng: -20.0, alt: 38000, spd: 505, hdg: 275, co: "France" },
    { cs: "DLH402", lat: 53.0, lng: -18.0, alt: 40000, spd: 495, hdg: 85, co: "Germany" },
    { cs: "BAW456", lat: 51.5, lng: -0.5, alt: 15000, spd: 300, hdg: 90, co: "United Kingdom" },
    { cs: "DLH932", lat: 50.0, lng: 8.5, alt: 32000, spd: 440, hdg: 180, co: "Germany" },
    { cs: "AFR1682", lat: 49.0, lng: 2.5, alt: 28000, spd: 410, hdg: 150, co: "France" },
    { cs: "KLM643", lat: 52.3, lng: 4.7, alt: 34000, spd: 450, hdg: 120, co: "Netherlands" },
    { cs: "RYR8824", lat: 53.3, lng: -6.2, alt: 37000, spd: 445, hdg: 100, co: "Ireland" },
    { cs: "EZY54", lat: 48.5, lng: 2.0, alt: 35000, spd: 430, hdg: 210, co: "United Kingdom" },
    { cs: "SAS937", lat: 59.6, lng: 17.9, alt: 36000, spd: 455, hdg: 195, co: "Sweden" },
    { cs: "THY45", lat: 41.3, lng: 28.7, alt: 38000, spd: 470, hdg: 60, co: "Turkey" },
    { cs: "IBE3172", lat: 40.4, lng: -3.7, alt: 33000, spd: 440, hdg: 45, co: "Spain" },
    { cs: "UAE205", lat: 25.2, lng: 55.3, alt: 40000, spd: 510, hdg: 310, co: "United Arab Emirates" },
    { cs: "QTR7", lat: 30.0, lng: 45.0, alt: 39000, spd: 505, hdg: 290, co: "Qatar" },
    { cs: "SIA21", lat: 20.0, lng: 80.0, alt: 41000, spd: 520, hdg: 45, co: "Singapore" },
    { cs: "CPA841", lat: 35.0, lng: 120.0, alt: 37000, spd: 495, hdg: 250, co: "Hong Kong" },
    { cs: "ANA9", lat: 45.0, lng: 150.0, alt: 38000, spd: 500, hdg: 70, co: "Japan" },
  ];

  for (let pass = 0; pass < 3; pass++) {
    for (const r of routes) {
      const latV = (rand() - 0.5) * 6 * (pass + 1);
      const lngV = (rand() - 0.5) * 8 * (pass + 1);
      const altV = Math.floor((rand() - 0.5) * 6000);
      const spdV = Math.floor((rand() - 0.5) * 40);
      const hdgV = (rand() - 0.5) * 30;
      const cs = r.cs + (pass === 0 ? "" : `${pass}`);
      const icao = Math.floor(rand() * 0xffffff).toString(16).padStart(6, "0");

      flights.push({
        id: icao, flightNumber: callsignToFlightNumber(cs), callsign: cs,
        airline: lookupAirline(cs), origin: UNKNOWN_AIRPORT, destination: UNKNOWN_AIRPORT,
        status: "en-route", departureTime: null, arrivalTime: null, aircraft: null,
        altitude: Math.max(5000, r.alt + altV), speed: Math.max(200, r.spd + spdV),
        heading: ((r.hdg + hdgV) % 360 + 360) % 360, progress: 0,
        currentLat: r.lat + latV + (rand() - 0.5) * 2,
        currentLng: r.lng + lngV + (rand() - 0.5) * 3,
        icao24: icao, originCountry: r.co, onGround: false,
        verticalRate: (rand() - 0.5) * 5, squawk: null,
        geoAltitude: Math.max(5000, r.alt + altV + 200),
        lastContact: Math.floor(Date.now() / 1000) - Math.floor(rand() * 10),
      });
    }
  }
  return flights;
}

function parseOpenSkyStates(states: unknown[][]): Flight[] {
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

    flights.push({
      id: icao24, flightNumber: callsignToFlightNumber(callsign), callsign,
      airline: lookupAirline(callsign), origin: UNKNOWN_AIRPORT, destination: UNKNOWN_AIRPORT,
      status: "en-route", departureTime: null, arrivalTime: null, aircraft: null,
      altitude: baroAltitude != null ? Math.round(baroAltitude * 3.28084) : 0,
      speed: velocity != null ? Math.round(velocity * 1.94384) : 0,
      heading: trueTrack ?? 0, progress: 0, currentLat: lat, currentLng: lng,
      icao24, originCountry, onGround: false, verticalRate, squawk,
      geoAltitude: geoAltitude != null ? Math.round(geoAltitude * 3.28084) : null,
      lastContact,
    });
  }
  return flights;
}

export async function fetchLiveFlights(): Promise<{ flights: Flight[]; source: string }> {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return { flights: cache.data, source: "cache" };
  }

  try {
    console.log("[SkyWay] Fetching OpenSky Network...");
    const res = await fetch("https://opensky-network.org/api/states/all", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      console.error(`[SkyWay] OpenSky HTTP ${res.status}`);
      if (cache) return { flights: cache.data, source: "stale-cache" };
      console.log("[SkyWay] Using fallback flights");
      return { flights: generateFallbackFlights(), source: "fallback" };
    }

    const json = await res.json();
    const states: unknown[][] = json.states || [];
    console.log(`[SkyWay] ${states.length} state vectors received`);

    const flights = parseOpenSkyStates(states);
    console.log(`[SkyWay] ${flights.length} airborne flights`);

    cache = { data: flights, timestamp: Date.now() };
    return { flights, source: "live" };
  } catch (err) {
    console.error("[SkyWay] OpenSky error:", err);
    if (cache) return { flights: cache.data, source: "stale-cache" };
    console.log("[SkyWay] Using fallback flights");
    return { flights: generateFallbackFlights(), source: "fallback" };
  }
}

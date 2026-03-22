import { Flight } from "@/lib/types";
import { lookupAirline, callsignToFlightNumber, UNKNOWN_AIRPORT } from "@/lib/data";

// Server-side cache to respect OpenSky rate limits
let cache: { data: Flight[]; timestamp: number } | null = null;
const CACHE_TTL = 8000; // 8 seconds

export async function GET() {
  // Return cached data if fresh
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return Response.json({ flights: cache.data, cached: true });
  }

  try {
    const res = await fetch("https://opensky-network.org/api/states/all", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      // Return stale cache if available
      if (cache) {
        return Response.json({ flights: cache.data, cached: true, stale: true });
      }
      return Response.json({ flights: [], error: "OpenSky API unavailable" }, { status: 502 });
    }

    const json = await res.json();
    const states: unknown[][] = json.states || [];

    const flights: Flight[] = [];

    for (const s of states) {
      const lat = s[6] as number | null;
      const lng = s[5] as number | null;
      const onGround = s[8] as boolean;

      // Skip: no position, or on ground
      if (lat == null || lng == null || onGround) continue;

      const icao24 = (s[0] as string) || "";
      const callsign = ((s[1] as string) || "").trim();
      const originCountry = (s[2] as string) || "";
      const baroAltitude = s[7] as number | null; // meters
      const velocity = s[9] as number | null; // m/s
      const trueTrack = s[10] as number | null; // degrees
      const verticalRate = s[11] as number | null; // m/s
      const geoAltitude = s[13] as number | null; // meters
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

    cache = { data: flights, timestamp: Date.now() };

    return Response.json({ flights });
  } catch (err) {
    // Return stale cache on network error
    if (cache) {
      return Response.json({ flights: cache.data, cached: true, stale: true });
    }
    return Response.json(
      { flights: [], error: String(err) },
      { status: 500 }
    );
  }
}

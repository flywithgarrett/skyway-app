import { Flight } from "./types";
import { lookupAirline, UNKNOWN_AIRPORT } from "./data";

// --- Server-side cache (15s TTL) to respect OpenSky rate limits ---
let cache: { data: Flight[]; timestamp: number } | null = null;
const CACHE_TTL = 15000;

// --- OpenSky Network: free global position data for the 3D globe ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformOpenSkyState(s: any[]): Flight | null {
  // OpenSky state vector indices: https://openskynetwork.github.io/opensky-api/rest.html
  const callsign = (s[1] as string || "").trim();
  const originCountry = (s[2] as string) || "";
  const lng = s[5] as number | null;
  const lat = s[6] as number | null;
  const onGround = s[8] as boolean;
  const speed = s[9] as number | null;    // m/s
  const heading = s[10] as number | null;
  const verticalRate = s[11] as number | null; // m/s
  const geoAltitude = s[13] as number | null;  // meters
  const squawk = s[14] as string | null;
  const baroAltitude = s[7] as number | null;

  if (lat == null || lng == null || !callsign) return null;

  const altFeet = baroAltitude != null ? Math.round(baroAltitude * 3.28084) : 0;
  const speedKts = speed != null ? Math.round(speed * 1.94384) : 0;
  const airline = lookupAirline(callsign);

  return {
    id: `osky-${s[0] || callsign}`,
    flightNumber: callsign,
    callsign,
    airline,
    origin: { ...UNKNOWN_AIRPORT },
    destination: { ...UNKNOWN_AIRPORT },
    status: onGround ? "taxiing" : "en-route",
    scheduledDep: null,
    actualDep: null,
    scheduledArr: null,
    estimatedArr: null,
    actualArr: null,
    aircraft: null,
    registration: null,
    altitude: altFeet,
    speed: speedKts,
    heading: heading ?? 0,
    progress: 0,
    currentLat: lat,
    currentLng: lng,
    originCountry,
    onGround,
    verticalRate: verticalRate != null ? Math.round(verticalRate * 196.85) : null, // m/s → fpm
    squawk: squawk || null,
    geoAltitude: geoAltitude != null ? Math.round(geoAltitude * 3.28084) : null,
    lastContact: (s[4] as number) || Math.floor(Date.now() / 1000),
    routeDistance: null,
  };
}

export async function fetchLiveFlights(): Promise<{ flights: Flight[]; source: string; error?: string }> {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return { flights: cache.data, source: "cache" };
  }

  try {
    console.log("[SkyWay] Fetching OpenSky Network API...");

    const res = await fetch("https://opensky-network.org/api/states/all", {
      signal: AbortSignal.timeout(20000),
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[SkyWay] OpenSky FAILED — HTTP ${res.status} ${res.statusText}`);
      console.error(`[SkyWay] Response body: ${body.substring(0, 500)}`);

      const reason = res.status === 401 ? "Unauthorized"
        : res.status === 403 ? "Forbidden"
        : res.status === 429 ? "Rate Limited — Too many requests"
        : `${res.statusText || "Unknown error"}`;
      const errorMsg = `OpenSky API Error: ${res.status} ${reason}`;

      if (cache) {
        console.warn("[SkyWay] Returning stale cache.");
        return { flights: cache.data, source: "stale-cache" };
      }
      return { flights: [], source: `error:http-${res.status}`, error: errorMsg };
    }

    const json = await res.json();
    const states: unknown[][] = json.states || [];
    console.log(`[SkyWay] OpenSky returned ${states.length} state vectors`);

    const flights: Flight[] = [];
    for (const s of states) {
      const f = transformOpenSkyState(s);
      if (f && !f.onGround) flights.push(f);
    }

    console.log(`[SkyWay] ${flights.length} airborne flights after filtering`);

    cache = { data: flights, timestamp: Date.now() };
    return { flights, source: "opensky" };
  } catch (err) {
    console.error("[SkyWay] OpenSky network error:", err instanceof Error ? err.message : String(err));

    if (cache) {
      console.warn("[SkyWay] Returning stale cache after network error.");
      return { flights: cache.data, source: "stale-cache" };
    }
    return { flights: [], source: "error:network", error: `Network Error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

const FA_BASE = "https://aeroapi.flightaware.com/aeroapi";
const OPEN_METEO = "https://api.open-meteo.com/v1/forecast";
const TURNAROUND_MIN = 45; // Typical minimum turnaround time in minutes

interface InboundLeg {
  flightNumber: string;
  origin: { code: string; name: string; city: string };
  destination: { code: string; name: string; city: string };
  status: string;
  scheduledArr: string | null;
  estimatedArr: string | null;
  actualArr: string | null;
  arrivalDelay: number; // minutes
  aircraft: string | null;
  registration: string | null;
  lat: number | null;
  lng: number | null;
}

interface WeatherAlert {
  airport: string;
  condition: string;
  windKts: number | null;
  visibility: number | null; // km
  severe: boolean;
}

interface DelayReason {
  type: string;
  label: string;
  minutes: number;
}

interface PredictionResult {
  aircraft: {
    type: string | null;
    registration: string | null;
    age: string | null;
    imageUrl: string | null;
  };
  inboundChain: InboundLeg[];
  delayMinutes: number;
  reasons: DelayReason[];
  weather: WeatherAlert[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractDelay(flight: any): number {
  const sched = flight.scheduled_in || flight.scheduled_on;
  const est = flight.estimated_in || flight.estimated_on;
  const actual = flight.actual_in || flight.actual_on;
  const arrTime = actual || est;
  if (!sched || !arrTime) return 0;
  const diff = (new Date(arrTime).getTime() - new Date(sched).getTime()) / 60000;
  return Math.max(0, Math.round(diff));
}

async function fetchInboundChain(registration: string, apiKey: string): Promise<InboundLeg[]> {
  if (!registration) return [];
  try {
    const url = `${FA_BASE}/flights/search?query=-idents+{registration+${encodeURIComponent(registration)}}`;
    const res = await fetch(url, {
      headers: { "x-apikey": apiKey, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const flights = json.flights || [];

    // Get the 2 most recent completed/active flights for this tail number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recent = flights.slice(0, 3).map((f: any): InboundLeg => ({
      flightNumber: f.ident_iata || f.ident || "???",
      origin: {
        code: f.origin?.code_iata || f.origin?.code_icao || "---",
        name: f.origin?.name || "",
        city: f.origin?.city || "",
      },
      destination: {
        code: f.destination?.code_iata || f.destination?.code_icao || "---",
        name: f.destination?.name || "",
        city: f.destination?.city || "",
      },
      status: f.status || "unknown",
      scheduledArr: f.scheduled_in || f.scheduled_on || null,
      estimatedArr: f.estimated_in || f.estimated_on || null,
      actualArr: f.actual_in || f.actual_on || null,
      arrivalDelay: extractDelay(f),
      aircraft: f.aircraft_type || null,
      registration: f.registration || registration,
      lat: f.last_position?.latitude || null,
      lng: f.last_position?.longitude || null,
    }));

    return recent;
  } catch (err) {
    console.warn("[SkyWay] Inbound chain fetch failed:", err instanceof Error ? err.message : String(err));
    return [];
  }
}

async function fetchWeather(lat: number, lng: number): Promise<{ windKts: number; visibility: number; weatherCode: number }> {
  try {
    const url = `${OPEN_METEO}?latitude=${lat}&longitude=${lng}&current=wind_speed_10m,visibility,weather_code&wind_speed_unit=kn`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { windKts: 0, visibility: 999, weatherCode: 0 };
    const json = await res.json();
    const c = json.current || {};
    return {
      windKts: Math.round(c.wind_speed_10m || 0),
      visibility: (c.visibility || 99999) / 1000, // meters → km
      weatherCode: c.weather_code || 0,
    };
  } catch {
    return { windKts: 0, visibility: 999, weatherCode: 0 };
  }
}

function weatherLabel(code: number): string {
  if (code >= 95) return "Thunderstorms";
  if (code >= 71) return "Snow";
  if (code >= 61) return "Rain";
  if (code >= 51) return "Drizzle";
  if (code >= 45) return "Fog";
  if (code >= 3) return "Overcast";
  return "Clear";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const callsign = searchParams.get("callsign")?.trim();
  const registration = searchParams.get("registration")?.trim() || null;
  const depLat = parseFloat(searchParams.get("depLat") || "0");
  const depLng = parseFloat(searchParams.get("depLng") || "0");
  const arrLat = parseFloat(searchParams.get("arrLat") || "0");
  const arrLng = parseFloat(searchParams.get("arrLng") || "0");

  if (!callsign) {
    return Response.json({ error: "Missing ?callsign= parameter" }, { status: 400 });
  }

  const apiKey = process.env.FLIGHTAWARE_API_KEY;

  // Fetch inbound chain + weather in parallel
  const [inboundChain, depWeather, arrWeather] = await Promise.all([
    apiKey && registration ? fetchInboundChain(registration, apiKey) : Promise.resolve([]),
    depLat !== 0 ? fetchWeather(depLat, depLng) : Promise.resolve(null),
    arrLat !== 0 ? fetchWeather(arrLat, arrLng) : Promise.resolve(null),
  ]);

  // --- Delay prediction engine ---
  let delayMinutes = 0;
  const reasons: DelayReason[] = [];
  const weather: WeatherAlert[] = [];

  // Signal 1: Inbound aircraft is late
  if (inboundChain.length > 0) {
    const inbound = inboundChain[0];
    if (inbound.arrivalDelay > 0) {
      const shortage = inbound.arrivalDelay - TURNAROUND_MIN;
      if (shortage > 0) {
        delayMinutes += shortage;
        reasons.push({
          type: "LATE_AIRCRAFT",
          label: `Late inbound aircraft (${inbound.flightNumber})`,
          minutes: shortage,
        });
      }
    }
  }

  // Signal 2: Weather at departure airport
  if (depWeather) {
    const label = weatherLabel(depWeather.weatherCode);
    const severe = depWeather.weatherCode >= 61 || depWeather.windKts >= 30 || depWeather.visibility < 3;
    if (severe) {
      const weatherDelay = depWeather.weatherCode >= 95 ? 45 : depWeather.weatherCode >= 61 ? 20 : depWeather.windKts >= 35 ? 15 : 10;
      delayMinutes += weatherDelay;
      reasons.push({ type: "WEATHER_DEP", label: `${label} at departure`, minutes: weatherDelay });
    }
    weather.push({
      airport: "departure",
      condition: label,
      windKts: depWeather.windKts,
      visibility: Math.round(depWeather.visibility),
      severe,
    });
  }

  // Signal 3: Weather at arrival airport
  if (arrWeather) {
    const label = weatherLabel(arrWeather.weatherCode);
    const severe = arrWeather.weatherCode >= 61 || arrWeather.windKts >= 30 || arrWeather.visibility < 3;
    if (severe) {
      const weatherDelay = arrWeather.weatherCode >= 95 ? 30 : arrWeather.weatherCode >= 61 ? 15 : 10;
      delayMinutes += weatherDelay;
      reasons.push({ type: "WEATHER_ARR", label: `${label} at arrival`, minutes: weatherDelay });
    }
    weather.push({
      airport: "arrival",
      condition: label,
      windKts: arrWeather.windKts,
      visibility: Math.round(arrWeather.visibility),
      severe,
    });
  }

  const result: PredictionResult = {
    aircraft: {
      type: inboundChain[0]?.aircraft || null,
      registration: registration || inboundChain[0]?.registration || null,
      age: null,
      imageUrl: null,
    },
    inboundChain,
    delayMinutes,
    reasons,
    weather,
  };

  return Response.json(result);
}

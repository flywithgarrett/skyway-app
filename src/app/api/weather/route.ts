// Weather API — fetches current weather for airport coordinates
// Uses Open-Meteo (free, no API key required)

interface WeatherData {
  temp: number; // fahrenheit
  weatherCode: number;
  windMph: number;
  visibility: number; // km
}

let weatherCache = new Map<string, { data: WeatherData; timestamp: number }>();
const CACHE_TTL = 300000; // 5 minutes

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return Response.json({ error: "Missing lat/lng" }, { status: 400 });
  }

  const cacheKey = `${parseFloat(lat).toFixed(2)},${parseFloat(lng).toFixed(2)}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return Response.json(cached.data);
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m,visibility&wind_speed_unit=mph&temperature_unit=fahrenheit`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });

    if (!res.ok) {
      return Response.json({ error: "Weather API failed" }, { status: 502 });
    }

    const json = await res.json();
    const current = json.current || {};

    const data: WeatherData = {
      temp: Math.round(current.temperature_2m || 0),
      weatherCode: current.weather_code || 0,
      windMph: Math.round(current.wind_speed_10m || 0),
      visibility: Math.round((current.visibility || 99999) / 1000),
    };

    weatherCache.set(cacheKey, { data, timestamp: Date.now() });

    // Prevent cache from growing unbounded
    if (weatherCache.size > 200) {
      const oldest = weatherCache.keys().next().value;
      if (oldest) weatherCache.delete(oldest);
    }

    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 502 });
  }
}

const FA_BASE = "https://aeroapi.flightaware.com/aeroapi";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const callsign = searchParams.get("callsign")?.trim();

  if (!callsign) {
    return Response.json({ error: "Missing ?callsign= parameter" }, { status: 400 });
  }

  const apiKey = process.env.FLIGHTAWARE_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "FlightAware API key not configured — set FLIGHTAWARE_API_KEY in environment variables." },
      { status: 400 }
    );
  }

  try {
    const url = `${FA_BASE}/flights/${encodeURIComponent(callsign)}`;
    const res = await fetch(url, {
      headers: { "x-apikey": apiKey, Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[SkyWay] FlightAware detail FAILED for ${callsign} — HTTP ${res.status}: ${body.substring(0, 300)}`);

      const reason = res.status === 401 ? "Unauthorized — Check API Key"
        : res.status === 403 ? "Forbidden — API key lacks permission"
        : res.status === 429 ? "Rate Limited — Too many requests"
        : res.status === 404 ? "Flight not found"
        : `${res.statusText || "Unknown error"}`;

      return Response.json(
        { error: `FlightAware API Error: ${res.status} ${reason}` },
        { status: res.status === 404 ? 404 : 502 }
      );
    }

    const json = await res.json();
    // AeroAPI returns { flights: [...] } — pick the most recent active flight
    const flights = json.flights || [];

    // Find active/en-route flight, or fall back to the most recent one
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const active = flights.find((f: any) => {
      const s = (f.status || "").toLowerCase();
      return s.includes("en route") || s.includes("enroute") || s === "active";
    }) || flights[0] || null;

    if (!active) {
      return Response.json({ error: "No flight data found for this callsign" }, { status: 404 });
    }

    // Map to a clean detail object for the frontend
    const detail = {
      ident: active.ident || active.ident_iata || callsign,
      operator: active.operator || null,
      aircraftType: active.aircraft_type || null,
      registration: active.registration || null,
      status: active.status || null,
      origin: active.origin ? {
        code: active.origin.code_iata || active.origin.code_icao || "---",
        icao: active.origin.code_icao || "----",
        name: active.origin.name || "",
        city: active.origin.city || "",
        lat: active.origin.latitude || 0,
        lng: active.origin.longitude || 0,
        gate: active.gate_origin || null,
        terminal: active.terminal_origin || null,
      } : null,
      destination: active.destination ? {
        code: active.destination.code_iata || active.destination.code_icao || "---",
        icao: active.destination.code_icao || "----",
        name: active.destination.name || "",
        city: active.destination.city || "",
        lat: active.destination.latitude || 0,
        lng: active.destination.longitude || 0,
        gate: active.gate_destination || null,
        terminal: active.terminal_destination || null,
      } : null,
      scheduledDep: active.scheduled_out || active.scheduled_off || null,
      actualDep: active.actual_out || active.actual_off || null,
      scheduledArr: active.scheduled_in || active.scheduled_on || null,
      estimatedArr: active.estimated_in || active.estimated_on || null,
      actualArr: active.actual_in || active.actual_on || null,
      progress: active.progress_percent || 0,
      routeDistance: active.route_distance ? Math.round(active.route_distance) : null,
    };

    return Response.json(detail);
  } catch (err) {
    console.error(`[SkyWay] FlightAware detail error for ${callsign}:`, err instanceof Error ? err.message : String(err));
    return Response.json(
      { error: `Network Error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 }
    );
  }
}

// FAA NASSTATUS airport advisory data
// Provides ground stops, ground delay programs, and weather advisories

interface ATCAdvisory {
  airport: string;
  type: "ground_stop" | "ground_delay" | "airspace_flow" | "weather";
  severity: "red" | "amber" | "yellow";
  title: string;
  reason: string;
  detail: string;
  avgDelay: string | null;
  endTime: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseAdvisories(data: any): ATCAdvisory[] {
  const advisories: ATCAdvisory[] = [];

  // Ground stops
  const groundStops = data?.Ground_Stops?.Ground_Stop || data?.groundStops || [];
  const gsArray = Array.isArray(groundStops) ? groundStops : [groundStops].filter(Boolean);
  for (const gs of gsArray) {
    if (!gs) continue;
    const airport = gs.ARPT || gs.airport || "";
    advisories.push({
      airport,
      type: "ground_stop",
      severity: "red",
      title: `${airport} Ground Stop`,
      reason: gs.Reason || gs.reason || "ATC",
      detail: gs.EndTime ? `Until ${gs.EndTime}` : "Duration unknown",
      avgDelay: null,
      endTime: gs.EndTime || null,
    });
  }

  // Ground delay programs
  const gdps = data?.Ground_Delay_Programs?.Ground_Delay_Program || data?.groundDelays || [];
  const gdpArray = Array.isArray(gdps) ? gdps : [gdps].filter(Boolean);
  for (const gdp of gdpArray) {
    if (!gdp) continue;
    const airport = gdp.ARPT || gdp.airport || "";
    const avgDelay = gdp.Avg || gdp.avgDelay || null;
    advisories.push({
      airport,
      type: "ground_delay",
      severity: "amber",
      title: `${airport} Ground Delay Program`,
      reason: gdp.Reason || gdp.reason || "Volume",
      detail: avgDelay ? `Average delay: ${avgDelay}` : "Delays expected",
      avgDelay,
      endTime: null,
    });
  }

  // Airspace flow programs
  const afps = data?.Airspace_Flow_Programs?.Airspace_Flow_Program || data?.airspaceFlows || [];
  const afpArray = Array.isArray(afps) ? afps : [afps].filter(Boolean);
  for (const afp of afpArray) {
    if (!afp) continue;
    advisories.push({
      airport: afp.CTL_Element || afp.facility || "---",
      type: "airspace_flow",
      severity: "yellow",
      title: `Airspace Flow Program — ${afp.CTL_Element || ""}`,
      reason: afp.Reason || afp.reason || "Volume/Weather",
      detail: afp.AFP_StartTime ? `Started ${afp.AFP_StartTime}` : "",
      avgDelay: afp.Avg || null,
      endTime: afp.AFP_EndTime || null,
    });
  }

  return advisories;
}

let atcCache: { data: ATCAdvisory[]; timestamp: number } | null = null;
const ATC_CACHE_TTL = 120000; // 2 minutes

export async function GET() {
  if (atcCache && Date.now() - atcCache.timestamp < ATC_CACHE_TTL) {
    return Response.json({ advisories: atcCache.data, source: "cache" });
  }

  try {
    const res = await fetch("https://nasstatus.faa.gov/api/airport-status-information", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      // Fallback: return empty if FAA API is down
      console.warn(`[SkyWay] FAA NASSTATUS returned ${res.status}`);
      return Response.json({ advisories: atcCache?.data || [], source: "stale" });
    }

    const json = await res.json();
    const advisories = parseAdvisories(json);
    atcCache = { data: advisories, timestamp: Date.now() };

    console.log(`[SkyWay] FAA NASSTATUS: ${advisories.length} active advisories`);
    return Response.json({ advisories, source: "live" });
  } catch (err) {
    console.warn("[SkyWay] FAA NASSTATUS fetch failed:", err instanceof Error ? err.message : String(err));
    return Response.json({ advisories: atcCache?.data || [], source: "error" });
  }
}

import { NextResponse } from "next/server";

// Fetch TLE data from CelesTrak — no API key needed
const GROUPS: Record<string, string> = {
  starlink: "https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=JSON",
  stations: "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=JSON",
  active: "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=JSON",
};

interface CelesTrakEntry {
  OBJECT_NAME: string;
  OBJECT_ID: string;
  NORAD_CAT_ID: number;
  EPOCH: string;
  MEAN_MOTION: number;
  ECCENTRICITY: number;
  INCLINATION: number;
  RA_OF_ASC_NODE: number;
  ARG_OF_PERICENTER: number;
  MEAN_ANOMALY: number;
  TLE_LINE1: string;
  TLE_LINE2: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const group = searchParams.get("group") || "stations";

  const url = GROUPS[group];
  if (!url) {
    return NextResponse.json({ error: `Unknown group: ${group}` }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!res.ok) {
      return NextResponse.json({ error: "CelesTrak API error" }, { status: 502 });
    }

    const data: CelesTrakEntry[] = await res.json();

    // For starlink, limit to newest 200 to avoid overwhelming the client
    const limited = group === "starlink" ? data.slice(0, 200) : data;

    const satellites = limited.map((s) => ({
      name: s.OBJECT_NAME,
      id: s.NORAD_CAT_ID,
      tle1: s.TLE_LINE1,
      tle2: s.TLE_LINE2,
      epoch: s.EPOCH,
      inclination: s.INCLINATION,
      period: 1440 / s.MEAN_MOTION, // minutes per orbit
    }));

    return NextResponse.json({ satellites, group, count: satellites.length });
  } catch (err) {
    console.error("Satellite fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch satellite data" }, { status: 500 });
  }
}

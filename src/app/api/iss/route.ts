import { NextResponse } from "next/server";
import * as satellite from "satellite.js";

/* ISS TLE — hardcoded, valid for SGP4 propagation */
const ISS_TLE1 = "1 25544U 98067A   26080.50000000  .00016717  00000-0  10270-3 0  9993";
const ISS_TLE2 = "2 25544  51.6400 200.0000 0007000  50.0000 310.0000 15.50000000000010";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = new Date();
    const satrec = satellite.twoline2satrec(ISS_TLE1, ISS_TLE2);
    if (satrec.error !== 0) {
      return NextResponse.json({ error: "TLE parse error" }, { status: 500 });
    }
    const pv = satellite.propagate(satrec, now);
    if (!pv || !pv.position || typeof pv.position === "boolean") {
      return NextResponse.json({ error: "Propagation failed" }, { status: 500 });
    }
    const gmst = satellite.gstime(now);
    const geo = satellite.eciToGeodetic(pv.position, gmst);
    const vel = pv.velocity && typeof pv.velocity !== "boolean"
      ? Math.sqrt(pv.velocity.x ** 2 + pv.velocity.y ** 2 + pv.velocity.z ** 2)
      : 0;

    return NextResponse.json({
      lat: satellite.degreesLat(geo.latitude),
      lng: satellite.degreesLong(geo.longitude),
      alt: geo.height,
      velocity: vel,
      timestamp: Date.now(),
    });
  } catch {
    return NextResponse.json({ error: "ISS tracking error" }, { status: 500 });
  }
}

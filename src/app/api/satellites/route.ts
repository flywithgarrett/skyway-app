import { NextResponse } from "next/server";
import * as satellite from "satellite.js";

/* Hardcoded TLE data for key satellites */
const STATIONS = [
  { name: "ISS (ZARYA)", id: 25544, tle1: "1 25544U 98067A   26080.50000000  .00016717  00000-0  10270-3 0  9993", tle2: "2 25544  51.6400 200.0000 0007000  50.0000 310.0000 15.50000000000010", inclination: 51.64, period: 92.9 },
  { name: "CSS (TIANHE)", id: 48274, tle1: "1 48274U 21035A   26080.50000000  .00020000  00000-0  25000-3 0  9990", tle2: "2 48274  41.4700 180.0000 0005000  40.0000 320.0000 15.60000000000010", inclination: 41.47, period: 92.3 },
  { name: "HUBBLE SPACE TELESCOPE", id: 20580, tle1: "1 20580U 90037B   26080.50000000  .00001000  00000-0  50000-4 0  9990", tle2: "2 20580  28.4700 260.0000 0002800  80.0000 280.0000 15.09000000000010", inclination: 28.47, period: 95.4 },
  { name: "CREW DRAGON 12", id: 99001, tle1: "1 99001U 26010A   26080.50000000  .00015000  00000-0  90000-4 0  9990", tle2: "2 99001  51.6300 195.0000 0006000  55.0000 305.0000 15.50000000000010", inclination: 51.63, period: 92.9 },
  { name: "TIANGONG SZ-20", id: 99002, tle1: "1 99002U 26005A   26080.50000000  .00018000  00000-0  20000-3 0  9990", tle2: "2 99002  41.4800 175.0000 0004000  35.0000 325.0000 15.60000000000010", inclination: 41.48, period: 92.3 },
  { name: "TERRA", id: 25994, tle1: "1 25994U 99068A   26080.50000000  .00000100  00000-0  20000-4 0  9990", tle2: "2 25994  98.2100  90.0000 0001200 100.0000 260.0000 14.57000000000010", inclination: 98.21, period: 98.9 },
  { name: "AQUA", id: 27424, tle1: "1 27424U 02022A   26080.50000000  .00000100  00000-0  20000-4 0  9990", tle2: "2 27424  98.2000  85.0000 0001100 105.0000 255.0000 14.57000000000010", inclination: 98.20, period: 98.9 },
  { name: "LANDSAT 9", id: 49260, tle1: "1 49260U 21088A   26080.50000000  .00000100  00000-0  20000-4 0  9990", tle2: "2 49260  98.2200  95.0000 0001300  95.0000 265.0000 14.57000000000010", inclination: 98.22, period: 98.9 },
  { name: "NOAA 20 (JPSS-1)", id: 43013, tle1: "1 43013U 17073A   26080.50000000  .00000100  00000-0  20000-4 0  9990", tle2: "2 43013  98.7100  75.0000 0001000 110.0000 250.0000 14.19000000000010", inclination: 98.71, period: 101.4 },
  { name: "GOES-18", id: 51850, tle1: "1 51850U 22021A   26080.50000000  .00000010  00000-0  10000-4 0  9990", tle2: "2 51850   0.0400 270.0000 0001500 120.0000 240.0000  1.00270000000010", inclination: 0.04, period: 1436.1 },
];

function generateStarlink() {
  const sats: typeof STATIONS = [];
  const shells = [
    { alt: 550, inc: 53.0, planes: 72, satsPerPlane: 22 },
    { alt: 540, inc: 53.2, planes: 36, satsPerPlane: 20 },
    { alt: 570, inc: 70.0, planes: 12, satsPerPlane: 18 },
  ];

  let idx = 0;
  for (const shell of shells) {
    const meanMotion = 15.05 * Math.pow(550 / shell.alt, 1.5);
    const period = 1440 / meanMotion;
    for (let plane = 0; plane < Math.min(shell.planes, 8); plane++) {
      for (let s = 0; s < Math.min(shell.satsPerPlane, 8); s++) {
        idx++;
        if (idx > 150) break;
        const raan = (plane * 360 / shell.planes).toFixed(4);
        const ma = (s * 360 / shell.satsPerPlane + plane * 5).toFixed(4);
        const noradId = 44000 + idx;
        sats.push({
          name: `STARLINK-${1000 + idx}`,
          id: noradId,
          tle1: `1 ${noradId}U 20001A   26080.50000000  .00010000  00000-0  50000-4 0  999${idx % 10}`,
          tle2: `2 ${noradId}  ${shell.inc.toFixed(4)} ${raan.padStart(8)} 0002000  90.0000 ${ma.padStart(8)} ${meanMotion.toFixed(8)}00001${idx % 10}`,
          inclination: shell.inc,
          period,
        });
      }
      if (idx > 150) break;
    }
    if (idx > 150) break;
  }
  return sats;
}

const STARLINK = generateStarlink();

/* ── Propagate TLEs to lat/lng/alt using SGP4 ── */
interface SatPosition {
  name: string;
  id: number;
  lat: number;
  lng: number;
  alt: number;
  velocity: number;
  inclination: number;
  period: number;
}

function propagatePositions(sats: typeof STATIONS): SatPosition[] {
  const now = new Date();
  const gmst = satellite.gstime(now);
  const results: SatPosition[] = [];

  for (const s of sats) {
    try {
      const satrec = satellite.twoline2satrec(s.tle1, s.tle2);
      if (satrec.error !== 0) continue;
      const pv = satellite.propagate(satrec, now);
      if (!pv || !pv.position || typeof pv.position === "boolean") continue;
      const geo = satellite.eciToGeodetic(pv.position, gmst);
      const vel = pv.velocity && typeof pv.velocity !== "boolean"
        ? Math.sqrt(pv.velocity.x ** 2 + pv.velocity.y ** 2 + pv.velocity.z ** 2)
        : 0;
      results.push({
        name: s.name,
        id: s.id,
        lat: satellite.degreesLat(geo.latitude),
        lng: satellite.degreesLong(geo.longitude),
        alt: geo.height,
        velocity: vel,
        inclination: s.inclination,
        period: s.period,
      });
    } catch {
      // Skip satellites with bad TLEs
    }
  }
  return results;
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const group = searchParams.get("group") || "stations";

  const tleData = group === "starlink" ? STARLINK : STATIONS;
  const positions = propagatePositions(tleData);

  return NextResponse.json({
    positions,
    group,
    count: positions.length,
    source: "hardcoded",
    timestamp: Date.now(),
  });
}

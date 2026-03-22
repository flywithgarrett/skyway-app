import { fetchLiveFlights } from "@/lib/fetchFlights";

export async function GET() {
  const { flights, source, error } = await fetchLiveFlights();

  if (error) {
    return Response.json({ flights, source, error, count: 0 }, { status: 502 });
  }

  return Response.json({ flights, source, count: flights.length });
}

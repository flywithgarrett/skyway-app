import { fetchLiveFlights } from "@/lib/fetchFlights";

export async function GET() {
  const { flights, source } = await fetchLiveFlights();
  return Response.json({ flights, source, count: flights.length });
}

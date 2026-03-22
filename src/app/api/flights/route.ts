import { fetchLiveFlights } from "@/lib/fetchFlights";

export async function GET() {
  const apiKey = process.env.FLIGHTAWARE_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        flights: [],
        source: "error",
        error: "API Key Missing in Environment Variables — set FLIGHTAWARE_API_KEY in Vercel project settings.",
      },
      { status: 400 }
    );
  }

  const { flights, source, error } = await fetchLiveFlights();

  if (error) {
    return Response.json({ flights, source, error, count: 0 }, { status: 502 });
  }

  return Response.json({ flights, source, count: flights.length });
}

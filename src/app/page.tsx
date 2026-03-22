import { fetchLiveFlights } from "@/lib/fetchFlights";
import HomeClient from "@/components/HomeClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { flights: initialFlights } = await fetchLiveFlights();
  return <HomeClient initialFlights={initialFlights} />;
}

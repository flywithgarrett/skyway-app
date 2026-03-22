import { Airport, Airline, Flight, FlightStatus } from "./types";

export const airports: Airport[] = [
  { code: "JFK", name: "John F. Kennedy International", city: "New York", country: "US", lat: 40.6413, lng: -73.7781 },
  { code: "LAX", name: "Los Angeles International", city: "Los Angeles", country: "US", lat: 33.9425, lng: -118.4081 },
  { code: "ORD", name: "O'Hare International", city: "Chicago", country: "US", lat: 41.9742, lng: -87.9073 },
  { code: "ATL", name: "Hartsfield-Jackson Atlanta International", city: "Atlanta", country: "US", lat: 33.6407, lng: -84.4277 },
  { code: "DFW", name: "Dallas/Fort Worth International", city: "Dallas", country: "US", lat: 32.8998, lng: -97.0403 },
  { code: "DEN", name: "Denver International", city: "Denver", country: "US", lat: 39.8561, lng: -104.6737 },
  { code: "SFO", name: "San Francisco International", city: "San Francisco", country: "US", lat: 37.6213, lng: -122.379 },
  { code: "SEA", name: "Seattle-Tacoma International", city: "Seattle", country: "US", lat: 47.4502, lng: -122.3088 },
  { code: "MIA", name: "Miami International", city: "Miami", country: "US", lat: 25.7959, lng: -80.287 },
  { code: "BOS", name: "Logan International", city: "Boston", country: "US", lat: 42.3656, lng: -71.0096 },
  { code: "LHR", name: "Heathrow", city: "London", country: "UK", lat: 51.47, lng: -0.4543 },
  { code: "CDG", name: "Charles de Gaulle", city: "Paris", country: "FR", lat: 49.0097, lng: 2.5479 },
  { code: "FRA", name: "Frankfurt am Main", city: "Frankfurt", country: "DE", lat: 50.0379, lng: 8.5622 },
  { code: "AMS", name: "Schiphol", city: "Amsterdam", country: "NL", lat: 52.3105, lng: 4.7683 },
  { code: "DXB", name: "Dubai International", city: "Dubai", country: "AE", lat: 25.2532, lng: 55.3657 },
  { code: "HND", name: "Haneda", city: "Tokyo", country: "JP", lat: 35.5494, lng: 139.7798 },
  { code: "SIN", name: "Changi", city: "Singapore", country: "SG", lat: 1.3644, lng: 103.9915 },
  { code: "ICN", name: "Incheon International", city: "Seoul", country: "KR", lat: 37.4602, lng: 126.4407 },
  { code: "SYD", name: "Kingsford Smith", city: "Sydney", country: "AU", lat: -33.9461, lng: 151.1772 },
  { code: "YYZ", name: "Toronto Pearson International", city: "Toronto", country: "CA", lat: 43.6777, lng: -79.6248 },
  { code: "MEX", name: "Benito Juárez International", city: "Mexico City", country: "MX", lat: 19.4363, lng: -99.0721 },
  { code: "GRU", name: "Guarulhos International", city: "São Paulo", country: "BR", lat: -23.4356, lng: -46.4731 },
  { code: "IST", name: "Istanbul Airport", city: "Istanbul", country: "TR", lat: 41.2608, lng: 28.7418 },
  { code: "DOH", name: "Hamad International", city: "Doha", country: "QA", lat: 25.2731, lng: 51.6081 },
  { code: "HKG", name: "Hong Kong International", city: "Hong Kong", country: "HK", lat: 22.308, lng: 113.9185 },
  { code: "DEL", name: "Indira Gandhi International", city: "New Delhi", country: "IN", lat: 28.5562, lng: 77.1 },
  { code: "JNB", name: "O.R. Tambo International", city: "Johannesburg", country: "ZA", lat: -26.1392, lng: 28.246 },
];

export const airlines: Airline[] = [
  { code: "AA", name: "American Airlines", color: "#0078D2", hubs: ["DFW", "MIA", "ORD", "JFK"], fleet: ["B737-800", "B777-300ER", "A321neo", "B787-9"] },
  { code: "DL", name: "Delta Air Lines", color: "#C8102E", hubs: ["ATL", "JFK", "LAX", "SEA"], fleet: ["A350-900", "B767-400ER", "A321-200", "B737-900ER"] },
  { code: "UA", name: "United Airlines", color: "#002244", hubs: ["ORD", "DEN", "SFO", "IAH"], fleet: ["B777-200", "B787-10", "A320neo", "B737 MAX 9"] },
  { code: "BA", name: "British Airways", color: "#075AAA", hubs: ["LHR"], fleet: ["A380-800", "B787-9", "A350-1000", "A320neo"] },
  { code: "LH", name: "Lufthansa", color: "#05164D", hubs: ["FRA"], fleet: ["A380-800", "A350-900", "B747-8", "A320neo"] },
  { code: "AF", name: "Air France", color: "#002157", hubs: ["CDG"], fleet: ["A350-900", "B777-300ER", "A320neo", "A220-300"] },
  { code: "EK", name: "Emirates", color: "#D71921", hubs: ["DXB"], fleet: ["A380-800", "B777-300ER", "B777-200LR", "A350-900"] },
  { code: "QR", name: "Qatar Airways", color: "#5C0632", hubs: ["DOH"], fleet: ["A350-1000", "B777-300ER", "B787-9", "A380-800"] },
  { code: "SQ", name: "Singapore Airlines", color: "#F5A623", hubs: ["SIN"], fleet: ["A380-800", "A350-900ULR", "B787-10", "B777-300ER"] },
  { code: "NH", name: "ANA", color: "#13448F", hubs: ["HND"], fleet: ["B777-300ER", "A380-800", "B787-9", "A321neo"] },
  { code: "KE", name: "Korean Air", color: "#00256C", hubs: ["ICN"], fleet: ["A380-800", "B777-300ER", "B787-9", "A330-300"] },
  { code: "QF", name: "Qantas", color: "#E0004D", hubs: ["SYD"], fleet: ["A380-800", "B787-9", "A330-300", "B737-800"] },
  { code: "AC", name: "Air Canada", color: "#F01428", hubs: ["YYZ"], fleet: ["B787-9", "A330-300", "B777-300ER", "A220-300"] },
  { code: "TK", name: "Turkish Airlines", color: "#C8102E", hubs: ["IST"], fleet: ["A350-900", "B777-300ER", "A321neo", "B787-9"] },
  { code: "KL", name: "KLM", color: "#00A1DE", hubs: ["AMS"], fleet: ["B787-10", "A330-300", "B777-300ER", "E195-E2"] },
  { code: "AM", name: "Aeroméxico", color: "#0B2265", hubs: ["MEX"], fleet: ["B787-9", "B737 MAX 8", "A321neo", "E190"] },
  { code: "LA", name: "LATAM Airlines", color: "#1B0088", hubs: ["GRU"], fleet: ["B787-9", "A321neo", "A320neo", "B767-300ER"] },
  { code: "SA", name: "South African Airways", color: "#006847", hubs: ["JNB"], fleet: ["A340-600", "A330-300", "B737-800", "A320-200"] },
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function interpolatePosition(
  origin: Airport,
  destination: Airport,
  progress: number
): { lat: number; lng: number; heading: number } {
  const lat1 = (origin.lat * Math.PI) / 180;
  const lng1 = (origin.lng * Math.PI) / 180;
  const lat2 = (destination.lat * Math.PI) / 180;
  const lng2 = (destination.lng * Math.PI) / 180;

  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((lat2 - lat1) / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng2 - lng1) / 2) ** 2
      )
    );

  if (d < 1e-10) {
    return { lat: origin.lat, lng: origin.lng, heading: 0 };
  }

  const a = Math.sin((1 - progress) * d) / Math.sin(d);
  const b = Math.sin(progress * d) / Math.sin(d);

  const x = a * Math.cos(lat1) * Math.cos(lng1) + b * Math.cos(lat2) * Math.cos(lng2);
  const y = a * Math.cos(lat1) * Math.sin(lng1) + b * Math.cos(lat2) * Math.sin(lng2);
  const z = a * Math.sin(lat1) + b * Math.sin(lat2);

  const lat = (Math.atan2(z, Math.sqrt(x * x + y * y)) * 180) / Math.PI;
  const lng = (Math.atan2(y, x) * 180) / Math.PI;

  const dLng = lng2 - lng1;
  const bx = Math.cos(lat2) * Math.sin(dLng);
  const by = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const heading = ((Math.atan2(bx, by) * 180) / Math.PI + 360) % 360;

  return { lat, lng, heading };
}

export function generateFlights(count: number = 1000): Flight[] {
  const rand = seededRandom(42);
  const flights: Flight[] = [];
  const statuses: FlightStatus[] = ["en-route", "delayed", "on-time", "landed", "boarding"];
  const statusWeights = [0.55, 0.1, 0.15, 0.1, 0.1];

  for (let i = 0; i < count; i++) {
    const airline = airlines[Math.floor(rand() * airlines.length)];

    // Pick origin from airline hubs with 60% probability
    let origin: Airport;
    if (rand() < 0.6) {
      const hubCode = airline.hubs[Math.floor(rand() * airline.hubs.length)];
      origin = airports.find((a) => a.code === hubCode) || airports[Math.floor(rand() * airports.length)];
    } else {
      origin = airports[Math.floor(rand() * airports.length)];
    }

    // Pick a different destination
    let destination: Airport;
    do {
      destination = airports[Math.floor(rand() * airports.length)];
    } while (destination.code === origin.code);

    // Pick status by weight
    const r = rand();
    let cumulative = 0;
    let status: FlightStatus = "en-route";
    for (let j = 0; j < statuses.length; j++) {
      cumulative += statusWeights[j];
      if (r < cumulative) {
        status = statuses[j];
        break;
      }
    }

    const flightNum = `${airline.code}${(100 + Math.floor(rand() * 9900)).toString()}`;
    const aircraft = airline.fleet[Math.floor(rand() * airline.fleet.length)];

    const depHour = Math.floor(rand() * 24);
    const depMin = Math.floor(rand() * 60);
    const flightDurationHrs = 1 + rand() * 14;
    const arrHour = Math.floor((depHour + flightDurationHrs) % 24);
    const arrMin = Math.floor(rand() * 60);

    const departureTime = `${depHour.toString().padStart(2, "0")}:${depMin.toString().padStart(2, "0")}`;
    const arrivalTime = `${arrHour.toString().padStart(2, "0")}:${arrMin.toString().padStart(2, "0")}`;

    let progress: number;
    switch (status) {
      case "en-route":
        progress = 0.05 + rand() * 0.9;
        break;
      case "landed":
        progress = 1;
        break;
      case "boarding":
        progress = 0;
        break;
      default:
        progress = rand() * 0.8;
    }

    const pos = interpolatePosition(origin, destination, progress);

    const altitude =
      status === "en-route"
        ? 28000 + Math.floor(rand() * 14000)
        : status === "landed" || status === "boarding"
          ? 0
          : 15000 + Math.floor(rand() * 25000);

    const speed =
      status === "en-route"
        ? 420 + Math.floor(rand() * 140)
        : status === "landed" || status === "boarding"
          ? 0
          : 300 + Math.floor(rand() * 200);

    flights.push({
      id: `FL-${i.toString().padStart(4, "0")}`,
      flightNumber: flightNum,
      airline,
      origin,
      destination,
      status,
      departureTime,
      arrivalTime,
      aircraft,
      altitude,
      speed,
      heading: pos.heading,
      progress,
      currentLat: pos.lat,
      currentLng: pos.lng,
    });
  }

  return flights;
}

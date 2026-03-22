import { Airport, Airline } from "./types";

// --- Static reference data (kept for globe airport markers) ---

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

// --- Airline lookup from ICAO callsign prefix ---

export const airlines: Airline[] = [
  { code: "AA", name: "American Airlines", color: "#0078D2", hubs: ["DFW", "MIA", "ORD", "JFK"], fleet: [] },
  { code: "DL", name: "Delta Air Lines", color: "#C8102E", hubs: ["ATL", "JFK", "LAX", "SEA"], fleet: [] },
  { code: "UA", name: "United Airlines", color: "#002244", hubs: ["ORD", "DEN", "SFO"], fleet: [] },
  { code: "BA", name: "British Airways", color: "#075AAA", hubs: ["LHR"], fleet: [] },
  { code: "LH", name: "Lufthansa", color: "#05164D", hubs: ["FRA"], fleet: [] },
  { code: "AF", name: "Air France", color: "#002157", hubs: ["CDG"], fleet: [] },
  { code: "EK", name: "Emirates", color: "#D71921", hubs: ["DXB"], fleet: [] },
  { code: "QR", name: "Qatar Airways", color: "#5C0632", hubs: ["DOH"], fleet: [] },
  { code: "SQ", name: "Singapore Airlines", color: "#F5A623", hubs: ["SIN"], fleet: [] },
  { code: "NH", name: "ANA", color: "#13448F", hubs: ["HND"], fleet: [] },
  { code: "KE", name: "Korean Air", color: "#00256C", hubs: ["ICN"], fleet: [] },
  { code: "QF", name: "Qantas", color: "#E0004D", hubs: ["SYD"], fleet: [] },
  { code: "AC", name: "Air Canada", color: "#F01428", hubs: ["YYZ"], fleet: [] },
  { code: "TK", name: "Turkish Airlines", color: "#C8102E", hubs: ["IST"], fleet: [] },
  { code: "KL", name: "KLM", color: "#00A1DE", hubs: ["AMS"], fleet: [] },
  { code: "WN", name: "Southwest Airlines", color: "#304CB2", hubs: [], fleet: [] },
  { code: "B6", name: "JetBlue", color: "#003876", hubs: ["JFK", "BOS"], fleet: [] },
  { code: "FR", name: "Ryanair", color: "#073590", hubs: [], fleet: [] },
  { code: "AS", name: "Alaska Airlines", color: "#01426A", hubs: ["SEA"], fleet: [] },
  { code: "CX", name: "Cathay Pacific", color: "#005F3B", hubs: ["HKG"], fleet: [] },
  { code: "JL", name: "Japan Airlines", color: "#C8102E", hubs: ["HND"], fleet: [] },
  { code: "CZ", name: "China Southern", color: "#004D9B", hubs: [], fleet: [] },
  { code: "CA", name: "Air China", color: "#C8102E", hubs: [], fleet: [] },
  { code: "MU", name: "China Eastern", color: "#002B7A", hubs: [], fleet: [] },
  { code: "LX", name: "Swiss", color: "#C8102E", hubs: [], fleet: [] },
  { code: "OS", name: "Austrian", color: "#C8102E", hubs: [], fleet: [] },
  { code: "SK", name: "Scandinavian", color: "#000066", hubs: [], fleet: [] },
  { code: "AY", name: "Finnair", color: "#0B1560", hubs: [], fleet: [] },
  { code: "IB", name: "Iberia", color: "#D71921", hubs: [], fleet: [] },
  { code: "TP", name: "TAP Portugal", color: "#2D8C41", hubs: [], fleet: [] },
  { code: "EI", name: "Aer Lingus", color: "#006B5A", hubs: [], fleet: [] },
  { code: "NK", name: "Spirit Airlines", color: "#FFE600", hubs: [], fleet: [] },
  { code: "F9", name: "Frontier Airlines", color: "#005831", hubs: ["DEN"], fleet: [] },
  { code: "HA", name: "Hawaiian Airlines", color: "#7B2481", hubs: [], fleet: [] },
];

// ICAO 3-letter prefix → IATA 2-letter code
const icaoToIata: Record<string, string> = {
  AAL: "AA", DAL: "DL", UAL: "UA", BAW: "BA", DLH: "LH", AFR: "AF",
  UAE: "EK", QTR: "QR", SIA: "SQ", ANA: "NH", KAL: "KE", QFA: "QF",
  ACA: "AC", THY: "TK", KLM: "KL", SWA: "WN", JBU: "B6", RYR: "FR",
  ASA: "AS", CPA: "CX", JAL: "JL", CSN: "CZ", CCA: "CA", CES: "MU",
  SWR: "LX", AUA: "OS", SAS: "SK", FIN: "AY", IBE: "IB", TAP: "TP",
  EIN: "EI", NKS: "NK", FFT: "F9", HAL: "HA",
  SKW: "OO", RPA: "YX", ENY: "MQ", EZY: "U2", EVA: "BR",
  AZA: "AZ", LOT: "LO", CSA: "OK", TAM: "JJ",
};

const airlineMap = new Map<string, Airline>();
airlines.forEach((a) => airlineMap.set(a.code, a));

export const UNKNOWN_AIRLINE: Airline = {
  code: "??", name: "Unknown Operator", color: "#4a6080", hubs: [], fleet: [],
};

export const UNKNOWN_AIRPORT: Airport = {
  code: "---", name: "Unknown", city: "---", country: "---", lat: 0, lng: 0,
};

export function lookupAirline(callsign: string): Airline {
  if (!callsign || callsign.trim().length < 3) return UNKNOWN_AIRLINE;
  const prefix = callsign.trim().substring(0, 3).toUpperCase();
  const iata = icaoToIata[prefix];
  if (iata) {
    return airlineMap.get(iata) || UNKNOWN_AIRLINE;
  }
  return UNKNOWN_AIRLINE;
}

export function callsignToFlightNumber(callsign: string): string {
  if (!callsign || callsign.trim().length === 0) return "N/A";
  const trimmed = callsign.trim();
  const prefix = trimmed.substring(0, 3).toUpperCase();
  const iata = icaoToIata[prefix];
  if (iata) {
    const numPart = trimmed.substring(3);
    return `${iata}${numPart}`;
  }
  return trimmed;
}

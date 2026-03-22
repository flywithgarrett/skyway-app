export interface Airport {
  code: string;       // IATA (e.g. "JFK")
  icao: string;       // ICAO (e.g. "KJFK")
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
}

export interface Airline {
  code: string;
  name: string;
  color: string;
  hubs: string[];
  fleet: string[];
}

export type FlightStatus = "en-route" | "landed" | "scheduled" | "taxiing" | "unknown";

export interface Flight {
  id: string;              // fa_flight_id
  flightNumber: string;    // ident (e.g. "UAL452")
  callsign: string;
  airline: Airline;
  origin: Airport;
  destination: Airport;
  status: FlightStatus;
  // Schedule times (ISO strings)
  scheduledDep: string | null;
  actualDep: string | null;
  scheduledArr: string | null;
  estimatedArr: string | null;
  actualArr: string | null;
  // Aircraft
  aircraft: string | null;     // aircraft_type (e.g. "B738")
  registration: string | null; // e.g. "N12345"
  // Position
  altitude: number;  // feet (hundreds)
  speed: number;     // knots
  heading: number;
  progress: number;  // 0-100
  currentLat: number;
  currentLng: number;
  // Extras
  originCountry: string;
  onGround: boolean;
  verticalRate: number | null;  // fpm
  squawk: string | null;
  geoAltitude: number | null;
  lastContact: number;          // unix timestamp
  routeDistance: number | null;  // nm
}

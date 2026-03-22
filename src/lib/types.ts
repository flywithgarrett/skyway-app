export interface Airport {
  code: string;
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

export type FlightStatus = "en-route" | "on-ground" | "unknown";

export interface Flight {
  id: string;
  flightNumber: string;
  callsign: string;
  airline: Airline;
  origin: Airport;
  destination: Airport;
  status: FlightStatus;
  departureTime: string | null;
  arrivalTime: string | null;
  aircraft: string | null;
  altitude: number;
  speed: number;
  heading: number;
  progress: number;
  currentLat: number;
  currentLng: number;
  // OpenSky fields
  icao24: string;
  originCountry: string;
  onGround: boolean;
  verticalRate: number | null;
  squawk: string | null;
  geoAltitude: number | null;
  lastContact: number;
}

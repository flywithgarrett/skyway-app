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

export type FlightStatus = "en-route" | "delayed" | "on-time" | "landed" | "boarding";

export interface Flight {
  id: string;
  flightNumber: string;
  airline: Airline;
  origin: Airport;
  destination: Airport;
  status: FlightStatus;
  departureTime: string;
  arrivalTime: string;
  aircraft: string;
  altitude: number;
  speed: number;
  heading: number;
  progress: number;
  currentLat: number;
  currentLng: number;
}

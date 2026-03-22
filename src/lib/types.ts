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

// --- Detailed flight info (for deep-dive panel) ---

export interface GateInfo {
  terminal: string;
  gate: string;
  baggage?: string;
}

export interface TimeInfo {
  scheduled: string;
  actual: string | null;
  estimated: string | null;
}

export interface TelemetryPoint {
  timestamp: string;     // HH:MM format
  altitude: number;      // feet
  speed: number;         // knots
  minutesElapsed: number;
}

export interface AircraftInfo {
  type: string;
  registration: string;
  icao24: string;
  age: number;           // years
  seatConfig: string;
}

export interface FlightHistoryEntry {
  flightNumber: string;
  date: string;
  origin: string;
  destination: string;
  status: FlightStatus;
  departureTime: string;
  arrivalTime: string;
}

export interface FlightDetail {
  flight: Flight;
  departure: {
    gate: GateInfo;
    times: TimeInfo;
    runway: string;
  };
  arrival: {
    gate: GateInfo;
    times: TimeInfo;
    runway: string;
  };
  aircraftInfo: AircraftInfo;
  telemetry: TelemetryPoint[];
  distanceNm: number;
  distanceRemaining: number;
  flightTimeTotal: string;
  flightTimeRemaining: string;
  filedAltitude: number;
  filedSpeed: number;
  squawk: string;
  flightHistory: FlightHistoryEntry[];
  upcomingFlights: FlightHistoryEntry[];
}

import { Flight } from "./types";

export interface EmergencyFlight {
  flight: Flight;
  emergencyType: "squawk7700" | "squawk7600" | "squawk7500";
  detectedAt: string; // ISO timestamp
  description: string;
  resolved: boolean;
}

// Mock data — will be replaced with FlightAware AeroAPI
export function getEmergencyFlights(): {
  active: EmergencyFlight[];
  past24h: EmergencyFlight[];
} {
  const now = new Date();

  const makeFlight = (
    id: string,
    callsign: string,
    airlineCode: string,
    airlineName: string,
    color: string,
    country: string,
    lat: number,
    lng: number,
    alt: number,
    spd: number,
    hdg: number,
    squawk: string,
    aircraft: string | null,
  ): Flight => ({
    id,
    flightNumber: callsign,
    callsign,
    airline: { code: airlineCode, name: airlineName, color, hubs: [], fleet: [] },
    origin: { code: "---", name: "Unknown", city: "---", country: "---", lat: 0, lng: 0 },
    destination: { code: "---", name: "Unknown", city: "---", country: "---", lat: 0, lng: 0 },
    status: "en-route",
    departureTime: null,
    arrivalTime: null,
    aircraft,
    altitude: alt,
    speed: spd,
    heading: hdg,
    progress: 0,
    currentLat: lat,
    currentLng: lng,
    icao24: id,
    originCountry: country,
    onGround: false,
    verticalRate: -8.5,
    squawk,
    geoAltitude: alt + 200,
    lastContact: Math.floor(now.getTime() / 1000) - 5,
  });

  const active: EmergencyFlight[] = [
    {
      flight: makeFlight(
        "a1b2c3", "UAL872", "UA", "United Airlines", "#002244",
        "United States", 41.2, -74.8, 28500, 445, 95, "7700", "B777-200"
      ),
      emergencyType: "squawk7700",
      detectedAt: new Date(now.getTime() - 12 * 60000).toISOString(),
      description: "General emergency declared over northeastern United States. Aircraft descending from FL350.",
      resolved: false,
    },
    {
      flight: makeFlight(
        "d4e5f6", "DLH419", "LH", "Lufthansa", "#05164D",
        "Germany", 50.8, 7.2, 15200, 310, 270, "7700", "A350-900"
      ),
      emergencyType: "squawk7700",
      detectedAt: new Date(now.getTime() - 4 * 60000).toISOString(),
      description: "Emergency squawk detected near Cologne, Germany. Aircraft diverting.",
      resolved: false,
    },
  ];

  const past24h: EmergencyFlight[] = [
    {
      flight: makeFlight(
        "g7h8i9", "BAW284", "BA", "British Airways", "#075AAA",
        "United Kingdom", 51.47, -0.45, 0, 0, 0, "7700", "A380-800"
      ),
      emergencyType: "squawk7700",
      detectedAt: new Date(now.getTime() - 3 * 3600000).toISOString(),
      description: "Medical emergency. Aircraft landed safely at LHR. Passenger treated by paramedics.",
      resolved: true,
    },
    {
      flight: makeFlight(
        "j0k1l2", "QTR8", "QR", "Qatar Airways", "#5C0632",
        "Qatar", 25.27, 51.61, 0, 0, 0, "7600", "B777-300ER"
      ),
      emergencyType: "squawk7600",
      detectedAt: new Date(now.getTime() - 8 * 3600000).toISOString(),
      description: "Radio failure (squawk 7600). Communications restored after 15 minutes. Landed normally at DOH.",
      resolved: true,
    },
    {
      flight: makeFlight(
        "m3n4o5", "AAL1192", "AA", "American Airlines", "#0078D2",
        "United States", 32.9, -97.04, 0, 0, 0, "7700", "B737-800"
      ),
      emergencyType: "squawk7700",
      detectedAt: new Date(now.getTime() - 14 * 3600000).toISOString(),
      description: "Engine indication warning. Precautionary landing at DFW. Aircraft inspected and cleared.",
      resolved: true,
    },
  ];

  return { active, past24h };
}

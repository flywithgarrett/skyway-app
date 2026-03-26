// Airline check-in URLs — maps IATA code to check-in page
export const CHECKIN_URLS: Record<string, string> = {
  // US Major
  AA: "https://www.aa.com/checkin",
  DL: "https://www.delta.com/us/en/check-in",
  UA: "https://www.united.com/ual/en/us/checkin",
  WN: "https://www.southwest.com/flight/retrieveCheckinDoc.html",
  B6: "https://www.jetblue.com/checkin",
  AS: "https://www.alaskaair.com/checkin",
  NK: "https://www.spirit.com/CheckIn",
  F9: "https://www.flyfrontier.com/travel/my-trip/check-in",
  HA: "https://www.hawaiianairlines.com/manage/check-in",
  SY: "https://www.suncountry.com/manage-trip/check-in",
  G4: "https://www.allegiantair.com/check-in",
  // US Regional
  OH: "https://www.psa-airlines.com/",
  MQ: "https://www.aa.com/checkin",
  OO: "https://www.skywest.com/",
  YX: "https://www.aa.com/checkin",
  // Canada
  AC: "https://www.aircanada.com/check-in",
  WS: "https://www.westjet.com/check-in",
  PD: "https://www.porterairlines.com/en/check-in",
  // Europe
  BA: "https://www.britishairways.com/travel/olcilandingpageauthaliasaliased/public/en_gb",
  AF: "https://www.airfrance.com/en/check-in",
  LH: "https://www.lufthansa.com/us/en/check-in",
  KL: "https://www.klm.com/check-in",
  IB: "https://www.iberia.com/us/check-in/",
  AZ: "https://www.ita-airways.com/en_us/check-in.html",
  SK: "https://www.flysas.com/en/check-in/",
  AY: "https://www.finnair.com/en/check-in",
  EI: "https://www.aerlingus.com/manage-trip/check-in/",
  LX: "https://www.swiss.com/us/en/check-in",
  OS: "https://www.austrian.com/us/en/check-in",
  TP: "https://www.flytap.com/en-us/check-in",
  VY: "https://www.vueling.com/en/my-booking/check-in",
  FR: "https://www.ryanair.com/gb/en/check-in",
  U2: "https://www.easyjet.com/en/check-in",
  // Middle East
  EK: "https://www.emirates.com/us/english/manage-booking/online-check-in/",
  QR: "https://www.qatarairways.com/en/online-check-in.html",
  EY: "https://www.etihad.com/en-us/manage/check-in",
  TK: "https://www.turkishairlines.com/en-us/online-services/online-check-in/",
  // Asia
  SQ: "https://www.singaporeair.com/en_UK/us/manage-booking/checkin/",
  CX: "https://www.cathaypacific.com/cx/en_US/manage-trip/check-in.html",
  NH: "https://www.ana.co.jp/en/us/check-in/",
  JL: "https://www.jal.co.jp/en/inter/checkin/",
  KE: "https://www.koreanair.com/global/en/check-in/",
  TG: "https://www.thaiairways.com/en_US/manage_booking/check_in.page",
  AI: "https://www.airindia.com/check-in",
  // Oceania
  QF: "https://www.qantas.com/au/en/manage-booking/check-in.html",
  NZ: "https://www.airnewzealand.com/check-in",
  // Latin America
  AM: "https://www.aeromexico.com/en-us/check-in",
  AV: "https://www.avianca.com/en/check-in/",
  LA: "https://www.latamairlines.com/us/en/check-in",
  CM: "https://www.copaair.com/en-us/web-check-in/",
};

// Weather code to icon + label
export function weatherInfo(code: number): { icon: string; label: string } {
  if (code === 0) return { icon: "☀️", label: "Clear" };
  if (code <= 3) return { icon: "🌤️", label: "Partly Cloudy" };
  if (code <= 48) return { icon: "🌫️", label: "Fog" };
  if (code <= 57) return { icon: "🌧️", label: "Drizzle" };
  if (code <= 67) return { icon: "🌧️", label: "Rain" };
  if (code <= 77) return { icon: "🌨️", label: "Snow" };
  if (code <= 86) return { icon: "🌨️", label: "Heavy Snow" };
  if (code <= 99) return { icon: "⛈️", label: "Thunderstorm" };
  return { icon: "☁️", label: "Cloudy" };
}

// Check if check-in window is open for a flight
export function isCheckinOpen(scheduledDep: string | null): boolean {
  if (!scheduledDep) return false;
  const depMs = new Date(scheduledDep).getTime();
  const now = Date.now();
  const hoursUntilDep = (depMs - now) / 3600000;
  return hoursUntilDep <= 24 && hoursUntilDep > 0.75; // 24h to 45min before
}

// Get check-in URL for an airline code
export function getCheckinUrl(airlineCode: string): string | null {
  return CHECKIN_URLS[airlineCode.toUpperCase()] || null;
}

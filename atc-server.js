#!/usr/bin/env node
"use strict";

require("dotenv").config();

const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
const Anthropic = require("@anthropic-ai/sdk");
const NodeCache = require("node-cache");

/* ═══════════════════════════════════════════════════════════════════════════
   1. CONFIG — Airport feeds derived from shared atc-airports.json
   ═══════════════════════════════════════════════════════════════════════════ */

const atcAirportsJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, "src", "data", "atc-airports.json"), "utf-8")
);

// Build AIRPORT_FEEDS: ICAO → Broadcastify stream URL
const AIRPORT_FEEDS = {};
for (const airport of atcAirportsJson) {
  AIRPORT_FEEDS[airport.icao] = `https://audio.broadcastify.com/${airport.broadcastifyFeedId}.mp3`;
}

// Build AIRPORT_META: ICAO → { name, lat, lng, city }
const AIRPORT_META = {};
for (const airport of atcAirportsJson) {
  AIRPORT_META[airport.icao] = {
    name: airport.name,
    city: airport.city,
    lat: airport.lat,
    lng: airport.lng,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. STATE
   ═══════════════════════════════════════════════════════════════════════════ */

// Lazy init — don't crash at startup if key is missing
let _openai = null;
function getOpenAI() {
  if (!_openai) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY not set — add it to .env");
    _openai = new OpenAI({ apiKey: key });
  }
  return _openai;
}

// Lazy Anthropic client
let _anthropic = null;
function getAnthropic() {
  if (!_anthropic) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY not set — add it to .env");
    _anthropic = new Anthropic({ apiKey: key });
  }
  return _anthropic;
}

// FlightAware / OpenSky position cache — 15s TTL
const positionCache = new NodeCache({ stdTTL: 15, checkperiod: 20 });

// Per-airport state
const feedState = new Map(); // ICAO → { active, status, ffmpeg, backoff, transcripts[] }
const CHUNK_DIR_BASE = "/tmp/atc";
const CHUNK_DURATION = 5; // seconds
const MAX_TRANSCRIPTS = 200; // ring buffer per airport (step 5 spec)
const MAX_BACKOFF = 30000; // ms

const WHISPER_PROMPT =
  "ATC aviation radio communication. Aircraft callsigns, tail numbers, " +
  "runway assignments, headings, altitudes. Examples: UAL432, N234AB, " +
  "runway two-two right, descend and maintain flight level two-four-zero.";

/* ═══════════════════════════════════════════════════════════════════════════
   3. FFMPEG CHUNKER — slice Icecast stream into 5s WAV files
   ═══════════════════════════════════════════════════════════════════════════ */

function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
    if (e.code !== "EEXIST") console.error(`[mkdir] ${dir}:`, e.message);
  }
}

function startFfmpeg(icao) {
  const state = feedState.get(icao);
  if (!state || !state.active) return;

  const url = AIRPORT_FEEDS[icao];
  if (!url) return;

  const chunkDir = path.join(CHUNK_DIR_BASE, icao);
  ensureDir(chunkDir);

  const outPattern = path.join(chunkDir, "chunk_%s.wav");

  console.log(`[${icao}] Starting ffmpeg → ${url}`);
  state.status = "connecting";

  // Use strftime so each segment gets a unique timestamp-based filename
  const ffmpeg = spawn("ffmpeg", [
    "-hide_banner",
    "-loglevel", "warning",
    "-reconnect", "1",
    "-reconnect_streamed", "1",
    "-reconnect_delay_max", "10",
    "-i", url,
    "-f", "segment",
    "-segment_time", String(CHUNK_DURATION),
    "-segment_format", "wav",
    "-strftime", "1",
    "-ar", "16000",
    "-ac", "1",
    "-acodec", "pcm_s16le",
    path.join(chunkDir, "chunk_%Y%m%d%H%M%S.wav"),
  ]);

  state.ffmpeg = ffmpeg;

  ffmpeg.stderr.on("data", (data) => {
    const msg = data.toString().trim();
    if (msg) {
      // Once ffmpeg writes output, the stream is live
      if (state.status === "connecting") {
        state.status = "live";
        state.backoff = 1000;
        console.log(`[${icao}] Stream LIVE`);
      }
    }
  });

  ffmpeg.on("error", (err) => {
    console.error(`[${icao}] ffmpeg spawn error:`, err.message);
    state.status = "down";
    state.ffmpeg = null;
    scheduleReconnect(icao);
  });

  ffmpeg.on("close", (code) => {
    console.log(`[${icao}] ffmpeg exited code=${code}`);
    state.ffmpeg = null;
    if (state.active) {
      state.status = "down";
      scheduleReconnect(icao);
    }
  });

  // Watch the chunk directory for new .wav files
  startChunkWatcher(icao, chunkDir);
}

function scheduleReconnect(icao) {
  const state = feedState.get(icao);
  if (!state || !state.active) return;

  const delay = Math.min(state.backoff, MAX_BACKOFF);
  console.log(`[${icao}] Reconnecting in ${delay}ms`);
  state.reconnectTimer = setTimeout(() => {
    state.backoff = Math.min(state.backoff * 2, MAX_BACKOFF);
    startFfmpeg(icao);
  }, delay);
}

function stopFeed(icao) {
  const state = feedState.get(icao);
  if (!state) return;

  state.active = false;
  state.status = "stopped";

  if (state.ffmpeg) {
    try { state.ffmpeg.kill("SIGTERM"); } catch {}
    state.ffmpeg = null;
  }
  if (state.reconnectTimer) {
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = null;
  }
  if (state.watcher) {
    try { state.watcher.close(); } catch {}
    state.watcher = null;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. CHUNK WATCHER — detect new WAV files, send to Whisper, delete
   ═══════════════════════════════════════════════════════════════════════════ */

function startChunkWatcher(icao, chunkDir) {
  const state = feedState.get(icao);
  if (!state) return;

  // Close existing watcher
  if (state.watcher) {
    try { state.watcher.close(); } catch {}
  }

  try {
    state.watcher = fs.watch(chunkDir, async (eventType, filename) => {
      if (eventType !== "rename" || !filename || !filename.endsWith(".wav")) return;

      const filepath = path.join(chunkDir, filename);

      // Wait briefly for ffmpeg to finish writing
      await sleep(500);

      // Verify file exists and has content
      try {
        const stat = fs.statSync(filepath);
        if (stat.size < 1000) {
          // Too small — likely empty/silence, skip
          try { fs.unlinkSync(filepath); } catch {}
          return;
        }
      } catch {
        return; // file gone already
      }

      try {
        await processChunk(icao, filepath);
      } catch (err) {
        console.error(`[${icao}] Chunk processing error:`, err.message);
      }

      // Always delete chunk after processing
      try { fs.unlinkSync(filepath); } catch {}
    });
  } catch (err) {
    console.error(`[${icao}] fs.watch error:`, err.message);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. WHISPER TRANSCRIPTION
   ═══════════════════════════════════════════════════════════════════════════ */

async function processChunk(icao, filepath) {
  const timestamp = Date.now();

  console.log(`[${icao}] Transcribing ${path.basename(filepath)}`);

  const transcription = await getOpenAI().audio.transcriptions.create({
    file: fs.createReadStream(filepath),
    model: "whisper-1",
    prompt: WHISPER_PROMPT,
    language: "en",
    response_format: "text",
  });

  const text = (transcription || "").toString().trim();
  if (!text || text.length < 3) return; // skip empty/noise

  console.log(`[${icao}] "${text}"`);
  processTranscript(icao, text, timestamp);
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. TRANSCRIPT PROCESSOR — full 5-step pipeline
   ═══════════════════════════════════════════════════════════════════════════ */

// ── STEP 1: Comprehensive callsign extraction regex ──
const CALLSIGN_PATTERNS = [
  // Airline ICAO callsigns: 3 uppercase letters + 1-4 digits + optional suffix
  /\b([A-Z]{3}\d{1,4}[A-Z]?)\b/g,
  // N-numbers (GA / US registry): N + 1-5 alphanumeric
  /\b(N\d{1,5}[A-Z]{0,2})\b/g,
  // Military callsigns: keyword + digits
  /\b((?:REACH|EVAC|KNIFE|HOOK|DUKE|TOPCAT|CODY|IRON|STEEL|BLADE|RAZOR|VIPER|TANGO|BOXER)\s?\d{1,4})\b/gi,
];

function extractCallsigns(text) {
  const upper = text.toUpperCase();
  const found = new Set();
  for (const re of CALLSIGN_PATTERNS) {
    re.lastIndex = 0; // reset global regex
    let m;
    while ((m = re.exec(upper)) !== null) {
      // Normalise: strip interior spaces for military (REACH 42 → REACH42)
      found.add(m[1].replace(/\s+/g, ""));
    }
  }
  return [...found];
}

// ── STEP 2: FlightAware AeroAPI v4 position lookup (with cache) ──
async function queryFlightAware(callsign) {
  const cacheKey = `fa:${callsign}`;
  const cached = positionCache.get(cacheKey);
  if (cached !== undefined) return cached; // null means "checked, no result"

  const apiKey = process.env.FLIGHTAWARE_API_KEY;
  if (!apiKey) {
    positionCache.set(cacheKey, null);
    return null;
  }

  try {
    const url = `https://aeroapi.flightaware.com/aeroapi/flights/${encodeURIComponent(callsign)}`;
    const resp = await fetch(url, {
      headers: { "x-apikey": apiKey },
      signal: AbortSignal.timeout(5000),
    });

    if (!resp.ok) {
      console.warn(`[FA] ${callsign} → HTTP ${resp.status}`);
      positionCache.set(cacheKey, null);
      return null;
    }

    const data = await resp.json();
    const flights = data.flights || [];

    // Find the first flight with a last_position
    for (const fl of flights) {
      const pos = fl.last_position;
      if (pos && pos.latitude != null && pos.longitude != null) {
        const result = {
          ident: fl.ident,
          fa_flight_id: fl.fa_flight_id,
          latitude: pos.latitude,
          longitude: pos.longitude,
          altitude: pos.altitude ?? null,     // hundreds of feet
          groundspeed: pos.groundspeed ?? null,
          heading: pos.heading ?? null,
        };
        positionCache.set(cacheKey, result);
        console.log(`[FA] ${callsign} → ${pos.latitude.toFixed(2)},${pos.longitude.toFixed(2)} FL${pos.altitude ?? "?"}`);
        return result;
      }
    }

    positionCache.set(cacheKey, null);
    return null;
  } catch (err) {
    console.error(`[FA] ${callsign} error:`, err.message);
    positionCache.set(cacheKey, null);
    return null;
  }
}

// ── STEP 2b: OpenSky Network fallback ──
async function queryOpenSky(callsign) {
  const cacheKey = `os:${callsign}`;
  const cached = positionCache.get(cacheKey);
  if (cached !== undefined) return cached;

  try {
    // OpenSky accepts callsign as a query filter (padded to 8 chars internally)
    const cs = callsign.toUpperCase().trim();
    const url = `https://opensky-network.org/api/states/all?callsign=${encodeURIComponent(cs)}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });

    if (!resp.ok) {
      console.warn(`[OpenSky] ${callsign} → HTTP ${resp.status}`);
      positionCache.set(cacheKey, null);
      return null;
    }

    const data = await resp.json();
    const states = data.states || [];

    if (states.length > 0) {
      // OpenSky state vector indices:
      // 0=icao24, 1=callsign, 2=origin_country, 3=time_position,
      // 4=last_contact, 5=longitude, 6=latitude, 7=baro_altitude,
      // 8=on_ground, 9=velocity, 10=true_track
      const s = states[0];
      const result = {
        ident: (s[1] || callsign).trim(),
        fa_flight_id: `opensky_${s[0]}`,
        latitude: s[6],
        longitude: s[5],
        altitude: s[7] != null ? Math.round(s[7] * 3.28084 / 100) : null, // m → FL
        groundspeed: s[9] != null ? Math.round(s[9] * 1.94384) : null,    // m/s → kts
        heading: s[10] != null ? Math.round(s[10]) : null,
      };
      positionCache.set(cacheKey, result);
      console.log(`[OpenSky] ${callsign} → ${result.latitude?.toFixed(2)},${result.longitude?.toFixed(2)}`);
      return result;
    }

    positionCache.set(cacheKey, null);
    return null;
  } catch (err) {
    console.error(`[OpenSky] ${callsign} error:`, err.message);
    positionCache.set(cacheKey, null);
    return null;
  }
}

// ── Combined position lookup: FlightAware → OpenSky fallback ──
async function getFlightPosition(callsign) {
  const faResult = await queryFlightAware(callsign);
  if (faResult) return faResult;
  return queryOpenSky(callsign);
}

// ── STEP 4: Emergency detection via Claude Haiku ──
const EMERGENCY_SYSTEM_PROMPT =
  "You monitor ATC radio transcripts for aviation safety events. " +
  "If the text contains ANY of these: mayday, pan-pan, emergency declared, " +
  "engine failure, engine fire, fuel emergency, gear unsafe, runway incursion, " +
  "collision alert, TCAS, wind shear, hijack, medical emergency, lost comms — " +
  'respond ONLY with valid JSON: {"emergency":true,"type":"string","severity":"high|medium|low"} ' +
  'Otherwise respond ONLY with: {"emergency":false}';

async function detectEmergency(text) {
  try {
    const client = getAnthropic();
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      system: EMERGENCY_SYSTEM_PROMPT,
      messages: [{ role: "user", content: text }],
    });

    const raw = (msg.content[0]?.text || "").trim();
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (err) {
    console.error("[EmergencyDetect] Error:", err.message);
    return { emergency: false };
  }
}

// ── MAIN processTranscript — orchestrates all 5 steps ──
async function processTranscript(icao, text, timestamp) {
  const state = feedState.get(icao);
  if (!state) return;

  try {
    // ── STEP 1: Extract callsigns ──
    const callsigns = extractCallsigns(text);
    const primaryCallsign = callsigns[0] || null;

    console.log(`[${icao}] Callsigns: [${callsigns.join(", ") || "none"}]`);

    // ── STEP 2 & 3: Lookup positions and emit per-callsign transcripts ──
    // Fire all lookups in parallel
    const positionResults = await Promise.all(
      callsigns.map(async (cs) => {
        try {
          const pos = await getFlightPosition(cs);
          return { callsign: cs, position: pos };
        } catch (err) {
          console.error(`[${icao}] Position lookup failed for ${cs}:`, err.message);
          return { callsign: cs, position: null };
        }
      })
    );

    // Emit a transcript event for each callsign that has a position
    let emitted = false;
    for (const { callsign, position } of positionResults) {
      if (position) {
        const entry = {
          type: "transcript",
          icao,
          text,
          timestamp,
          callsign,
          lat: position.latitude,
          lng: position.longitude,
          altitude: position.altitude,
          groundspeed: position.groundspeed,
          heading: position.heading,
          flightId: position.fa_flight_id,
        };
        state.transcripts.push(entry);
        if (state.transcripts.length > MAX_TRANSCRIPTS) state.transcripts.shift();
        broadcastToSubscribers(icao, entry);
        emitted = true;
      }
    }

    // If no callsign had a position (or no callsigns found), still emit
    // a basic transcript so clients always get the text
    if (!emitted) {
      const entry = {
        type: "transcript",
        icao,
        text,
        timestamp,
        callsign: primaryCallsign,
        lat: AIRPORT_META[icao]?.lat ?? null,
        lng: AIRPORT_META[icao]?.lng ?? null,
        altitude: null,
        groundspeed: null,
        heading: null,
        flightId: null,
      };
      state.transcripts.push(entry);
      if (state.transcripts.length > MAX_TRANSCRIPTS) state.transcripts.shift();
      broadcastToSubscribers(icao, entry);
    }

    // ── STEP 4: Emergency detection via Claude ──
    // Run in background — don't block the pipeline
    detectEmergency(text).then((result) => {
      try {
        if (result.emergency) {
          const alert = {
            type: "alert",
            icao,
            severity: result.severity || "high",
            alertType: result.type || "unknown",
            text,
            timestamp,
          };
          // Emergencies broadcast to ALL subscribers, not just this airport
          broadcastToAll(alert);
          console.log(`[${icao}] 🚨 EMERGENCY ${result.type} (${result.severity}): "${text}"`);
        }
      } catch (err) {
        console.error("[EmergencyBroadcast]", err.message);
      }
    });

    // (STEP 5 is handled above — transcripts stored in state.transcripts ring buffer)

  } catch (err) {
    console.error(`[${icao}] processTranscript error:`, err.message);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. WEBSOCKET SERVER
   ═══════════════════════════════════════════════════════════════════════════ */

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Track subscriptions: ws → Set<icao>
const clientSubs = new Map();

wss.on("connection", (ws) => {
  clientSubs.set(ws, new Set());
  console.log(`[WS] Client connected (${wss.clients.size} total)`);

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.subscribe) {
        const icao = msg.subscribe.toUpperCase();
        if (AIRPORT_FEEDS[icao]) {
          clientSubs.get(ws).add(icao);
          ws.send(JSON.stringify({ type: "subscribed", icao }));
          console.log(`[WS] Client subscribed to ${icao}`);
        } else {
          ws.send(JSON.stringify({ type: "error", message: `Unknown airport: ${icao}` }));
        }
      }

      if (msg.unsubscribe) {
        const icao = msg.unsubscribe.toUpperCase();
        clientSubs.get(ws)?.delete(icao);
        ws.send(JSON.stringify({ type: "unsubscribed", icao }));
      }
    } catch (err) {
      console.error("[WS] Bad message:", err.message);
    }
  });

  ws.on("close", () => {
    clientSubs.delete(ws);
    console.log(`[WS] Client disconnected (${wss.clients.size} total)`);
  });

  ws.on("error", (err) => {
    console.error("[WS] Client error:", err.message);
    clientSubs.delete(ws);
  });
});

function broadcastToSubscribers(icao, data) {
  const payload = JSON.stringify(data);
  for (const [ws, subs] of clientSubs) {
    if (subs.has(icao) && ws.readyState === 1 /* OPEN */) {
      try { ws.send(payload); } catch {}
    }
  }
}

// Emergency alerts go to ALL connected clients regardless of subscription
function broadcastToAll(data) {
  const payload = JSON.stringify(data);
  for (const [ws] of clientSubs) {
    if (ws.readyState === 1 /* OPEN */) {
      try { ws.send(payload); } catch {}
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   8. REST ENDPOINTS
   ═══════════════════════════════════════════════════════════════════════════ */

// GET /feeds — list of airport feeds with status
app.get("/feeds", (_req, res) => {
  try {
    const feeds = Object.keys(AIRPORT_FEEDS).map((icao) => {
      const state = feedState.get(icao);
      return {
        icao,
        url: AIRPORT_FEEDS[icao],
        status: state?.status ?? "inactive",
        active: state?.active ?? false,
        transcriptCount: state?.transcripts.length ?? 0,
      };
    });
    res.json({ feeds });
  } catch (err) {
    console.error("[/feeds]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /airports — ICAO list with name, lat, lng
app.get("/airports", (_req, res) => {
  try {
    const airports = Object.entries(AIRPORT_META).map(([icao, meta]) => ({
      icao,
      ...meta,
      feedAvailable: !!AIRPORT_FEEDS[icao],
    }));
    res.json({ airports });
  } catch (err) {
    console.error("[/airports]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /subscribe — start ingesting an airport's feed
app.post("/subscribe", (req, res) => {
  try {
    const { icao } = req.body;
    if (!icao) return res.status(400).json({ error: "Missing icao" });

    const code = icao.toUpperCase();
    if (!AIRPORT_FEEDS[code]) {
      return res.status(404).json({ error: `Unknown airport: ${code}` });
    }

    // Already active?
    const existing = feedState.get(code);
    if (existing?.active) {
      return res.json({ icao: code, status: existing.status, message: "Already active" });
    }

    // Initialize state and start
    feedState.set(code, {
      active: true,
      status: "starting",
      ffmpeg: null,
      watcher: null,
      backoff: 1000,
      reconnectTimer: null,
      transcripts: existing?.transcripts ?? [],
    });

    startFfmpeg(code);
    res.json({ icao: code, status: "starting", message: "Feed ingestion started" });
  } catch (err) {
    console.error("[/subscribe]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /unsubscribe — stop ingesting an airport's feed
app.post("/unsubscribe", (req, res) => {
  try {
    const { icao } = req.body;
    if (!icao) return res.status(400).json({ error: "Missing icao" });

    const code = icao.toUpperCase();
    stopFeed(code);
    res.json({ icao: code, status: "stopped" });
  } catch (err) {
    console.error("[/unsubscribe]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /transcript/:icao?last=50 — recent transcript lines
app.get("/transcript/:icao", (req, res) => {
  try {
    const icao = req.params.icao.toUpperCase();
    const last = Math.min(parseInt(req.query.last) || 50, MAX_TRANSCRIPTS);

    const state = feedState.get(icao);
    if (!state) {
      return res.json({ icao, transcripts: [], message: "No feed active for this airport" });
    }

    const transcripts = state.transcripts.slice(-last);
    res.json({ icao, count: transcripts.length, transcripts });
  } catch (err) {
    console.error("[/transcript]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    activeFeeds: [...feedState.entries()]
      .filter(([, s]) => s.active)
      .map(([icao]) => icao),
    wsClients: wss.clients.size,
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   9. HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ═══════════════════════════════════════════════════════════════════════════
   10. START
   ═══════════════════════════════════════════════════════════════════════════ */

const PORT = process.env.ATC_PORT || 3001;

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║  SkyWay ATC Server                               ║
║  REST + WebSocket on port ${String(PORT).padEnd(25)}║
║  ${Object.keys(AIRPORT_FEEDS).length} airport feeds configured                  ║
╚══════════════════════════════════════════════════╝

Endpoints:
  GET  /feeds              — list feeds + status
  GET  /airports           — airport metadata
  POST /subscribe          — start ingesting { icao }
  POST /unsubscribe        — stop ingesting { icao }
  GET  /transcript/:icao   — recent transcripts
  GET  /health             — server health
  WS   ws://localhost:${PORT} — real-time transcripts

Send { subscribe: "KJFK" } over WebSocket for live feed.
`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n[SkyWay ATC] Shutting down...");
  for (const icao of feedState.keys()) stopFeed(icao);
  wss.close();
  server.close(() => process.exit(0));
});

process.on("SIGTERM", () => {
  for (const icao of feedState.keys()) stopFeed(icao);
  wss.close();
  server.close(() => process.exit(0));
});

// Never crash on unhandled errors
process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("[FATAL] Unhandled rejection:", err);
});

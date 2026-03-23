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

/* ═══════════════════════════════════════════════════════════════════════════
   1. CONFIG — Airport feeds (ICAO → Broadcastify Icecast MP3 URL)
   ═══════════════════════════════════════════════════════════════════════════ */

const AIRPORT_FEEDS = {
  KJFK: "https://audio.broadcastify.com/tebmyznqc8audm.mp3",
  KLAX: "https://audio.broadcastify.com/000000000.mp3",
  KORD: "https://audio.broadcastify.com/000000001.mp3",
  KATL: "https://audio.broadcastify.com/000000002.mp3",
  KDFW: "https://audio.broadcastify.com/000000003.mp3",
  KDEN: "https://audio.broadcastify.com/000000004.mp3",
  KSFO: "https://audio.broadcastify.com/000000005.mp3",
  KBOS: "https://audio.broadcastify.com/000000006.mp3",
  KMIA: "https://audio.broadcastify.com/000000007.mp3",
  KEWR: "https://audio.broadcastify.com/000000008.mp3",
};

const AIRPORT_META = {
  KJFK: { name: "John F. Kennedy Intl", lat: 40.6413, lng: -73.7781 },
  KLAX: { name: "Los Angeles Intl", lat: 33.9425, lng: -118.4081 },
  KORD: { name: "Chicago O'Hare Intl", lat: 41.9742, lng: -87.9073 },
  KATL: { name: "Hartsfield-Jackson Atlanta Intl", lat: 33.6407, lng: -84.4277 },
  KDFW: { name: "Dallas/Fort Worth Intl", lat: 32.8998, lng: -97.0403 },
  KDEN: { name: "Denver Intl", lat: 39.8561, lng: -104.6737 },
  KSFO: { name: "San Francisco Intl", lat: 37.6213, lng: -122.379 },
  KBOS: { name: "Boston Logan Intl", lat: 42.3656, lng: -71.0096 },
  KMIA: { name: "Miami Intl", lat: 25.7959, lng: -80.287 },
  KEWR: { name: "Newark Liberty Intl", lat: 40.6895, lng: -74.1745 },
};

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

// Per-airport state
const feedState = new Map(); // ICAO → { active, status, ffmpeg, backoff, transcripts[] }
const CHUNK_DIR_BASE = "/tmp/atc";
const CHUNK_DURATION = 5; // seconds
const MAX_TRANSCRIPTS = 500; // ring buffer per airport
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
   6. TRANSCRIPT PROCESSOR — extract callsign, store, broadcast
   ═══════════════════════════════════════════════════════════════════════════ */

// Regex to extract common callsign patterns from ATC text
const CALLSIGN_RE =
  /\b([A-Z]{3}\d{1,4}[A-Z]?|N\d{1,5}[A-Z]{0,2}|[A-Z]+-[A-Z]+)\b/;

function processTranscript(icao, text, timestamp) {
  const state = feedState.get(icao);
  if (!state) return;

  // Try to extract a callsign from the transcript
  const csMatch = text.toUpperCase().match(CALLSIGN_RE);
  const callsign = csMatch ? csMatch[1] : null;

  const entry = {
    type: "transcript",
    icao,
    text,
    timestamp,
    callsign,
    lat: AIRPORT_META[icao]?.lat ?? null,
    lng: AIRPORT_META[icao]?.lng ?? null,
    flightId: callsign, // can be enriched later with flight matching
  };

  // Store in ring buffer
  state.transcripts.push(entry);
  if (state.transcripts.length > MAX_TRANSCRIPTS) {
    state.transcripts.shift();
  }

  // Broadcast to subscribed WebSocket clients
  broadcastToSubscribers(icao, entry);

  // Check for alert-worthy phrases
  checkAlerts(icao, text, timestamp);
}

function checkAlerts(icao, text, timestamp) {
  const upper = text.toUpperCase();

  const alertPatterns = [
    { pattern: /MAYDAY/i, severity: "critical", alertType: "mayday" },
    { pattern: /PAN PAN/i, severity: "high", alertType: "pan_pan" },
    { pattern: /EMERGENCY/i, severity: "high", alertType: "emergency" },
    { pattern: /GO.?AROUND/i, severity: "medium", alertType: "go_around" },
    { pattern: /MISSED APPROACH/i, severity: "medium", alertType: "missed_approach" },
    { pattern: /TRAFFIC ALERT/i, severity: "high", alertType: "traffic_alert" },
    { pattern: /WIND ?SHEAR/i, severity: "high", alertType: "windshear" },
    { pattern: /HOLD(?:ING)? SHORT/i, severity: "low", alertType: "hold_short" },
  ];

  for (const { pattern, severity, alertType } of alertPatterns) {
    if (pattern.test(upper)) {
      const alert = { type: "alert", icao, severity, alertType, text, timestamp };
      broadcastToSubscribers(icao, alert);
      console.log(`[${icao}] ⚠ ALERT ${alertType}: "${text}"`);
    }
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

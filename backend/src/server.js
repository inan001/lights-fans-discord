/**
 * server.js — Office Device Simulator & API
 * ==========================================
 * Single source of truth for office device state.
 * Consumed by the web dashboard and the Discord bot.
 *
 * HOW TO RUN
 * ----------
 *   cd backend
 *   npm install          # first time only
 *   npm run dev          # nodemon — auto-restarts on file changes (development)
 *   npm start            # plain node (production / CI)
 *
 *   Override the port:   PORT=5000 npm start
 *
 * SAMPLE CURL COMMANDS
 * --------------------
 *   # 1. All 18 devices
 *   curl http://localhost:4000/devices
 *
 *   # 2. Devices in a single room
 *   curl http://localhost:4000/rooms/work1
 *
 *   # 3. Aggregate power usage
 *   curl http://localhost:4000/usage
 *
 *   # 4. Active alerts (after_hours / stuck_on)
 *   curl http://localhost:4000/alerts
 *
 * WEBSOCKET
 * ---------
 *   Connect to ws://localhost:4000.
 *   On connect you immediately receive the current device list.
 *   The full list is pushed again on every simulator tick (15–30 s).
 *   Message shape: { "type": "devices", "devices": [ ...18 objects... ] }
 *
 *   Quick test:  npx wscat -c ws://localhost:4000
 */

"use strict";

const http    = require("http");
const express = require("express");
const cors    = require("cors");
const WebSocket = require("ws");

const { generateDevices }  = require("./devices");
const { startSimulator }   = require("./simulator");
const { evaluateAlerts }   = require("./alerts");
const buildRoutes          = require("./routes");

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

// ── Shared in-memory state ──────────────────────────────────────────────────
const devices = generateDevices();
let currentAlerts = evaluateAlerts(devices);

// ── Express app ──────────────────────────────────────────────────────────────
const app = express();
app.use(cors());          // wide-open CORS — fine for a hackathon LAN demo
app.use(express.json());

app.use("/", buildRoutes(devices, () => currentAlerts));

// 404 fallback — keeps the error shape consistent for consumers
app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.path });
});

// ── HTTP + WebSocket server ──────────────────────────────────────────────────
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });

/**
 * Pushes the current device list to every connected WebSocket client.
 * @returns {number} Number of clients that received the message.
 */
function broadcastDevices() {
  const payload = JSON.stringify({ type: "devices", devices });
  let sent = 0;
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
      sent++;
    }
  });
  return sent;
}

wss.on("connection", (ws, req) => {
  // Send current snapshot immediately so the UI doesn't need to wait
  ws.send(JSON.stringify({ type: "devices", devices }));

  console.log(
    `[ws]  client connected from ${req.socket.remoteAddress} — ` +
    `total clients: ${wss.clients.size}`
  );

  ws.on("close", () => {
    console.log(`[ws]  client disconnected — total clients: ${wss.clients.size}`);
  });

  ws.on("error", err => {
    console.error("[ws]  socket error:", err.message);
  });
});

// ── Simulator ────────────────────────────────────────────────────────────────
const simulator = startSimulator(devices, (updatedDevices, flippedCount) => {
  // Re-evaluate alerts after every state change
  currentAlerts = evaluateAlerts(updatedDevices);

  const onCount = updatedDevices.filter(d => d.status === "on").length;
  const sent    = broadcastDevices();

  console.log(
    `[sim] flipped ${flippedCount} device(s) — ` +
    `${onCount}/18 on  alerts=${currentAlerts.length}  ws_clients=${sent}`
  );
});

// ── Boot ─────────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  const onAtBoot = devices.filter(d => d.status === "on").length;
  console.log("══════════════════════════════════════════════════════════");
  console.log("  Office Device Backend — started");
  console.log(`  REST  : http://localhost:${PORT}`);
  console.log(`  WS    : ws://localhost:${PORT}`);
  console.log(`  Time  : ${new Date().toISOString()}`);
  console.log(`  Devices: ${devices.length} total  (${onAtBoot} on at boot)`);
  console.log("══════════════════════════════════════════════════════════");
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
function shutdown(signal) {
  console.log(`\n[server] ${signal} received — shutting down gracefully`);
  simulator.stop();
  wss.clients.forEach(c => c.terminate());
  server.close(() => {
    console.log("[server] HTTP server closed");
    process.exit(0);
  });
  // Force-exit if the server hasn't closed in 3 s
  setTimeout(() => process.exit(1), 3_000).unref();
}

process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

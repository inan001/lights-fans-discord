# Smart Office Electricity Monitor

Real-time dashboard + Discord bot for monitoring office lights, fans, and power consumption — built for a hackathon.

> **3 rooms · 15 devices · 1 backend · 2 frontends**

---

## Architecture

```
┌─────────────────────┐
│  Simulated Devices  │  15 devices (3 rooms × 2 fans + 3 lights)
│  (in-memory store)  │  Randomised state flips every 15–30 s
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐        REST (/devices, /usage, /alerts)
│    Backend API      │◄─────────────────────────────────────────── Discord Bot
│  Express + WS       │        WebSocket (ws://localhost:4000)        (discord.js)
│  Port 4000          │◄─────────────────────────────────────────── Web Dashboard
└─────────────────────┘                                              (Vanilla JS)
```

Both the **web dashboard** and the **Discord bot** share the same backend as a single source of truth. See `docs/system_diagram.png` for the full visual diagram.

---

## Quick Start

### Prerequisites
- **Node.js** ≥ 18
- **npm** ≥ 9
- A Discord bot token (for the bot only — dashboard works without it)

### 1. Start the Backend

```bash
cd backend
npm install
npm start          # or: npm run dev (with auto-restart)
```

Backend runs at `http://localhost:4000`. Verify with:
```bash
curl http://localhost:4000/health
```

### 2. Open the Dashboard

Open `dashboard/index.html` in any modern browser (or serve it with any static server).

- If the backend is running → connects via WebSocket for live updates
- If the backend is down → automatically falls back to a built-in demo simulator

### 3. Start the Discord Bot

```bash
cd bot
cp .env.example .env   # then edit .env with your real credentials
npm install
npm start
```

#### Bot Commands

| Command | What it does |
|---------|-------------|
| `!status` | Summarises all rooms (e.g. "Drawing Room: 1 fan ON, 2 lights ON") |
| `!room <name>` | Status of a specific room — use `drawing`, `work1`, or `work2` |
| `!usage` | Total power draw + estimated daily kWh |

The bot also proactively posts alert messages to a designated channel when devices are left on after hours.

---

## Project Structure

```
hackathon/
├── backend/               # Express + WebSocket API + device simulator
│   ├── src/
│   │   ├── server.js      # Entry point — HTTP, WS, and simulator wiring
│   │   ├── devices.js     # 15-device seed data & flipDevice() helper
│   │   ├── simulator.js   # Random state-flip loop (15–30 s interval)
│   │   ├── alerts.js      # Alert rule evaluator (after_hours, stuck_on)
│   │   └── routes.js      # REST endpoints (/devices, /rooms/:room, /usage, /alerts)
│   ├── package.json
│   └── README.md
│
├── dashboard/             # Real-time web dashboard (vanilla HTML/CSS/JS)
│   └── index.html         # Single-file app with floor map, device panel, power analytics, alerts
│
├── bot/                   # Discord bot
│   ├── src/
│   │   ├── index.js       # Bot entry point with alert watcher
│   │   ├── backendClient.js # HTTP client for backend REST API
│   │   ├── humanize.js    # Human-friendly message formatting + optional LLM integration
│   │   └── commands/      # !status, !room, !usage command handlers
│   ├── .env.example       # Template — copy to .env and fill in credentials
│   └── package.json
│
├── docs/                  # Diagrams and schematics
│   ├── system_diagram.png # High-level architecture diagram
│   └── wokwi/             # Hardware schematic (ESP32 + 1 room circuit)
│       ├── diagram.json   # Wokwi circuit definition
│       └── sketch.ino     # Arduino sketch for sensor reading
│
└── README.md              # ← You are here
```

---

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/devices` | GET | All 15 device objects |
| `/rooms/:room` | GET | Devices for one room (`drawing`, `work1`, `work2`) |
| `/usage` | GET | Total watts, per-room breakdown, estimated daily kWh |
| `/alerts` | GET | Active alerts (after-hours, stuck-on) |
| `/health` | GET | Liveness check |

**WebSocket**: Connect to `ws://localhost:4000`. Receive `{ type: "devices", devices: [...] }` on connect and on every simulator tick.

---

## Alert Rules

| Alert Type | Trigger |
|-----------|---------|
| `after_hours` | Any device ON outside 09:00–17:00 local time |
| `stuck_on` | All 5 devices in a room ON for > 2 hours continuously |

---

## Hardware Schematic

A representative 1-room circuit is provided in `docs/wokwi/`. It demonstrates how an ESP32 would read the on/off state of 2 fans and 3 lights using relay modules, and optionally sense current draw via an ACS712 sensor.

Open the circuit in [Wokwi Simulator](https://wokwi.com) by importing `docs/wokwi/diagram.json`.

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Node.js, Express, ws (WebSocket) |
| Dashboard | Vanilla HTML/CSS/JS, Chart.js, SVG |
| Discord Bot | discord.js v14, node-fetch |
| LLM (optional) | Anthropic Claude API for conversational responses |
| Hardware Sim | Wokwi (ESP32 + Arduino) |

---

## License

MIT

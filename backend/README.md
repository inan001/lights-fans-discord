# Backend — Office Device Simulator & API

Single source of truth for office device state. Serves a REST API and a
WebSocket stream consumed by the **web dashboard** and the **Discord bot**.

Generates 15 simulated devices (2 fans + 3 lights per room × 3 rooms) and
randomly flips 1–3 of them every 15–30 seconds so the rest of the stack
has live data to display.

---

## Quick Start

```bash
cd backend
npm install       # first time only
npm run dev       # nodemon — auto-restarts on file changes
# or
npm start         # plain node (production / CI)
```

Default port: **4000**.  Override: `PORT=5000 npm start`

---

## Sample `curl` Commands

```bash
# 1. All 15 devices
curl http://localhost:4000/devices

# 2. Devices in a specific room (drawing | work1 | work2)
curl http://localhost:4000/rooms/work1

# 3. Aggregate power usage snapshot
curl http://localhost:4000/usage

# 4. Active alerts (after_hours / stuck_on)
curl http://localhost:4000/alerts
```

---

## Endpoints

### `GET /devices`
Returns the full array of 15 device objects.

```json
[
  {
    "id": "drawing-fan-1",
    "type": "fan",
    "room": "drawing",
    "status": "on",
    "watts": 60,
    "last_changed": "2026-07-03T13:15:00.000Z"
  }
]
```

---

### `GET /rooms/:room`
Devices for one room.  Returns **404** for unknown room names.

```bash
curl http://localhost:4000/rooms/work1
curl -i http://localhost:4000/rooms/garage   # → 404
```

```json
{
  "error": "Room not found",
  "requested": "garage",
  "valid_rooms": ["drawing", "work1", "work2"]
}
```

---

### `GET /usage`
Aggregate power numbers.

```json
{
  "total_watts": 240,
  "per_room": { "drawing": 75, "work1": 60, "work2": 105 },
  "kwh_today_estimate": 1.92
}
```

`kwh_today_estimate` = `total_watts × 8h ÷ 1000`
(rough "if current draw held for a workday" figure).

---

### `GET /alerts`
Currently active alerts, re-evaluated on every simulator tick.

```json
[
  {
    "id": "after_hours-drawing",
    "type": "after_hours",
    "room": "drawing",
    "message": "2 device(s) still on in \"drawing\" outside business hours (09:00–17:00)",
    "timestamp": "2026-07-03T18:01:00.000Z"
  }
]
```

| `type`        | Trigger | When you'll see it |
|---------------|---------|--------------------|
| `after_hours` | Any device ON outside 09:00–17:00 local time | Run server outside business hours |
| `stuck_on`    | All devices in a room ON with no `last_changed` update for > 2 h | After 2+ h of continuous full-room uptime |

Alert `id` values are **stable** (e.g. `after_hours-drawing`, `stuck_on-work1`),
so the Discord bot can dedup with a simple `Set`.

---

### `GET /health`
Liveness check.

```json
{ "ok": true, "device_count": 15, "on_count": 11, "server_time": "..." }
```

---

## WebSocket

Connect to `ws://localhost:4000`.

- Receive the full device list **immediately on connect**.
- Receive the full device list again **on every simulator tick** (15–30 s).

Message format:

```json
{ "type": "devices", "devices": [ /* 15 device objects */ ] }
```

Quick test:

```bash
npx wscat -c ws://localhost:4000
```

---

## File Map

```
backend/
├── package.json
├── README.md
└── src/
    ├── server.js      — Express + WebSocket + simulator wiring (entry point)
    ├── devices.js     — 15-device seed & flipDevice() helper
    ├── simulator.js   — randomised 15–30 s flip loop
    ├── alerts.js      — pure after_hours + stuck_on rule evaluator
    └── routes.js      — Express router factory (all read-only endpoints)
```

---

## Notes for the Team

- **CORS is wide open** — fine for a hackathon LAN demo, not for production.
- **State is in-memory** — a server restart reseeds all 15 devices.
- **Alert IDs are stable** — safe to use as dedup keys in the bot's `Set`.
- **Server time, not client time** — `after_hours` uses the backend's local
  clock. If your demo machine is on a weird timezone, set the `TZ` env var
  before starting: `TZ=Asia/Dhaka npm start`
- **Extending the simulator** — increase `MAX_FLIPS` in `simulator.js` or
  add a `POST /devices/:id/toggle` route in `routes.js` for manual overrides.

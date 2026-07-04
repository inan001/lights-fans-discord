# Rulebook Checklist

Source: `Hackathon-Problem-Statement-Preliminary-Round-v1.2.md`.

Note: the problem statement says "18 devices" in two places, but the fixed
office setup is 3 rooms x 5 devices = 15 devices. This project follows the
fixed office setup.

| Requirement | Status | Where |
| --- | --- | --- |
| High-level system diagram, no Mermaid | Done | `docs/system_diagram.png` |
| Hardware/electrical schematic for a representative room | Done | `docs/wokwi/diagram.json`, `docs/wokwi/sketch.ino` |
| Simulated dynamic device data | Done | `backend/src/devices.js`, `backend/src/simulator.js` |
| Device status includes status, power, room, last changed | Done | `GET /devices` |
| Real-time dashboard updates without refresh | Done | WebSocket stream in `backend/src/server.js` and `dashboard/index.html` |
| Live device status panel grouped by room | Done | `dashboard/index.html` |
| Live total and per-room power consumption | Done | `GET /usage`, dashboard power panel |
| Active alerts for after-hours and stuck-on rooms | Done | `backend/src/alerts.js`, dashboard alerts panel |
| Discord bot reads real backend data | Done | `bot/src/backendClient.js`, bot commands |
| Discord commands: `!status`, `!room`, `!usage` | Done | `bot/src/commands/` |
| Humanized bot responses | Done | `bot/src/humanize.js` |
| Optional LLM wording | Available | `ANTHROPIC_API_KEY` support in `bot/src/humanize.js` |
| Proactive Discord alert posts | Done | `bot/src/index.js` alert watcher |
| Single backend source of truth | Done | Dashboard and bot both read `http://localhost:4000` |
| Clear setup README | Done | `README.md`, `backend/README.md` |
| Video demo | Not in repo | Record separately for submission |

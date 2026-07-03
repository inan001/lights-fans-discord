/**
 * alerts.js
 * ---------
 * Pure alert-evaluation logic — no side effects, no imports from server.js.
 *
 * Rules
 * ─────
 * after_hours  Any device that is ON outside 09:00–17:00 local time.
 *              One alert per room (aggregated), not one per device.
 *
 * stuck_on     All 5 devices in a room have been ON continuously AND the
 *              oldest last_changed timestamp in that room is more than
 *              2 hours ago (i.e. nothing has changed for ≥ 2h).
 *
 * Alert shape
 * ───────────
 * {
 *   id:        "after_hours-drawing",   // stable — safe to use as a dedup key
 *   type:      "after_hours" | "stuck_on",
 *   room:      "drawing" | "work1" | "work2",
 *   message:   "human-readable description",
 *   timestamp: "<ISO 8601>"             // when the rule was last evaluated
 * }
 */

"use strict";

const ROOMS            = ["drawing", "work1", "work2"];
const WORK_START_HOUR  = 9;   // 09:00 local
const WORK_END_HOUR    = 17;  // 17:00 local
const STUCK_ON_MS      = 2 * 60 * 60 * 1000; // 2 hours in ms

/**
 * Returns the local hour (0–23) for the current moment.
 * Override by setting TZ env var before starting the server.
 */
function localHour() {
  return new Date().getHours();
}

/**
 * True when the current local time is outside business hours.
 */
function isAfterHours() {
  const h = localHour();
  return h < WORK_START_HOUR || h >= WORK_END_HOUR;
}

/**
 * Evaluates all alert rules against the current device list.
 *
 * @param {Array<object>} devices — the shared device store (read-only usage)
 * @returns {Array<object>}       — zero or more alert objects
 */
function evaluateAlerts(devices) {
  const now    = new Date();
  const alerts = [];
  const afterHours = isAfterHours();

  for (const room of ROOMS) {
    const roomDevices = devices.filter(d => d.room === room);
    const onDevices   = roomDevices.filter(d => d.status === "on");

    // ── after_hours rule ──────────────────────────────────────────────
    if (afterHours && onDevices.length > 0) {
      alerts.push({
        id:        `after_hours-${room}`,
        type:      "after_hours",
        room,
        message:
          `${onDevices.length} device(s) still on in "${room}" outside ` +
          `business hours (${WORK_START_HOUR.toString().padStart(2,"0")}:00–` +
          `${WORK_END_HOUR.toString().padStart(2,"0")}:00)`,
        timestamp: now.toISOString(),
      });
    }

    // ── stuck_on rule ─────────────────────────────────────────────────
    // All devices in the room must be ON …
    if (onDevices.length === roomDevices.length && roomDevices.length > 0) {
      // … and the oldest last_changed must be > 2 h ago
      const oldestChange = roomDevices.reduce((oldest, d) => {
        const t = new Date(d.last_changed).getTime();
        return t < oldest ? t : oldest;
      }, Infinity);

      if (now.getTime() - oldestChange > STUCK_ON_MS) {
        const stuckMinutes = Math.round((now.getTime() - oldestChange) / 60_000);
        alerts.push({
          id:        `stuck_on-${room}`,
          type:      "stuck_on",
          room,
          message:
            `All ${roomDevices.length} devices in "${room}" have been on ` +
            `continuously for ${stuckMinutes} minutes without a state change.`,
          timestamp: now.toISOString(),
        });
      }
    }
  }

  return alerts;
}

module.exports = { evaluateAlerts };

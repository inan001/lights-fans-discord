/**
 * routes.js
 * ---------
 * Express router factory.  All routes are read-only; state changes happen
 * only inside the simulator so there is a single source of truth.
 *
 * Endpoints
 * ─────────
 *   GET /devices          → all 18 device objects
 *   GET /rooms/:room      → devices filtered to one room (404 on bad room)
 *   GET /usage            → { total_watts, per_room, kwh_today_estimate }
 *   GET /alerts           → active alert objects (re-evaluated each tick)
 *   GET /health           → liveness check
 */

"use strict";

const { Router } = require("express");

const VALID_ROOMS = ["drawing", "work1", "work2"];

/**
 * Builds and returns an Express Router.
 *
 * @param {Array<object>} devices      — shared in-memory device store
 * @param {Function}      getAlerts    — () => currentAlerts[]  (closure from server.js)
 * @returns {Router}
 */
function buildRoutes(devices, getAlerts) {
  const router = Router();

  // ── GET /devices ──────────────────────────────────────────────────────────
  // Returns the full array of 18 device objects.
  router.get("/devices", (_req, res) => {
    res.json(devices);
  });

  // ── GET /rooms/:room ──────────────────────────────────────────────────────
  // Returns devices for one room. 404 on unknown room names.
  router.get("/rooms/:room", (req, res) => {
    const { room } = req.params;

    if (!VALID_ROOMS.includes(room)) {
      return res.status(404).json({
        error:       "Room not found",
        requested:   room,
        valid_rooms: VALID_ROOMS,
      });
    }

    const roomDevices = devices.filter(d => d.room === room);
    res.json(roomDevices);
  });

  // ── GET /usage ────────────────────────────────────────────────────────────
  // Aggregate power snapshot.
  // kwh_today_estimate = total_watts × 8h ÷ 1000
  //   (rough "if this draw held for a full workday" figure).
  router.get("/usage", (_req, res) => {
    const per_room = {};

    for (const room of VALID_ROOMS) {
      per_room[room] = devices
        .filter(d => d.room === room)
        .reduce((sum, d) => sum + d.watts, 0);
    }

    const total_watts       = Object.values(per_room).reduce((s, w) => s + w, 0);
    const kwh_today_estimate = parseFloat(((total_watts * 8) / 1000).toFixed(3));

    res.json({ total_watts, per_room, kwh_today_estimate });
  });

  // ── GET /alerts ───────────────────────────────────────────────────────────
  // Returns the alerts that were calculated on the last simulator tick.
  router.get("/alerts", (_req, res) => {
    res.json(getAlerts());
  });

  // ── GET /health ───────────────────────────────────────────────────────────
  // Quick liveness / sanity check endpoint.
  router.get("/health", (_req, res) => {
    res.json({
      ok:           true,
      device_count: devices.length,
      on_count:     devices.filter(d => d.status === "on").length,
      server_time:  new Date().toISOString(),
    });
  });

  return router;
}

module.exports = buildRoutes;

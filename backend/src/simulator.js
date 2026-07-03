/**
 * simulator.js
 * ------------
 * Drives the simulated office state by randomly flipping 1–3 devices
 * every 15–30 seconds.
 *
 * Design notes
 *   • Works on the shared `devices` array by reference — no copy is returned.
 *   • After flipping, calls `onTick(devices, flippedCount)` so the server
 *     can re-evaluate alerts and broadcast via WebSocket.
 *   • Randomised interval keeps the demo from feeling mechanical.
 */

"use strict";

const { flipDevice } = require("./devices");

const MIN_INTERVAL_MS = 15_000;  // 15 s
const MAX_INTERVAL_MS = 30_000;  // 30 s
const MIN_FLIPS       = 1;
const MAX_FLIPS       = 3;

/**
 * Returns a random integer in [min, max] inclusive.
 */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Picks `count` unique random indices from [0, length).
 */
function pickIndices(length, count) {
  const indices = new Set();
  while (indices.size < count) {
    indices.add(randInt(0, length - 1));
  }
  return [...indices];
}

/**
 * Schedules the next simulator tick with a fresh random delay.
 *
 * @param {Array<object>} devices  — the shared device store (mutated in place)
 * @param {Function}      onTick   — callback(devices, flippedCount) after each tick
 * @returns {{ stop: Function }}   — call stop() to halt the simulator
 */
function startSimulator(devices, onTick) {
  let timeoutId = null;
  let running   = true;

  function tick() {
    if (!running) return;

    const flipCount = randInt(MIN_FLIPS, Math.min(MAX_FLIPS, devices.length));
    const chosen    = pickIndices(devices.length, flipCount);

    chosen.forEach(i => {
      const device    = devices[i];
      const newStatus = device.status === "on" ? "off" : "on";
      flipDevice(device, newStatus);
    });

    onTick(devices, flipCount);

    // Schedule next tick with a fresh random interval
    const delay = randInt(MIN_INTERVAL_MS, MAX_INTERVAL_MS);
    timeoutId   = setTimeout(tick, delay);
  }

  // Kick off the first tick
  const initialDelay = randInt(MIN_INTERVAL_MS, MAX_INTERVAL_MS);
  timeoutId = setTimeout(tick, initialDelay);

  console.log(
    `[sim] started — first tick in ${Math.round(initialDelay / 1000)}s, ` +
    `subsequent ticks every ${MIN_INTERVAL_MS / 1000}–${MAX_INTERVAL_MS / 1000}s`
  );

  return {
    stop() {
      running = false;
      if (timeoutId) clearTimeout(timeoutId);
      console.log("[sim] stopped");
    },
  };
}

module.exports = { startSimulator };

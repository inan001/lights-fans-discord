/**
 * devices.js
 * ----------
 * Generates the canonical in-memory store of 15 office devices.
 *
 * Layout  (3 rooms × 5 devices each = 15 total)
 *   drawing : 2 fans + 3 lights
 *   work1   : 2 fans + 3 lights
 *   work2   : 2 fans + 3 lights
 *
 * Watts contract
 *   fan   on  → 60 W   fan   off → 0 W
 *   light on  → 15 W   light off → 0 W
 */

"use strict";

const ROOMS   = ["drawing", "work1", "work2"];
const FAN_W   = 60;
const LIGHT_W = 15;

/**
 * Returns a past ISO timestamp offset by `minutesAgo` from now,
 * with a small random jitter so devices don't all look identical.
 */
function pastTimestamp(minutesAgo) {
  const jitter = Math.floor(Math.random() * 5) * 60_000; // ±5 min jitter
  return new Date(Date.now() - minutesAgo * 60_000 - jitter).toISOString();
}

/**
 * Watts for a device based on its type and current status.
 * @param {"fan"|"light"} type
 * @param {"on"|"off"} status
 */
function wattsFor(type, status) {
  if (status === "off") return 0;
  return type === "fan" ? FAN_W : LIGHT_W;
}

/**
 * Builds a single device object.
 * @param {string} room
 * @param {"fan"|"light"} type
 * @param {number} index   1-based within room+type pair
 * @param {"on"|"off"} status
 * @param {number} changedMinutesAgo
 */
function makeDevice(room, type, index, status, changedMinutesAgo) {
  return {
    id:           `${room}-${type}-${index}`,
    type,
    room,
    status,
    watts:        wattsFor(type, status),
    last_changed: pastTimestamp(changedMinutesAgo),
  };
}

/**
 * Generates the full 15-device array in a realistic mixed state.
 * 3 rooms × 5 devices (2 fans + 3 lights) = 15 total.
 * Some devices are on, some off, with staggered last_changed times.
 * @returns {Array<object>}
 */
function generateDevices() {
  // prettier-ignore
  // [room, type, index, status, changed_minutes_ago]
  const seed = [
    // --- drawing room ---
    ["drawing", "fan",   1, "on",  45],
    ["drawing", "fan",   2, "off", 90],
    ["drawing", "light", 1, "on",  30],
    ["drawing", "light", 2, "on",  60],
    ["drawing", "light", 3, "off", 15],

    // --- work room 1 ---
    ["work1",   "fan",   1, "on",  20],
    ["work1",   "fan",   2, "on",  75],
    ["work1",   "light", 1, "off", 50],
    ["work1",   "light", 2, "on",  35],
    ["work1",   "light", 3, "on",  10],

    // --- work room 2 ---
    ["work2",   "fan",   1, "off", 40],
    ["work2",   "fan",   2, "on",  55],
    ["work2",   "light", 1, "on",  25],
    ["work2",   "light", 2, "off", 80],
    ["work2",   "light", 3, "on",  65],
  ];

  return seed.map(([room, type, index, status, ago]) =>
    makeDevice(room, type, index, status, ago)
  );
}

/**
 * Mutates a single device's status, watts, and last_changed in place.
 * @param {object} device  — reference to the device in the store
 * @param {"on"|"off"} newStatus
 */
function flipDevice(device, newStatus) {
  device.status       = newStatus;
  device.watts        = wattsFor(device.type, newStatus);
  device.last_changed = new Date().toISOString();
}

module.exports = { generateDevices, flipDevice, wattsFor };

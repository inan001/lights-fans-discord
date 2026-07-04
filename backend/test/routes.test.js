"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const express = require("express");

const buildRoutes = require("../src/routes");
const { generateDevices } = require("../src/devices");

async function withTestServer(handler, fn) {
  const server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();

  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

function createApp(devices, getAlerts, onDevicesChanged) {
  const app = express();
  app.use(express.json());
  app.use("/", buildRoutes(devices, getAlerts, onDevicesChanged));
  return app;
}

test("POST /devices/:id/toggle updates shared state and notifies listeners", async () => {
  const devices = generateDevices();
  const target = devices.find(device => device.id === "drawing-fan-2");
  assert.equal(target.status, "off");

  let notifiedDevices = null;
  let notifiedCount = 0;
  const app = createApp(devices, () => [], updatedDevices => {
    notifiedDevices = updatedDevices;
    notifiedCount += 1;
  });

  await withTestServer(app, async baseUrl => {
    const response = await fetch(`${baseUrl}/devices/drawing-fan-2/toggle`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "on" }),
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.device.id, "drawing-fan-2");
    assert.equal(body.device.status, "on");
    assert.equal(body.device.watts, 60);
  });

  assert.equal(target.status, "on");
  assert.equal(target.watts, 60);
  assert.equal(notifiedDevices, devices);
  assert.equal(notifiedCount, 1);
});

test("POST /devices/:id/toggle rejects invalid status values", async () => {
  const devices = generateDevices();
  const app = createApp(devices, () => [], () => {});

  await withTestServer(app, async baseUrl => {
    const response = await fetch(`${baseUrl}/devices/drawing-fan-2/toggle`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "sleeping" }),
    });

    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.error, "Invalid status");
  });
});

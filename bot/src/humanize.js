import fetch from 'node-fetch';

const roomLabels = {
  work1: 'Work 1',
  work2: 'Work 2',
  drawing: 'Drawing Room',
};

export function humanRoomName(room) {
  return roomLabels[String(room).toLowerCase()] || titleCase(String(room));
}

export function formatStatusSummary(devices) {
  if (!devices.length) {
    return 'I checked the office, but I did not find any devices reporting right now.';
  }

  return Object.entries(groupByRoom(devices))
    .map(([room, roomDevices]) => `${humanRoomName(room)}: ${summarizeDevices(roomDevices)}.`)
    .join('\n');
}

export function formatRoomSummary(room, devices) {
  const label = humanRoomName(room);

  if (!devices.length) {
    return `${label} is quiet right now. I did not find any devices reporting there.`;
  }

  const onDevices = devices.filter((device) => isOn(device.status));
  const wattTotal = sumWatts(devices);

  if (!onDevices.length) {
    return `${label} has ${devices.length} ${plural('device', devices.length)} reporting, and none of them look on. Current draw is about ${wattTotal} W.`;
  }

  return `${label} currently has ${summarizeDevices(onDevices)}. The room is drawing about ${wattTotal} W.`;
}

export function formatUsage(usage) {
  const roomParts = Object.entries(usage.per_room || {})
    .map(([room, watts]) => `${humanRoomName(room)} ${formatWatts(watts)}`);

  const roomSentence = roomParts.length ? ` Across the rooms: ${roomParts.join(', ')}.` : '';
  const kwh = Number(usage.kwh_today_estimate ?? 0).toFixed(2);

  return `The office is using ${formatWatts(usage.total_watts)} right now, with an estimated ${kwh} kWh used today.${roomSentence}`;
}

export function formatAlert(alert) {
  const room = alert.room ? ` in ${humanRoomName(alert.room)}` : '';
  return `Heads up${room}: ${alert.message}`;
}

// OPTIONAL LLM PHRASING:
// If ANTHROPIC_API_KEY is set, callers may use this to turn already-fetched
// backend data into warmer wording. The data still comes from the live backend.
export async function formatWithAnthropic(prompt, fallbackText) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return fallbackText;
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest',
      max_tokens: 160,
      messages: [
        {
          role: 'user',
          content: `${prompt}\n\nKeep it concise, friendly, and factual. Do not invent any data.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    return fallbackText;
  }

  const data = await response.json();
  return data.content?.[0]?.text?.trim() || fallbackText;
}

function groupByRoom(devices) {
  return devices.reduce((rooms, device) => {
    const key = device.room || 'unknown';
    rooms[key] ||= [];
    rooms[key].push(device);
    return rooms;
  }, {});
}

function summarizeDevices(devices) {
  const counts = devices.reduce((acc, device) => {
    const type = String(device.type || 'device').toLowerCase();
    const status = String(device.status || 'unknown').toUpperCase();
    const key = `${type}|${status}`;
    acc[key] ||= { type, status, count: 0 };
    acc[key].count += 1;
    return acc;
  }, {});

  return Object.values(counts)
    .map(({ type, status, count }) => `${count} ${plural(type, count)} ${status}`)
    .join(', ');
}

function sumWatts(devices) {
  return devices.reduce((total, device) => total + Number(device.watts || 0), 0);
}

function formatWatts(watts) {
  return `${Number(watts || 0).toLocaleString()} W`;
}

function isOn(status) {
  return ['on', 'active', 'running'].includes(String(status).toLowerCase());
}

function plural(word, count) {
  if (count === 1) return word;
  if (word.endsWith('s')) return word;
  return `${word}s`;
}

function titleCase(value) {
  return value
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

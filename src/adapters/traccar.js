// Traccar adapter — single REST + WebSocket schema covers ~170 device protocols.
//
// REST shape (GET /api/positions, requires `Accept: application/json`):
//   [
//     { "deviceId": 1, "latitude": ..., "longitude": ...,
//       "altitude": 250, "speed": 12.0, "course": 87,
//       "fixTime": "2026-04-26T17:12:30.000+00:00",
//       "valid": true, "attributes": { "ignition": true, "battery": 90 } },
//     ...
//   ]
//
// WebSocket shape (/api/socket): a JSON envelope per frame, e.g.
//   { "positions": [ ...same shape... ] }
// (devices and events frames also exist; we only emit on positions).
//
// Traccar altitude is metres → convert to feet for the schema.
// Traccar speed is already knots.

const NAME = 'traccar';
const M_TO_FT = 3.28084;

export const traccarAdapter = {
  name: NAME,

  canParse(raw) {
    if (!raw || typeof raw !== 'object') return false;
    const arr = extractPositionsArray(raw);
    if (!arr || arr.length === 0) return false;
    const sample = arr[0];
    return (
      sample &&
      typeof sample === 'object' &&
      'deviceId' in sample &&
      'fixTime' in sample &&
      typeof sample.latitude === 'number' &&
      typeof sample.longitude === 'number'
    );
  },

  normalize(raw) {
    const arr = extractPositionsArray(raw);
    const out = [];
    for (const p of arr) {
      if (typeof p.latitude !== 'number' || typeof p.longitude !== 'number') continue;
      if (p.valid === false) continue;
      out.push({
        id: deviceLabel(p),
        lat: p.latitude,
        lon: p.longitude,
        altitude: typeof p.altitude === 'number' ? p.altitude * M_TO_FT : null,
        heading: typeof p.course === 'number' ? p.course : null,
        speed: typeof p.speed === 'number' ? p.speed : null,
        timestamp: parseTimestamp(p.fixTime),
        source: NAME,
        label: deviceLabel(p),
        meta: extractAttributes(p),
      });
    }
    return out;
  },
};

function extractPositionsArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.positions)) return raw.positions;
  return null;
}

function deviceLabel(p) {
  if (typeof p.deviceName === 'string' && p.deviceName.length) return p.deviceName;
  return `traccar-${p.deviceId}`;
}

function extractAttributes(p) {
  const a = p.attributes && typeof p.attributes === 'object' ? p.attributes : {};
  return {
    deviceId: p.deviceId,
    ignition: a.ignition,
    battery: a.battery,
    odometer: a.odometer,
    raw: a,
  };
}

function parseTimestamp(iso) {
  if (!iso) return Date.now() / 1000;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? Date.now() / 1000 : ms / 1000;
}

// Runtime helper — open a Traccar WebSocket and re-emit normalized positions
// on each `positions` frame, with reconnect + exponential backoff.
// Not exercised by Jest (no DOM/WebSocket); demo wires it up live.
export function connectTraccarWebSocket(url, onPositions, { maxBackoffMs = 30000 } = {}) {
  let backoff = 1000;
  let stopped = false;
  let socket = null;

  function open() {
    if (stopped) return;
    socket = new WebSocket(url);
    socket.addEventListener('open', () => {
      backoff = 1000;
    });
    socket.addEventListener('message', (event) => {
      let frame;
      try {
        frame = JSON.parse(event.data);
      } catch {
        return;
      }
      if (!frame || !Array.isArray(frame.positions)) return;
      const positions = traccarAdapter.normalize(frame);
      if (positions.length) onPositions(positions);
    });
    socket.addEventListener('close', () => scheduleReconnect());
    socket.addEventListener('error', () => {
      try {
        socket.close();
      } catch {
        // ignore
      }
    });
  }

  function scheduleReconnect() {
    if (stopped) return;
    setTimeout(open, backoff);
    backoff = Math.min(backoff * 2, maxBackoffMs);
  }

  open();
  return {
    close() {
      stopped = true;
      if (socket) {
        try {
          socket.close();
        } catch {
          // ignore
        }
      }
    },
  };
}

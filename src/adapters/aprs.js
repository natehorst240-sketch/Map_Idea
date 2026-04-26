// APRS adapter — handles two upstream shapes:
//
// 1. aprs.fi REST API (JSON): https://aprs.fi/page/api
//    { result: "ok", entries: [
//        { name, srccall, lat, lng, time, lasttime, speed, course, altitude, symbol }
//      ] }
//    lat/lng can arrive as decimal strings — parseFloat-safe.
//    speed is km/h; altitude is metres. Convert to knots / feet.
//
// 2. Raw APRS-IS TCP packet (text):
//    CALLSIGN>PATH:!DDMM.MMN/DDDMM.MMW_<symbol>[CSE/SPD][/A=AAAAAA]
//    where !x... or =x... = position without/with timestamp,
//    @x... or /x... = position with timestamp.
//    The optional CSE/SPD trailing bytes give course/speed (knots).
//    Optional /A=AAAAAA encodes altitude in feet.

const NAME = 'aprs';
const KMH_TO_KTS = 0.539957;
const M_TO_FT = 3.28084;

export const aprsAdapter = {
  name: NAME,

  canParse(raw) {
    if (raw && typeof raw === 'object' && raw.result === 'ok' && Array.isArray(raw.entries)) {
      return raw.entries.length === 0 || typeof raw.entries[0].srccall === 'string';
    }
    if (typeof raw === 'string') {
      return PACKET_RE.test(raw);
    }
    return false;
  },

  normalize(raw) {
    if (typeof raw === 'string') {
      const out = [];
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parsed = parseRawPacket(trimmed);
        if (parsed) out.push(parsed);
      }
      return out;
    }
    return normalizeRest(raw);
  },
};

function normalizeRest(raw) {
  const out = [];
  for (const e of raw.entries) {
    const lat = num(e.lat);
    const lon = num(e.lng);
    if (lat === null || lon === null) continue;
    const speedKmh = num(e.speed);
    const altMeters = num(e.altitude);
    const ts = num(e.lasttime) ?? num(e.time) ?? Date.now() / 1000;
    out.push({
      id: e.name || e.srccall,
      lat,
      lon,
      altitude: altMeters !== null ? altMeters * M_TO_FT : null,
      heading: num(e.course),
      speed: speedKmh !== null ? speedKmh * KMH_TO_KTS : null,
      timestamp: ts,
      source: NAME,
      label: e.name || e.srccall,
      meta: {
        srccall: e.srccall,
        symbol: e.symbol,
        path: e.path,
        comment: e.comment,
      },
    });
  }
  return out;
}

function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

// Raw APRS packet: CALL>PATH:DTI...
// DTI = '!', '=', '/', or '@'. The '/' and '@' variants prepend a 7-byte
// timestamp before the lat field.
const PACKET_RE = /^([A-Z0-9-]{3,9})>([^:]+):([!=/@])(.+)$/i;

function parseRawPacket(line) {
  const m = line.match(PACKET_RE);
  if (!m) return null;
  const [, callsign, path, dti, body] = m;
  // Strip a 7-char timestamp for '/' and '@' DTIs (zulu/local time).
  let payload = body;
  if (dti === '/' || dti === '@') {
    if (payload.length < 7) return null;
    payload = payload.slice(7);
  }
  // Compressed format starts with a non-digit symbol-table char; we only
  // handle the uncompressed text format here.
  if (!/^[\d\s]/.test(payload[0])) return null;

  // Uncompressed: DDMM.MM<N|S><sym1>DDDMM.MM<E|W><sym2>[csespd][/A=altitude]
  // Lat = 7 chars + 1 hemi = 8 chars. Lon = 8 chars + 1 hemi = 9 chars.
  if (payload.length < 19) return null;
  const latStr = payload.slice(0, 7);
  const ns = payload[7];
  const sym1 = payload[8];
  const lonStr = payload.slice(9, 17);
  const ew = payload[17];
  const sym2 = payload[18];
  const trailing = payload.slice(19);

  const lat = parseAprsLat(latStr, ns);
  const lon = parseAprsLon(lonStr, ew);
  if (lat === null || lon === null) return null;

  // Optional CSE/SPD: 7 chars in form "CCC/SSS" where CCC=course, SSS=speed (knots).
  let heading = null;
  let speed = null;
  const csm = trailing.match(/^(\d{3})\/(\d{3})/);
  if (csm) {
    heading = parseInt(csm[1], 10);
    speed = parseInt(csm[2], 10);
  }

  // Optional altitude /A=AAAAAA in feet.
  let altitude = null;
  const altM = trailing.match(/\/A=(\d{6})/);
  if (altM) altitude = parseInt(altM[1], 10);

  return {
    id: callsign,
    lat,
    lon,
    altitude,
    heading,
    speed,
    timestamp: Date.now() / 1000,
    source: NAME,
    label: callsign,
    meta: {
      path,
      symbolTable: sym1,
      symbolCode: sym2,
      dti,
    },
  };
}

function parseAprsLat(raw, hemi) {
  const deg = parseInt(raw.slice(0, 2), 10);
  const min = parseFloat(raw.slice(2));
  if (!Number.isFinite(deg) || !Number.isFinite(min)) return null;
  let v = deg + min / 60;
  if (hemi === 'S' || hemi === 's') v = -v;
  return v;
}

function parseAprsLon(raw, hemi) {
  const deg = parseInt(raw.slice(0, 3), 10);
  const min = parseFloat(raw.slice(3));
  if (!Number.isFinite(deg) || !Number.isFinite(min)) return null;
  let v = deg + min / 60;
  if (hemi === 'W' || hemi === 'w') v = -v;
  return v;
}

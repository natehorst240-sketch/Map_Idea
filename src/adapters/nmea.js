// NMEA 0183 adapter — parses raw $..GGA / $..RMC sentences from any GPS.
//
// Reference: https://aprs.gids.nl/nmea/ and https://gpsd.gitlab.io/gpsd/NMEA.html
//
// Talker prefixes accepted: GP (GPS), GN (multi-GNSS), GL (GLONASS),
// BD / GB (BeiDou), GA (Galileo). All map to the same merge per device.
//
// NMEA itself carries no device identifier — one serial stream is one device.
// Callers can either:
//   - feed a bare string of sentences (default deviceId = "nmea-default"), or
//   - feed an envelope { source: "nmea", deviceId, sentences } to multiplex.
//
// GGA + RMC are merged in a per-device ring buffer. A position is emitted as
// soon as both sides are available (or after MAX_STALENESS_MS with one side).

const NAME = 'nmea';
const MAX_STALENESS_MS = 5000;

const buffers = new Map(); // deviceId -> { gga, rmc, lastEmittedKey }

const TALKER = '(?:GP|GN|GL|BD|GB|GA)';
const SENTENCE_RE = new RegExp(`^\\$${TALKER}(GGA|RMC),`);
const FINGERPRINT_RE = new RegExp(`^\\$${TALKER}(GGA|RMC),`, 'm');

export const nmeaAdapter = {
  name: NAME,

  canParse(raw) {
    const text = extractText(raw);
    if (!text) return false;
    return FINGERPRINT_RE.test(text);
  },

  normalize(raw) {
    const { deviceId, text } = extractEnvelope(raw);
    const out = [];
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line.startsWith('$')) continue;
      if (!validateChecksum(line)) continue;
      const parsed = parseSentence(line);
      if (!parsed) continue;
      const merged = mergeBuffer(deviceId, parsed);
      if (merged) out.push(merged);
    }
    return out;
  },

  // Test hook — clears the merge buffers between runs.
  reset() {
    buffers.clear();
  },
};

function extractText(raw) {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && typeof raw.sentences === 'string') return raw.sentences;
  return null;
}

function extractEnvelope(raw) {
  if (typeof raw === 'string') return { deviceId: 'nmea-default', text: raw };
  return {
    deviceId: raw.deviceId || 'nmea-default',
    text: raw.sentences || '',
  };
}

// Checksum: XOR of every byte between $ and *, hex-compared to the trailing
// two chars after *. Sentences without * are accepted (some fixtures omit it).
function validateChecksum(line) {
  const star = line.lastIndexOf('*');
  if (star === -1) return true;
  const body = line.slice(1, star);
  const expected = line.slice(star + 1).trim().toUpperCase();
  if (!/^[0-9A-F]{2}$/.test(expected)) return false;
  let cs = 0;
  for (let i = 0; i < body.length; i++) cs ^= body.charCodeAt(i);
  return cs.toString(16).toUpperCase().padStart(2, '0') === expected;
}

function parseSentence(line) {
  const m = line.match(SENTENCE_RE);
  if (!m) return null;
  const type = m[1];
  const payload = line.slice(0, line.lastIndexOf('*') === -1 ? line.length : line.lastIndexOf('*'));
  const fields = payload.split(',');
  if (type === 'GGA') return parseGGA(fields);
  if (type === 'RMC') return parseRMC(fields);
  return null;
}

// $xxGGA,time,lat,N/S,lon,E/W,fix,nsats,hdop,alt,M,geoid,M,age,refStation
function parseGGA(f) {
  const fix = parseInt(f[6], 10);
  if (!fix || fix === 0) return null;
  const lat = parseLat(f[2], f[3]);
  const lon = parseLon(f[4], f[5]);
  if (lat === null || lon === null) return null;
  const altMeters = f[9] === '' ? null : parseFloat(f[9]);
  const altitudeFt = altMeters === null || Number.isNaN(altMeters) ? null : altMeters * 3.28084;
  return {
    kind: 'gga',
    lat,
    lon,
    altitude: altitudeFt,
    fix,
    nsats: parseInt(f[7], 10) || null,
    timeUtc: f[1] || null, // HHMMSS.SSS — no date in GGA, RMC supplies it
  };
}

// $xxRMC,time,status,lat,N/S,lon,E/W,speed_knots,track,date,magvar,magvar_dir
function parseRMC(f) {
  if (f[2] !== 'A') return null; // V = void
  const lat = parseLat(f[3], f[4]);
  const lon = parseLon(f[5], f[6]);
  if (lat === null || lon === null) return null;
  const speed = f[7] === '' ? null : parseFloat(f[7]);
  const heading = f[8] === '' ? null : parseFloat(f[8]);
  const ts = parseRmcTimestamp(f[1], f[9]);
  return {
    kind: 'rmc',
    lat,
    lon,
    speed: Number.isFinite(speed) ? speed : null,
    heading: Number.isFinite(heading) ? heading : null,
    timestamp: ts,
  };
}

function parseLat(raw, hemi) {
  if (!raw || !hemi) return null;
  // DDMM.MMMM
  const deg = parseInt(raw.slice(0, 2), 10);
  const min = parseFloat(raw.slice(2));
  if (!Number.isFinite(deg) || !Number.isFinite(min)) return null;
  let v = deg + min / 60;
  if (hemi === 'S') v = -v;
  return v;
}

function parseLon(raw, hemi) {
  if (!raw || !hemi) return null;
  // DDDMM.MMMM
  const deg = parseInt(raw.slice(0, 3), 10);
  const min = parseFloat(raw.slice(3));
  if (!Number.isFinite(deg) || !Number.isFinite(min)) return null;
  let v = deg + min / 60;
  if (hemi === 'W') v = -v;
  return v;
}

// time = HHMMSS(.sss), date = DDMMYY → Unix seconds UTC.
function parseRmcTimestamp(time, date) {
  if (!time || !date || time.length < 6 || date.length < 6) return Date.now() / 1000;
  const hh = parseInt(time.slice(0, 2), 10);
  const mm = parseInt(time.slice(2, 4), 10);
  const ss = parseFloat(time.slice(4));
  const dd = parseInt(date.slice(0, 2), 10);
  const mo = parseInt(date.slice(2, 4), 10);
  const yy = parseInt(date.slice(4, 6), 10);
  // RMC year is two-digit. NMEA spec doesn't define a window — assume
  // 70-99 → 1970-1999, 00-69 → 2000-2069.
  const year = yy >= 70 ? 1900 + yy : 2000 + yy;
  return Date.UTC(year, mo - 1, dd, hh, mm, ss) / 1000;
}

function mergeBuffer(deviceId, parsed) {
  let buf = buffers.get(deviceId);
  if (!buf) {
    buf = { gga: null, rmc: null, lastEmittedKey: null };
    buffers.set(deviceId, buf);
  }
  if (parsed.kind === 'gga') buf.gga = { ...parsed, receivedAt: Date.now() };
  if (parsed.kind === 'rmc') buf.rmc = { ...parsed, receivedAt: Date.now() };

  const { gga, rmc } = buf;

  // Emit only when we have both halves — and only when a meaningful field
  // changed (avoids re-emitting the same fix when one side updates without
  // moving). The other half can be up to MAX_STALENESS_MS old.
  if (!gga || !rmc) return null;
  const otherAge = Date.now() - (parsed.kind === 'gga' ? rmc.receivedAt : gga.receivedAt);
  if (otherAge > MAX_STALENESS_MS) return null;

  const key = `${rmc.timestamp}-${gga.altitude}-${parsed.lat}-${parsed.lon}`;
  if (key === buf.lastEmittedKey) return null;
  buf.lastEmittedKey = key;
  return {
    id: deviceId,
    lat: parsed.lat,
    lon: parsed.lon,
    altitude: gga.altitude,
    heading: rmc.heading,
    speed: rmc.speed,
    timestamp: rmc.timestamp,
    source: NAME,
    label: deviceId,
    meta: { fix: gga.fix, nsats: gga.nsats },
  };
}

// AIS adapter — AIVDM/AIVDO sentences.
//
// Reference spec: https://gpsd.gitlab.io/gpsd/AIVDM.html
// Bit offsets below follow the gpsd spec exactly. (The Sprint plan's
// offsets are off by ~12 bits compared to the real spec — we trust the
// spec.)
//
// Pipeline per sentence:
//   1. Validate the !AIVDM/!AIVDO outer NMEA envelope (XOR checksum).
//   2. If multi-fragment, buffer keyed on (channel, sequenceId) until the
//      final fragment arrives or 30s passes.
//   3. De-armor the 6-bit payload: c -= 48; if (c > 40) c -= 8.
//   4. Read the message type from bits 0..5 and dispatch:
//        Type 1, 2, 3 → Position Report A
//        Type 18      → Class B Position Report
//        anything else → ignored (may extend later)
//
// Sentinel values for Type 1/2/3:
//   lon = 0x6791AC0 (181°) → unavailable
//   lat = 0x3412140 ( 91°) → unavailable
//   SOG = 1023, COG = 3600, heading = 511 → unavailable

const NAME = 'ais';
const FRAGMENT_TTL_MS = 30_000;

const fragments = new Map(); // `${channel}-${seqId}` -> { count, parts: Map(num→payload), expires }

export const aisAdapter = {
  name: NAME,

  canParse(raw) {
    if (typeof raw !== 'string') return false;
    return /^!AIV[DM][MO],/m.test(raw.trim());
  },

  normalize(raw) {
    pruneStaleFragments();
    const out = [];
    for (const rawLine of raw.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) continue;
      if (!validateChecksum(line)) continue;
      const env = parseEnvelope(line);
      if (!env) continue;
      const assembled = assembleFragments(env);
      if (!assembled) continue;
      const decoded = decode(assembled.payload, assembled.fillBits);
      if (decoded) out.push(decoded);
    }
    return out;
  },

  // Test hook — clears any buffered fragments.
  reset() {
    fragments.clear();
  },
};

// --- envelope ---

function validateChecksum(line) {
  const star = line.lastIndexOf('*');
  if (star === -1) return false;
  const body = line.slice(1, star);
  const expected = line.slice(star + 1).trim().toUpperCase();
  if (!/^[0-9A-F]{2}$/.test(expected)) return false;
  let cs = 0;
  for (let i = 0; i < body.length; i++) cs ^= body.charCodeAt(i);
  return cs.toString(16).toUpperCase().padStart(2, '0') === expected;
}

const ENVELOPE_RE = /^!AIV[DM][MO],(\d+),(\d+),(\d*),([AB12]),([^,]*),(\d)\*[0-9A-Fa-f]{2}$/;

function parseEnvelope(line) {
  const m = line.match(ENVELOPE_RE);
  if (!m) return null;
  const [, count, num, seq, channel, payload, fill] = m;
  return {
    count: parseInt(count, 10),
    num: parseInt(num, 10),
    seq: seq === '' ? null : parseInt(seq, 10),
    channel,
    payload,
    fillBits: parseInt(fill, 10),
  };
}

// --- multi-fragment assembly ---

function assembleFragments(env) {
  if (env.count === 1) {
    return { payload: env.payload, fillBits: env.fillBits };
  }
  const key = `${env.channel}-${env.seq}`;
  let entry = fragments.get(key);
  if (!entry) {
    entry = { count: env.count, parts: new Map(), expires: Date.now() + FRAGMENT_TTL_MS };
    fragments.set(key, entry);
  }
  entry.parts.set(env.num, { payload: env.payload, fillBits: env.fillBits });
  if (entry.parts.size < entry.count) return null;
  // Concatenate in order. Only the *final* fragment's fillBits matter.
  let payload = '';
  let fillBits = 0;
  for (let i = 1; i <= entry.count; i++) {
    const part = entry.parts.get(i);
    if (!part) return null;
    payload += part.payload;
    if (i === entry.count) fillBits = part.fillBits;
  }
  fragments.delete(key);
  return { payload, fillBits };
}

function pruneStaleFragments() {
  const now = Date.now();
  for (const [key, entry] of fragments) {
    if (entry.expires < now) fragments.delete(key);
  }
}

// --- 6-bit de-armor + bit extraction ---

function deArmor(payload, fillBits) {
  const totalBits = payload.length * 6 - fillBits;
  const bits = new Uint8Array(totalBits);
  let bitIdx = 0;
  for (let i = 0; i < payload.length; i++) {
    let c = payload.charCodeAt(i) - 48;
    if (c > 40) c -= 8;
    if (c < 0 || c > 63) return null; // malformed
    for (let j = 5; j >= 0; j--) {
      if (bitIdx >= totalBits) break;
      bits[bitIdx++] = (c >> j) & 1;
    }
  }
  return bits;
}

function getU(bits, offset, length) {
  let v = 0;
  for (let i = 0; i < length; i++) v = v * 2 + bits[offset + i];
  return v;
}

function getI(bits, offset, length) {
  let v = getU(bits, offset, length);
  if (bits[offset] === 1) v -= 2 ** length;
  return v;
}

// --- decode by message type ---

function decode(payload, fillBits) {
  const bits = deArmor(payload, fillBits);
  if (!bits || bits.length < 38) return null;
  const type = getU(bits, 0, 6);
  if (type === 1 || type === 2 || type === 3) return decodePosA(bits, type);
  if (type === 18) return decodePosB(bits);
  return null; // not a position-bearing type we handle
}

// Type 1/2/3 — Position Report Class A. 168 bits.
function decodePosA(bits, type) {
  if (bits.length < 144) return null;
  const mmsi = getU(bits, 8, 30);
  const sog = getU(bits, 50, 10);
  const lonRaw = getI(bits, 61, 28);
  const latRaw = getI(bits, 89, 27);
  const cog = getU(bits, 116, 12);
  const heading = getU(bits, 128, 9);

  if (lonRaw === 0x6791ac0 || latRaw === 0x3412140) return null;
  const lat = latRaw / 600000;
  const lon = lonRaw / 600000;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

  return {
    id: String(mmsi),
    lat,
    lon,
    altitude: null, // AIS does not carry altitude
    heading: heading === 511 ? null : heading,
    speed: sog === 1023 ? null : sog / 10,
    timestamp: Date.now() / 1000,
    source: NAME,
    label: String(mmsi),
    meta: {
      mmsi,
      type,
      cog: cog === 3600 ? null : cog / 10,
    },
  };
}

// Type 18 — Class B Position Report. 168 bits.
// gpsd offsets: SOG 46-55, lon 57-84 (28s), lat 85-111 (27s), COG 112-123 (12u),
// heading 124-132 (9u).
function decodePosB(bits) {
  if (bits.length < 144) return null;
  const mmsi = getU(bits, 8, 30);
  const sog = getU(bits, 46, 10);
  const lonRaw = getI(bits, 57, 28);
  const latRaw = getI(bits, 85, 27);
  const cog = getU(bits, 112, 12);
  const heading = getU(bits, 124, 9);

  if (lonRaw === 0x6791ac0 || latRaw === 0x3412140) return null;
  const lat = latRaw / 600000;
  const lon = lonRaw / 600000;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

  return {
    id: String(mmsi),
    lat,
    lon,
    altitude: null,
    heading: heading === 511 ? null : heading,
    speed: sog === 1023 ? null : sog / 10,
    timestamp: Date.now() / 1000,
    source: NAME,
    label: String(mmsi),
    meta: {
      mmsi,
      type: 18,
      cog: cog === 3600 ? null : cog / 10,
      classB: true,
    },
  };
}

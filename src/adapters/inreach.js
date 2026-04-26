// Garmin inReach adapter — IPC Outbound Event JSON.
//
// Reference: Garmin "IPC Outbound" PDF (developer.garmin.com — accept terms
// to download). This is the Iridium-backed Inbound-to-Inbound-Cloud event
// stream used for fleet tracking integrations.
//
// Envelope:
//   { Version: "2.0",
//     Events: [
//       { imei: "300000000000000",
//         messageCode: 0,
//         freeText: "...",
//         timeStamp: 1714158000000,
//         point: { latitude: 40.5, longitude: -111.9,
//                  altitude: 1450, speed: 35, course: 270 } }
//     ] }
//
// Units: altitude in metres, speed in km/h. Convert to feet and knots
// for the schema.
//
// messageCode dispatch (table from IPC Outbound PDF):
//   0  Position (locate)
//   1  Tracking start
//   3  Tracking turned off
//  10  Free-text message
//  14  Mail check
//  64+ SOS / Cancel SOS
// We only emit positions for messageCode 0 and 1.
//
// NOTE: An enterprise inReach IPC subscription is required to receive these
// events. There is no free public test endpoint.

const NAME = 'inreach';
const M_TO_FT = 3.28084;
const KMH_TO_KTS = 0.539957;
const TRACKING_CODES = new Set([0, 1]);

export const inreachAdapter = {
  name: NAME,

  canParse(raw) {
    if (!raw || typeof raw !== 'object') return false;
    if (typeof raw.Version !== 'string') return false;
    if (!Array.isArray(raw.Events)) return false;
    if (raw.Events.length === 0) return false;
    const sample = raw.Events[0];
    return sample && typeof sample === 'object' && typeof sample.imei === 'string';
  },

  normalize(raw) {
    const out = [];
    for (const e of raw.Events) {
      if (!TRACKING_CODES.has(e.messageCode)) continue;
      const p = e.point;
      if (!p || typeof p.latitude !== 'number' || typeof p.longitude !== 'number') continue;
      const altMeters = typeof p.altitude === 'number' ? p.altitude : null;
      const speedKmh = typeof p.speed === 'number' ? p.speed : null;
      out.push({
        id: e.imei,
        lat: p.latitude,
        lon: p.longitude,
        altitude: altMeters !== null ? altMeters * M_TO_FT : null,
        heading: typeof p.course === 'number' ? p.course : null,
        speed: speedKmh !== null ? speedKmh * KMH_TO_KTS : null,
        timestamp: parseTs(e.timeStamp),
        source: NAME,
        label: e.imei,
        meta: {
          messageCode: e.messageCode,
          freeText: e.freeText,
          addresses: e.addresses,
        },
      });
    }
    return out;
  },
};

function parseTs(ts) {
  if (typeof ts === 'number') {
    // Garmin sends milliseconds; downscale to seconds.
    return ts > 1e12 ? ts / 1000 : ts;
  }
  if (typeof ts === 'string') {
    const ms = Date.parse(ts);
    if (!Number.isNaN(ms)) return ms / 1000;
  }
  return Date.now() / 1000;
}

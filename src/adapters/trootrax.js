// TrooTrax / SkyRouter adapter.
//
// TrooTrax (now under the SkyRouter umbrella) does not publish a public REST
// schema; this adapter targets the JSON envelope reported by their tracking
// export feed:
//
// {
//   "feed": "trootrax",
//   "assets": [
//     {
//       "tailNumber": "N251HC",
//       "latitude": 40.61, "longitude": -111.55,
//       "altitudeFeet": 4750, "headingDeg": 305,
//       "groundSpeedKts": 95,
//       "lastReportUtc": "2026-04-26T17:12:30Z"
//     }
//   ]
// }
//
// Replace fingerprints + field names if your TrooTrax export differs.

const NAME = 'trootrax';

export const trootraxAdapter = {
  name: NAME,

  canParse(raw) {
    if (!raw || typeof raw !== 'object') return false;
    if (raw.feed === 'trootrax') return true;
    if (!Array.isArray(raw.assets) || raw.assets.length === 0) return false;
    const sample = raw.assets[0];
    return (
      typeof sample.tailNumber === 'string' &&
      typeof sample.latitude === 'number' &&
      typeof sample.longitude === 'number'
    );
  },

  normalize(raw) {
    const out = [];
    for (const a of raw.assets) {
      if (typeof a.latitude !== 'number' || typeof a.longitude !== 'number') continue;
      const ts = parseTimestamp(a.lastReportUtc);
      out.push({
        id: a.tailNumber,
        lat: a.latitude,
        lon: a.longitude,
        altitude: typeof a.altitudeFeet === 'number' ? a.altitudeFeet : null,
        heading: typeof a.headingDeg === 'number' ? a.headingDeg : null,
        speed: typeof a.groundSpeedKts === 'number' ? a.groundSpeedKts : null,
        timestamp: ts,
        source: NAME,
        label: a.tailNumber,
        meta: {
          operator: a.operator,
          aircraftType: a.aircraftType,
          rawReport: a.lastReportUtc,
        },
      });
    }
    return out;
  },
};

function parseTimestamp(iso) {
  if (!iso) return Date.now() / 1000;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return Date.now() / 1000;
  return ms / 1000;
}

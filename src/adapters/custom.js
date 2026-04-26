// Custom adapter — minimal flat schema for hand-authored or one-off feeds.
//
// Accepts either a single object or an array. Marker fingerprint is the
// presence of source === "custom". This avoids false-positive matches against
// other JSON shapes — users opt in by setting that field.
//
// {
//   "source": "custom",
//   "points": [
//     { "id": "ASSET-1", "lat": 40.5, "lon": -111.9, "alt": 4500,
//       "hdg": 90, "spd": 30, "ts": 1714000000, "name": "Truck 1" }
//   ]
// }
//
// or a single inline point:
// { "source": "custom", "id": "X", "lat": 0, "lon": 0, "ts": 0 }

const NAME = 'custom';

export const customAdapter = {
  name: NAME,

  canParse(raw) {
    if (!raw || typeof raw !== 'object') return false;
    return raw.source === 'custom';
  },

  normalize(raw) {
    const points = Array.isArray(raw.points) ? raw.points : [raw];
    const out = [];
    for (const p of points) {
      if (typeof p.lat !== 'number' || typeof p.lon !== 'number') continue;
      const id = p.id || p.name || `custom-${out.length}`;
      out.push({
        id,
        lat: p.lat,
        lon: p.lon,
        altitude: typeof p.alt === 'number' ? p.alt : null,
        heading: typeof p.hdg === 'number' ? p.hdg : null,
        speed: typeof p.spd === 'number' ? p.spd : null,
        timestamp: typeof p.ts === 'number' ? p.ts : Date.now() / 1000,
        source: NAME,
        label: p.name || id,
        meta: p.meta || {},
      });
    }
    return out;
  },
};

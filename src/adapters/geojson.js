// GeoJSON adapter — FeatureCollection of Point features.
//
// Reference: https://datatracker.ietf.org/doc/html/rfc7946
//
// Coordinate order is [lon, lat, elevation?]. Optional third element is
// elevation in metres per the spec.
//
// Properties bag — recognized keys (any may be missing):
//   id, label, name, source, altitudeFeet, elevation, heading, course,
//   speed, speedKts, speedKnots, timestamp, time
//
// `altitudeFeet` is preferred over the coordinate's elevation_m so that
// our own GeoJSON exporter round-trips losslessly.

const NAME = 'geojson';
const M_TO_FT = 3.28084;

export const geojsonAdapter = {
  name: NAME,

  canParse(raw) {
    if (!raw || typeof raw !== 'object') return false;
    if (raw.type !== 'FeatureCollection') return false;
    if (!Array.isArray(raw.features)) return false;
    return raw.features.some(
      (f) => f && f.geometry && f.geometry.type === 'Point' && Array.isArray(f.geometry.coordinates),
    );
  },

  normalize(raw) {
    const out = [];
    let idx = 0;
    for (const f of raw.features) {
      if (!f || !f.geometry || f.geometry.type !== 'Point') continue;
      const c = f.geometry.coordinates;
      if (!Array.isArray(c) || c.length < 2) continue;
      const lon = num(c[0]);
      const lat = num(c[1]);
      if (lat === null || lon === null) continue;
      const props = f.properties || {};

      // Altitude: prefer explicit feet, fall back to coordinate elevation in metres.
      let altitude = null;
      if (typeof props.altitudeFeet === 'number') altitude = props.altitudeFeet;
      else if (typeof props.elevation === 'number') altitude = props.elevation * M_TO_FT;
      else if (c.length >= 3 && typeof c[2] === 'number') altitude = c[2] * M_TO_FT;

      const id = String(props.id ?? f.id ?? props.name ?? props.label ?? `geojson-${idx}`);
      const label = String(props.label ?? props.name ?? id);
      const heading = num(props.heading ?? props.course);
      const speed = num(props.speedKts ?? props.speedKnots ?? props.speed);

      out.push({
        id,
        lat,
        lon,
        altitude,
        heading,
        speed,
        timestamp: parseTs(props.timestamp ?? props.time),
        source: typeof props.source === 'string' ? props.source : NAME,
        label,
        meta: {
          properties: props,
          featureId: f.id,
        },
      });
      idx++;
    }
    return out;
  },
};

function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function parseTs(v) {
  if (typeof v === 'number') return v > 1e12 ? v / 1000 : v;
  if (typeof v === 'string') {
    const ms = Date.parse(v);
    if (!Number.isNaN(ms)) return ms / 1000;
  }
  return Date.now() / 1000;
}

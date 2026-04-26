// MQTT adapter — configurable factory.
//
// MQTT itself has no schema; every fleet/IoT device picks its own JSON shape.
// Rather than guessing, the user instantiates this adapter with explicit
// field mappings:
//
//   const mqtt = makeMqttAdapter({
//     idField:        'device_id',
//     latField:       'gps_lat',
//     lonField:       'gps_lon',
//     altitudeField:  'altitude',     // optional
//     headingField:   'course',       // optional
//     speedField:     'speed',        // optional
//     timestampField: 'ts',           // optional
//     altitudeUnit:   'feet',         // 'feet' | 'meters'
//     speedUnit:      'knots',        // 'knots' | 'mph' | 'kmh'
//     timestampUnit:  'seconds',      // 'seconds' | 'milliseconds' | 'iso'
//     name:           'mqtt-fleet',   // optional source name override
//     labelField:     'name',         // optional, defaults to id
//   });
//   registry.reg(mqtt);
//
// Dot-notation paths are supported for nested fields:
//   latField: 'location.coordinates.lat'  →  obj.location.coordinates.lat
//
// canParse() always returns false — MQTT adapters must always be registered
// explicitly to avoid stealing payloads from other adapters.

const M_TO_FT = 3.28084;
const MPH_TO_KTS = 0.868976;
const KMH_TO_KTS = 0.539957;

export function makeMqttAdapter(opts) {
  if (!opts || !opts.idField || !opts.latField || !opts.lonField) {
    throw new Error('makeMqttAdapter requires at least { idField, latField, lonField }');
  }
  const cfg = {
    name: 'mqtt',
    altitudeUnit: 'feet',
    speedUnit: 'knots',
    timestampUnit: 'seconds',
    ...opts,
  };

  return {
    name: cfg.name,

    // Always false — MQTT cannot be auto-detected. Register explicitly.
    canParse() {
      return false;
    },

    normalize(raw) {
      if (!raw) return [];
      const records = Array.isArray(raw) ? raw : [raw];
      const out = [];
      for (const r of records) {
        const id = getPath(r, cfg.idField);
        const lat = num(getPath(r, cfg.latField));
        const lon = num(getPath(r, cfg.lonField));
        if (id == null || lat === null || lon === null) continue;
        const altitude = readAltitude(r, cfg);
        const speed = readSpeed(r, cfg);
        const heading = num(getPath(r, cfg.headingField));
        out.push({
          id: String(id),
          lat,
          lon,
          altitude,
          heading,
          speed,
          timestamp: readTimestamp(r, cfg),
          source: cfg.name,
          label: String(getPath(r, cfg.labelField) ?? id),
          meta: { raw: r },
        });
      }
      return out;
    },
  };
}

function getPath(obj, path) {
  if (!path || obj == null) return undefined;
  let v = obj;
  for (const seg of path.split('.')) {
    if (v == null) return undefined;
    v = v[seg];
  }
  return v;
}

function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function readAltitude(r, cfg) {
  const v = num(getPath(r, cfg.altitudeField));
  if (v === null) return null;
  if (cfg.altitudeUnit === 'meters') return v * M_TO_FT;
  return v; // already feet
}

function readSpeed(r, cfg) {
  const v = num(getPath(r, cfg.speedField));
  if (v === null) return null;
  if (cfg.speedUnit === 'mph') return v * MPH_TO_KTS;
  if (cfg.speedUnit === 'kmh') return v * KMH_TO_KTS;
  return v; // already knots
}

function readTimestamp(r, cfg) {
  const v = getPath(r, cfg.timestampField);
  if (v === undefined || v === null || v === '') return Date.now() / 1000;
  if (cfg.timestampUnit === 'milliseconds') {
    const n = num(v);
    return n === null ? Date.now() / 1000 : n / 1000;
  }
  if (cfg.timestampUnit === 'iso') {
    const ms = Date.parse(v);
    return Number.isNaN(ms) ? Date.now() / 1000 : ms / 1000;
  }
  // seconds
  const n = num(v);
  return n === null ? Date.now() / 1000 : n;
}

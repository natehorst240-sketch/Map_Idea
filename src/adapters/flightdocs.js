// Flightdocs / Veryon adapter.
//
// Flightdocs (rebranded Veryon Tracking) emits flight movement records with
// nested aircraft + position objects. This adapter targets the public-shape
// of their tracking export:
//
// {
//   "flights": [
//     {
//       "aircraft": { "tailNumber": "N731HC", "type": "BELL412" },
//       "position": {
//         "lat": 40.71, "lon": -111.93,
//         "altitudeMsl": 5200, "trueHeading": 187, "speedKts": 110,
//         "timestamp": "2026-04-26T17:13:01Z"
//       }
//     }
//   ]
// }

const NAME = 'flightdocs';

export const flightdocsAdapter = {
  name: NAME,

  canParse(raw) {
    if (!raw || typeof raw !== 'object') return false;
    if (!Array.isArray(raw.flights) || raw.flights.length === 0) return false;
    const sample = raw.flights[0];
    return (
      sample &&
      typeof sample === 'object' &&
      sample.aircraft &&
      typeof sample.aircraft.tailNumber === 'string' &&
      sample.position &&
      typeof sample.position.lat === 'number'
    );
  },

  normalize(raw) {
    const out = [];
    for (const f of raw.flights) {
      const ac = f.aircraft || {};
      const p = f.position || {};
      if (typeof p.lat !== 'number' || typeof p.lon !== 'number') continue;
      out.push({
        id: ac.tailNumber,
        lat: p.lat,
        lon: p.lon,
        altitude: typeof p.altitudeMsl === 'number' ? p.altitudeMsl : null,
        heading: typeof p.trueHeading === 'number' ? p.trueHeading : null,
        speed: typeof p.speedKts === 'number' ? p.speedKts : null,
        timestamp: parseTimestamp(p.timestamp),
        source: NAME,
        label: ac.tailNumber,
        meta: {
          aircraftType: ac.type,
          flightId: f.flightId,
          phase: f.phase,
        },
      });
    }
    return out;
  },
};

function parseTimestamp(iso) {
  if (!iso) return Date.now() / 1000;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? Date.now() / 1000 : ms / 1000;
}

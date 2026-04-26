// ADS-B adapter — dump1090-fa aircraft.json format.
//
// Reference: https://github.com/flightaware/dump1090/blob/master/README-json.md
// Sample shape:
// {
//   "now": 1714000000.0,
//   "messages": 1234567,
//   "aircraft": [
//     {
//       "hex": "a1b2c3", "flight": "DAL123  ",
//       "lat": 40.5, "lon": -111.9, "alt_baro": 35000, "alt_geom": 35100,
//       "gs": 420, "track": 270, "seen_pos": 0.3, "seen": 0.1
//     }
//   ]
// }

const NAME = 'adsb';

export const adsbAdapter = {
  name: NAME,

  canParse(raw) {
    if (!raw || typeof raw !== 'object') return false;
    if (!Array.isArray(raw.aircraft)) return false;
    // dump1090 always emits "now" and "messages" alongside aircraft.
    return typeof raw.now === 'number' && typeof raw.messages === 'number';
  },

  normalize(raw) {
    const baseTs = typeof raw.now === 'number' ? raw.now : Date.now() / 1000;
    const out = [];
    for (const ac of raw.aircraft) {
      // Aircraft without a position fix appear in the array — skip them.
      if (typeof ac.lat !== 'number' || typeof ac.lon !== 'number') continue;
      const seenPos = typeof ac.seen_pos === 'number' ? ac.seen_pos : 0;
      const altitude = pickAltitude(ac);
      const flight = typeof ac.flight === 'string' ? ac.flight.trim() : '';
      const id = ac.hex || flight || `adsb-${out.length}`;
      out.push({
        id,
        lat: ac.lat,
        lon: ac.lon,
        altitude, // already feet MSL
        heading: typeof ac.track === 'number' ? ac.track : null,
        speed: typeof ac.gs === 'number' ? ac.gs : null,
        timestamp: baseTs - seenPos,
        source: NAME,
        label: flight || ac.hex || id,
        meta: {
          hex: ac.hex,
          squawk: ac.squawk,
          category: ac.category,
          alt_baro: ac.alt_baro,
          alt_geom: ac.alt_geom,
        },
      });
    }
    return out;
  },
};

function pickAltitude(ac) {
  // alt_baro can be the literal string "ground" — treat as null.
  if (ac.alt_baro === 'ground') return 0;
  if (typeof ac.alt_geom === 'number') return ac.alt_geom;
  if (typeof ac.alt_baro === 'number') return ac.alt_baro;
  return null;
}

// Samsara adapter — Fleet vehicle locations.
//
// Snapshot: GET /fleet/vehicles/locations
//   { data: [
//       { id, name, vin, make, model, tags: [...],
//         location: { latitude, longitude, headingDegrees,
//                     speedMilesPerHour, time } }
//     ],
//     pagination: { endCursor, hasNextPage } }
//
// Live feed: GET /fleet/vehicles/locations/feed?after=<endCursor>
//   { data: [
//       { id, name,
//         locations: [ { latitude, longitude, headingDegrees,
//                        speedMilesPerHour, time }, ... ] }
//     ],
//     pagination: { endCursor, hasNextPage } }
//
// Samsara doesn't include altitude. MPH → knots via × 0.868976.

const NAME = 'samsara';
const MPH_TO_KTS = 0.868976;

export const samsaraAdapter = {
  name: NAME,

  canParse(raw) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.data)) return false;
    if (raw.data.length === 0) return false;
    const sample = raw.data[0];
    if (!sample || typeof sample !== 'object') return false;
    // Snapshot has `location` (singular). Feed has `locations` (array).
    return (
      (sample.location && typeof sample.location === 'object') ||
      Array.isArray(sample.locations)
    );
  },

  normalize(raw) {
    const out = [];
    for (const v of raw.data) {
      const id = v.name || v.id;
      const meta = {
        samsaraId: v.id,
        vin: v.vin,
        make: v.make,
        model: v.model,
        tags: Array.isArray(v.tags) ? v.tags : undefined,
      };
      const locations = v.location ? [v.location] : Array.isArray(v.locations) ? v.locations : [];
      for (const loc of locations) {
        if (typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') continue;
        const speedMph = typeof loc.speedMilesPerHour === 'number' ? loc.speedMilesPerHour : null;
        out.push({
          id,
          lat: loc.latitude,
          lon: loc.longitude,
          altitude: null,
          heading: typeof loc.headingDegrees === 'number' ? loc.headingDegrees : null,
          speed: speedMph !== null ? speedMph * MPH_TO_KTS : null,
          timestamp: parseTs(loc.time),
          source: NAME,
          label: id,
          meta,
        });
      }
    }
    return out;
  },
};

function parseTs(iso) {
  if (!iso) return Date.now() / 1000;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? Date.now() / 1000 : ms / 1000;
}

// Live feed driver — handles cursor-based pagination. fetchFeed receives the
// current `after` cursor (or null for the first call) and returns the parsed
// JSON response. onPositions fires for each batch with normalized positions.
export function startSamsaraFeed(fetchFeed, onPositions, { intervalMs = 5000 } = {}) {
  let cursor = null;
  let stopped = false;

  async function tick() {
    if (stopped) return;
    try {
      const frame = await fetchFeed(cursor);
      if (frame && samsaraAdapter.canParse(frame)) {
        const positions = samsaraAdapter.normalize(frame);
        if (positions.length) onPositions(positions);
      }
      if (frame && frame.pagination && frame.pagination.endCursor) {
        cursor = frame.pagination.endCursor;
      }
    } catch (err) {
      console.warn(`[samsara] feed error: ${err.message}`);
    }
    if (!stopped) setTimeout(tick, intervalMs);
  }

  // Defer the first tick so callers receive the handle before fetchFeed runs.
  setTimeout(tick, 0);
  return {
    stop() {
      stopped = true;
    },
    cursor() {
      return cursor;
    },
  };
}

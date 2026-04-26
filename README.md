# Asset Tracker

Plug-and-play asset tracking adapter library + 3D CesiumJS globe.
Adapters normalize position data from any source; the map only ever
sees one schema.

## Quick start

```bash
git clone <this repo>
cd Map_Idea
npm install
```

Get a free Cesium ion token at https://cesium.com/ion/tokens, then
edit `config.js`:

```js
export const config = {
  cesiumIonToken: 'paste-your-token-here',
  // ...
};
```

Restrict the token to your deployment domains in the ion dashboard so
viewing the page source can't leak it.

Serve `index.html` from the repo root:

```bash
npm run serve   # python3 -m http.server 8080
```

Open http://localhost:8080.

You should see the Wasatch Range with three TrooTrax helicopters
(N251HC / N512HC / N731HC) at ~4,750–5,320 ft MSL, plus an ADS-B jet
at FL350 and a ground recovery truck.

## Architecture

Two layers, completely decoupled:

```
raw data ──▶ PositionPluginRegistry ──▶ normalized positions ──▶ Cesium entities
              │                                                    │
              └─ adapter.canParse() + adapter.normalize()           └─ feet → metres only here
```

- `src/registry.js` — routes raw payloads to the first matching adapter.
- `src/adapters/*.js` — one file per source. Each implements `canParse()` and `normalize()`.
- `src/map/cesium-map.js` — Viewer init with World Terrain.
- `src/map/cesium-entities.js` — places markers at lat/lon/altitude.
- `src/map/cesium-camera.js` — pan-to / fly-to / follow.
- `src/ui/*.js` — sidebar + filter badges.

See [docs/adding-an-adapter.md](docs/adding-an-adapter.md) for how to
add a new source.

## Adapters in this sprint

| Source     | File                          | Notes                              |
|------------|-------------------------------|------------------------------------|
| ADS-B      | `src/adapters/adsb.js`        | dump1090-fa `aircraft.json`        |
| TrooTrax   | `src/adapters/trootrax.js`    | SkyRouter export envelope          |
| Custom     | `src/adapters/custom.js`      | Hand-authored / one-off feeds      |

Future sprints add NMEA, Traccar, APRS, Samsara, AIS, Garmin inReach,
MQTT, and GeoJSON. See `SPRINT_PLAN` in the project doc.

## Schema

All adapters output:

```ts
{
  id: string,          // unique
  lat: number,         // decimal degrees WGS84
  lon: number,
  altitude: number|null, // FEET MSL
  heading: number|null,  // 0–360°
  speed: number|null,    // knots
  timestamp: number,   // Unix epoch seconds UTC
  source: string,      // adapter name
  label: string,       // display name on globe
  meta: object         // source-specific, not normalized
}
```

Altitude in feet → metres (× 0.3048) happens *only* at the Cesium
render boundary. Inside the schema and adapters, altitude is feet.

## Tests

```bash
npm test
```

Fixtures live at `tests/fixtures/`. Each adapter has a matching test
under `tests/adapters/`.

## License

Apache 2.0.

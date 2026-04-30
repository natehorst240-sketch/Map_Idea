# Asset Tracker

Plug-and-play asset tracking adapter library + 3D MapLibre globe with
deck.gl markers. Adapters normalize position data from any source; the
map only ever sees one schema. **Zero tokens, zero vendor lock-in** —
all tile sources are URL-configurable and default to free public hosts.

```
raw data ──▶ PositionPluginRegistry ──▶ normalized positions ──▶ deck.gl layers
              │                                                    │
              └─ adapter.canParse() + adapter.normalize()           └─ feet → metres only here
```

## Quick start (browser demo)

```bash
git clone <this repo>
cd Map_Idea
npm install
npm run serve     # python3 -m http.server 8080
```

Open http://localhost:8080. No tokens, no signup. The defaults in
`config.js` point at:
- Mapzen Terrarium DEM tiles on AWS public S3 (terrain)
- OpenStreetMap raster tiles (basemap imagery)

When you self-host, edit `config.js`:

```js
export const config = {
  terrainTileUrl: 'http://nas.local/terrain/{z}/{x}/{y}.png',
  imageryTileUrl: 'http://nas.local/imagery/{z}/{x}/{y}.jpg',
  // ...
};
```

You should see the Wasatch Range with three TrooTrax helicopters at
9,500–12,500 ft MSL, ADS-B traffic at FL350, ground vehicles, an APRS
mobile, a Samsara fleet vehicle, an inReach field operative, an AIS
vessel, an MQTT IoT pod, and a GeoJSON waypoint.

## TypeScript

The package ships hand-written `.d.ts` declarations for every public
export — no `@types/asset-tracker` needed. It works in `strict` mode out
of the box.

```ts
import {
  buildRegistry,
  adsbAdapter,
  makeMqttAdapter,
  type NormalizedPosition,
  type Adapter,
} from 'asset-tracker';

const registry = buildRegistry({ adapters: [adsbAdapter] });
const positions: NormalizedPosition[] = registry.parse(rawDump1090Json);

const myMqtt: Adapter = makeMqttAdapter({
  idField: 'device_id',
  latField: 'gps.lat',
  lonField: 'gps.lon',
});
```

`@types/maplibre-gl` is *not* a dependency. Renderer values (the map
returned by `createMap`, the EntityStore's deck.gl handles) are typed
as `MapInstance` (`unknown`). If you have `@types/maplibre-gl`
installed, cast at the call site:

```ts
import type { Map as MapLibreMap } from 'maplibre-gl';
import { createMap } from 'asset-tracker/map/map';

const map = createMap('mapContainer') as unknown as MapLibreMap;
```

Sub-path imports work too: `asset-tracker/adapters/nmea`,
`asset-tracker/registry`, `asset-tracker/ui/export`, etc. Each has its
own `.d.ts` so you don't pay for what you don't use.

## Quick start (npm)

```bash
npm install asset-tracker     # ESM only, Node ≥ 18
```

```js
import {
  buildRegistry,
  adsbAdapter,
  trootraxAdapter,
  nmeaAdapter,
  traccarAdapter,
  aprsAdapter,
  samsaraAdapter,
  aisAdapter,
  inreachAdapter,
  geojsonAdapter,
  makeMqttAdapter,
  customAdapter,
} from 'asset-tracker';

const registry = buildRegistry({
  adapters: [adsbAdapter, trootraxAdapter, /* ... */ customAdapter],
});

const positions = registry.parse(rawDump1090Json);
// → normalized array of { id, lat, lon, altitude, heading, speed, timestamp, source, label, meta }
```

If you're using the bundled map layer, the consumer page must load
MapLibre GL JS and deck.gl as globals (`maplibregl` and `deck`). The
`src/map/*` modules are thin wrappers, not a renderer re-package:

```html
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.css" />
<script src="https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.js"></script>
<script src="https://unpkg.com/deck.gl@9/dist.min.js"></script>
```

## Adapters

| Source     | File                          | Notes                                       |
|------------|-------------------------------|---------------------------------------------|
| ADS-B      | `src/adapters/adsb.js`        | dump1090-fa `aircraft.json`                 |
| TrooTrax   | `src/adapters/trootrax.js`    | SkyRouter export envelope                   |
| NMEA 0183  | `src/adapters/nmea.js`        | $GPGGA + $GPRMC, GLONASS prefixes           |
| Traccar    | `src/adapters/traccar.js`     | REST `/api/positions` + WebSocket           |
| APRS       | `src/adapters/aprs.js`        | aprs.fi REST + raw APRS-IS uncompressed pos |
| Samsara    | `src/adapters/samsara.js`     | Fleet snapshot + cursor-based live feed     |
| AIS        | `src/adapters/ais.js`         | AIVDM/AIVDO Type 1/2/3 + Type 18 (Class B)  |
| inReach    | `src/adapters/inreach.js`     | Garmin IPC Outbound (enterprise)            |
| MQTT       | `src/adapters/mqtt.js`        | Configurable factory, dot-notation paths    |
| GeoJSON    | `src/adapters/geojson.js`     | FeatureCollection of Points                 |
| Custom     | `src/adapters/custom.js`      | Hand-authored / one-off feeds               |

> inReach IPC Outbound requires an enterprise Garmin Explore /
> inReach Pro subscription — no free public test endpoint.

### MQTT factory

MQTT has no schema; configure the adapter for *your* payload shape:

```js
import { makeMqttAdapter } from 'asset-tracker';

const mqttFleet = makeMqttAdapter({
  idField: 'device_id',
  latField: 'location.coords.lat',   // dot-notation
  lonField: 'location.coords.lng',
  altitudeField: 'location.coords.alt_m',
  speedField: 'telemetry.speed_kmh',
  timestampField: 'ts_ms',
  altitudeUnit: 'meters',            // 'feet' | 'meters'
  speedUnit:    'kmh',               // 'knots' | 'mph' | 'kmh'
  timestampUnit:'milliseconds',      // 'seconds' | 'milliseconds' | 'iso'
  name: 'mqtt-fleet',                // source name (default 'mqtt')
});
registry.reg(mqttFleet);
const positions = mqttFleet.normalize(payloadFromBroker);
```

`canParse` is **always false** for MQTT adapters — you must route
payloads explicitly. This avoids stealing JSON from other adapters.

### Live polling and feeds

```js
// Generic interval polling — any adapter that can canParse() the result.
const handle = registry.poll(
  () => fetch('/api/positions').then((r) => r.json()),
  5000,
  (positions) => store.updateMapPositions(positions),
);
handle.stop();
```

Specialized helpers:

- `connectTraccarWebSocket(url, onPositions)` — Traccar `/api/socket` with
  exponential backoff reconnect.
- `startSamsaraFeed(fetchFeed, onPositions)` — cursor-paginated Samsara
  feed, advances `endCursor` automatically.

## Normalized position schema

All adapters output:

```ts
{
  id: string,              // unique
  lat: number,             // decimal degrees WGS84
  lon: number,
  altitude: number | null, // FEET MSL
  heading: number | null,  // 0–360°
  speed:   number | null,  // knots
  timestamp: number,       // Unix epoch seconds UTC
  source: string,          // adapter name
  label:  string,          // display name
  meta:   object,          // source-specific extras
}
```

Altitude in feet → metres (× 0.3048) happens *only* at the renderer
boundary. Inside the schema and adapters, altitude is feet.

## 3D map features

- **MapLibre GL JS v5** globe projection with raster-DEM terrain
  (Terrarium-encoded by default). No tokens, no vendor.
- **deck.gl** layers for everything on top of the basemap: markers
  (`ScatterplotLayer`), labels (`TextLayer`), heading arrows
  (`LineLayer`), trail history (`PathLayer`).
- Per-source colour-coded markers with heading arrows.
- Trail history — ring buffer of the last 10 fixes per asset.
  Toggleable from the header.
- Stale-asset indicator: positions older than `staleThresholdSeconds`
  (default 5 min) shift toward grey with reduced opacity.
- Altitude callout: when zoomed in past z≈9.5, each marker label
  gains a second line with the altitude in feet.
- Terrain-follow mode: ground / map-data sources (`traccar`,
  `samsara`, `custom`, `mqtt`, `geojson`, `aprs`) clamp to z=0;
  aviation sources stay at MSL altitude. Toggle from the header.
- All markers render with depth-test disabled — assets behind a
  mountain still appear as a HUD-style overlay so they're never lost.
- Sun lighting toggle — daylight sky vs flat dark dashboard backdrop.
- Camera flyTo on row click; **Follow selected** locks the camera
  onto the selected asset and tracks it as it moves. Press Escape
  to release.
- Sidebar search filter — type to narrow the asset list.
- Sidebar export — download all current positions as GeoJSON or CSV.
- Header NMEA paste popover — parse and render raw $GPGGA + $GPRMC live.

### Tile sources

Defaults are free public hosts; swap any URL in `config.js` for a
self-hosted NAS:

| Layer | Default | Notes |
|-------|---------|-------|
| Terrain | `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png` | Mapzen Terrain RGB on AWS Public Datasets. Free, no auth, no rate limit. |
| Imagery | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | OSM raster. Fine for dev/demo; respect OSM tile policy in production. |

## M365 deployment

The map drops into Microsoft Teams as a Custom Tab and into SharePoint
via the Embed web part. Step-by-step (manifest, sideload, troubleshooting)
lives in [docs/m365-deployment.md](docs/m365-deployment.md).

A Teams app manifest template is in `m365/manifest.template.json`.

> The original ion-token hardening notes in the deployment guide are
> obsolete — there is no token to harden anymore. The remaining steps
> (manifest, validDomains, SharePoint allowlist) are still accurate.

## Adding a new adapter

See [docs/adding-an-adapter.md](docs/adding-an-adapter.md). The TL;DR:

1. Drop a file at `src/adapters/<name>.js` exporting an object with
   `name`, `canParse(raw)`, and `normalize(raw)`.
2. Add a fixture at `tests/fixtures/<name>.json` (or `.txt`) and a
   matching test in `tests/adapters/<name>.test.js`.
3. Add a colour to `config.sourceColors` and import + register in
   `index.html`.
4. Convert units at the adapter boundary — feet for altitude, knots for
   speed, Unix seconds for timestamp.

## Tests

```bash
npm test    # 80+ Jest tests, all fixture-backed
npm run lint
```

## License

Apache 2.0.

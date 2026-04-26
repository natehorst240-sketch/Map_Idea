# Asset Tracker

Plug-and-play asset tracking adapter library + 3D CesiumJS globe.
Adapters normalize position data from any source; the map only ever
sees one schema.

```
raw data ──▶ PositionPluginRegistry ──▶ normalized positions ──▶ Cesium entities
              │                                                    │
              └─ adapter.canParse() + adapter.normalize()           └─ feet → metres only here
```

## Quick start (browser demo)

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

In the ion dashboard, **restrict the token to your deployment hosts**
under *Allowed URLs* (see `docs/m365-deployment.md`). The token is
visible to anyone reading the deployed bundle — Allowed URLs is the
real security boundary.

Serve `index.html`:

```bash
npm run serve   # python3 -m http.server 8080
```

Open http://localhost:8080. You should see the Wasatch Range with three
TrooTrax helicopters at ~4,750–5,320 ft MSL, ADS-B traffic at altitude,
ground vehicles, an APRS mobile, a Samsara fleet vehicle, an inReach
field operative, an AIS vessel, an MQTT IoT pod, and a GeoJSON waypoint.

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

`@types/cesium` is *not* a dependency. Cesium-typed values (the viewer
returned by `createMap`, entities held by `EntityStore`) are typed as
`unknown`. If you have `@types/cesium` installed, cast at the call site:

```ts
import type { Viewer } from 'cesium';
import { createMap } from 'asset-tracker/map/cesium-map';

const viewer = createMap('cesiumContainer') as unknown as Viewer;
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

If you're using the bundled CesiumJS map layer, the consumer page must
load Cesium globally (the `Cesium` global). The `src/map/*` modules are
thin wrappers, not a Cesium re-package.

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

Altitude in feet → metres (× 0.3048) happens *only* at the Cesium
render boundary. Inside the schema and adapters, altitude is feet.

## 3D map features

- World Terrain + Bing imagery from Cesium ion (free tier).
- Per-source colour-coded markers with heading arrows.
- Trail history — ring buffer of the last 10 fixes per asset, drawn
  as a faded polyline; toggleable from the header.
- Stale-asset indicator: positions older than `staleThresholdSeconds`
  (default 5 min) shift toward grey with reduced opacity.
- Altitude callout: when zoomed in below ~500 km camera height, each
  marker label gains a second line with the altitude in feet.
- Terrain-follow mode: ground sources (`traccar`, `samsara`, `custom`)
  default to `CLAMP_TO_GROUND`; aviation sources stay at MSL.
  Toggle from the header.
- Sun lighting toggle — Cesium's day/night terminator with atmospheric
  scattering.
- Camera flyTo on row click; **Follow selected** locks the camera onto
  the selected entity. Press Escape to release.
- Optional 3D models for aviation sources — set `aviationModelUrl` in
  `config.js` to a `.glb` / `.gltf` URL and matching aircraft will
  render as a heading-oriented model.
- Sidebar search filter — type to narrow the asset list.
- Sidebar export — download all current positions as GeoJSON or CSV.
- Sidebar NMEA paste panel — parse and render raw $GPGGA + $GPRMC live.

## M365 deployment

The map drops into Microsoft Teams as a Custom Tab and into SharePoint
via the Embed web part. Step-by-step (manifest, sideload, ion token
hardening, troubleshooting) lives in
[docs/m365-deployment.md](docs/m365-deployment.md).

A Teams app manifest template is in `m365/manifest.template.json`.

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

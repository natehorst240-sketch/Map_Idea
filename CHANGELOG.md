# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.0] — Renderer swap: MapLibre + deck.gl

### Changed (breaking)

- **Removed CesiumJS dependency.** The 3D map layer is now MapLibre GL
  JS v5 (globe projection + raster-DEM terrain) with deck.gl on top
  for markers, labels, heading arrows, and trails. No tokens. No
  ion. No allowed-URLs to manage.
- `config.js` no longer reads `cesiumIonToken`. Replaced with
  `terrainTileUrl`, `imageryTileUrl`, `terrainEncoding`, and
  attribution strings. Defaults point at Mapzen Terrain RGB on AWS
  public S3 + OpenStreetMap raster — both free and unauth'd.
- Renamed map modules (the path "cesium-*" was misleading after the
  swap):
  - `src/map/cesium-map.js` → `src/map/map.js`
  - `src/map/cesium-entities.js` → `src/map/entities.js`
  - `src/map/cesium-camera.js` → `src/map/camera.js`
  - matching `.d.ts` files renamed in lockstep
  - `package.json` exports under `./map/*` resolve transparently;
    direct sub-path imports `asset-tracker/map/cesium-map` etc. need
    to be updated to the new names.
- TS types: introduced `MapInstance` (preferred). `CesiumViewer` and
  `CesiumEntity` kept as deprecated aliases for backwards compat.
- `index.html` loads MapLibre GL JS v5 + deck.gl v9 from CDN instead
  of CesiumJS. Container element renamed `#cesiumContainer` →
  `#mapContainer`.

### Added

- All markers render with `depthTest: false` so assets behind terrain
  still appear as a HUD-style overlay — no more "lost behind a
  mountain" failure mode.
- Tile URLs are first-class config so swapping to a self-hosted NAS
  is a one-line change with no code edits.
- MapLibre's built-in NavigationControl + ScaleControl are wired up
  by default.
- New attribution strings in config so OSM and Mapzen credits surface
  in the corner attribution control.

### Migration notes

Consumers using the npm package who imported from
`asset-tracker/map/cesium-map` (or `cesium-entities` / `cesium-camera`)
should update to the new sub-paths. The barrel import (`from
'asset-tracker'`) is unchanged: same names (`createMap`, `EntityStore`,
`CameraController`), same call signatures.

The PCF + Power BI shells discussed in earlier docs still apply — only
the renderer layer changed; the adapter library is identical.

## [0.1.0] — 2026-04-26

Initial release. Plug-and-play adapter library + 3D CesiumJS globe.

### Added

#### Adapters
- **ADS-B** (`adsb`) — dump1090-fa `aircraft.json` (Sprint 0).
- **TrooTrax / SkyRouter** (`trootrax`) — JSON export envelope (Sprint 0).
- **Custom** (`custom`) — opt-in `source: "custom"` shape for one-offs (Sprint 0).
- **NMEA 0183** (`nmea`) — `$GPGGA` + `$GPRMC` with XOR checksum and
  GP/GN/GL/BD/GB/GA talker prefix support, per-device merge buffer (Sprint 1).
- **Traccar** (`traccar`) — REST `/api/positions` + WebSocket `/api/socket`
  with exponential backoff reconnect (Sprint 1).
- **APRS** (`aprs`) — aprs.fi REST API + raw APRS-IS uncompressed position
  packets, including timestamped `/` and `@` DTIs and optional `/A=feet`
  altitude (Sprint 2).
- **Samsara** (`samsara`) — fleet snapshot + cursor-based feed; MPH → knots
  (Sprint 2).
- **AIS** (`ais`) — AIVDM/AIVDO Type 1/2/3 (Class A) and Type 18 (Class B)
  with full 6-bit de-armor and per-channel multi-fragment assembly (Sprint 3).
- **Garmin inReach** (`inreach`) — IPC Outbound Event JSON. Filters tracking
  message codes (0, 1) (Sprint 3).
- **MQTT** (`mqtt`, factory) — `makeMqttAdapter({...})` with dot-notation
  field paths and per-unit conversion options. `canParse` always false — must
  register explicitly (Sprint 4).
- **GeoJSON** (`geojson`) — FeatureCollection of Points, `[lon, lat, elev_m]`
  coordinate order. Round-trips with the built-in `toGeoJSON` exporter
  (Sprint 4).

#### Registry & live feeds
- `PositionPluginRegistry` with `reg`, `parse`, `color`, and live
  `poll(fetchFn, intervalMs, onPositions)`.
- `connectTraccarWebSocket()` and `startSamsaraFeed()` runtime helpers.

#### 3D map
- Cesium World Terrain + Bing imagery via the free ion tier.
- Per-source colour-coded markers with heading arrows.
- Trail history (10-fix ring buffer per asset, faded polyline segments).
- Stale-asset indicator (configurable threshold; grey tint + low alpha).
- Altitude callout label, surfacing at < 500 km camera height.
- Terrain-clamp toggle for ground sources (`HeightReference.CLAMP_TO_GROUND`).
- Sun lighting + atmosphere toggle.
- Camera fly-to + follow mode (Escape releases follow).
- Optional 3D model hook (`config.aviationModelUrl` / `groundModelUrl`).

#### UI
- Asset sidebar with search filter and GeoJSON / CSV export.
- Per-source filter badges.
- Live NMEA paste textarea for ad-hoc parsing.

#### M365 packaging
- Teams app manifest template (`m365/manifest.template.json`).
- M365 deployment guide (`docs/m365-deployment.md`) covering Teams sideload,
  SharePoint Embed, and Cesium ion token Allowed URLs hardening.

#### Tooling
- ESM-only npm package (Node ≥ 18). Public entry at `src/index.js`,
  with sub-path exports under `./adapters/*`, `./map/*`, `./ui/*`.
- Jest test suite (80+ tests, all fixture-backed).
- ESLint + Prettier.
- GitHub Actions CI (lint + test on push and PR).

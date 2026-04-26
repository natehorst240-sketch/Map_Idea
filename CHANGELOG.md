# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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

// Asset Tracker — runtime config.
//
// All renderer settings are MapLibre GL JS + deck.gl. No Cesium, no ion
// token. Defaults point at free public tile sources so the demo runs
// out of the box. Swap the URLs for a self-hosted NAS when ready.

export const config = {
  // Free, no-auth, production-tolerable defaults:
  //   terrain — Mapzen Terrain RGB on AWS public S3 (Terrarium encoding).
  //   imagery — OSM raster (fine for dev/demo; respect OSM tile policy
  //             for production).
  //
  // Swap either to your own tile server when self-hosting:
  //   terrainTileUrl: 'http://nas.local/terrain/{z}/{x}/{y}.png'
  //   imageryTileUrl: 'http://nas.local/imagery/{z}/{x}/{y}.jpg'
  terrainTileUrl: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
  terrainEncoding: 'terrarium',
  terrainExaggeration: 1.4,
  imageryTileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  imageryAttribution:
    '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  terrainAttribution:
    '<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md">Mapzen / Tilezen</a> · ' +
    'Mapbox-style RGB on AWS Public Datasets',

  // Asset is rendered with reduced opacity if its timestamp is older than this.
  staleThresholdSeconds: 300,

  // Marker color per source. Falls back to '#888' if not listed.
  sourceColors: {
    adsb: '#1f77b4',
    trootrax: '#d62728',
    custom: '#9467bd',
    nmea: '#ff7f0e',
    traccar: '#17becf',
    aprs: '#e377c2',
    samsara: '#8c564b',
    ais: '#7f7f7f',
    inreach: '#bcbd22',
    mqtt: '#393b79',
    geojson: '#637939',
  },

  // Initial camera framing (Wasatch Range — TrooTrax helicopters).
  initialView: {
    longitude: -111.6,
    latitude: 40.55,
    zoom: 8.5,
    pitch: 55,
    bearing: 0,
  },

  // Optional 3D models. If set, aviation sources render as a glTF model
  // oriented by heading; otherwise the default icon billboard is used.
  // Drop a .glb / .gltf into a public path and reference it here.
  // Set to null to disable.
  aviationModelUrl: null,
  groundModelUrl: null,
  aviationSources: ['adsb', 'trootrax', 'nmea'],

  // Sun lighting. Toggleable from the header.
  enableSunLighting: false,

  // Source → category mapping for the bottom asset grid (3 columns).
  // Override per-deployment if your usage differs (e.g. an MQTT fleet of
  // drones would map mqtt → 'air'). Sources not listed default to 'vehicle'.
  categories: {
    adsb: 'air',
    trootrax: 'air',
    nmea: 'person',
    traccar: 'vehicle',
    samsara: 'vehicle',
    aprs: 'person',
    ais: 'vehicle',
    inreach: 'person',
    mqtt: 'vehicle',
    geojson: 'vehicle',
    custom: 'vehicle',
  },
};

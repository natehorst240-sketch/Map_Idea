// Asset Tracker — runtime config.
//
// Replace CESIUM_ION_TOKEN with your free token from https://cesium.com/ion/tokens
// then restrict the token to your deployment domains in the ion dashboard.
//
// For local dev you can copy this file to config.local.js (gitignored) and
// import that instead — but the simplest path is to edit the placeholder below.

export const config = {
  // Free tier token. Without a token, Cesium falls back to a low-resolution
  // imagery layer and disables World Terrain.
  cesiumIonToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiYThkMDkzOC1kYjU4LTQ0ZmMtYmU0Ny1mZTY3YzllNjY4NTkiLCJpZCI6NDIzODcyLCJpYXQiOjE3NzcyMzI0Njh9.9joupijYceb10Cv37TbX7HioCcUV5eOgzh6cQUUIBXI',

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

  // Initial camera framing for the demo (Wasatch Range — TrooTrax helicopters).
  initialView: {
    longitude: -111.6,
    latitude: 40.55,
    height: 80000,
  },

  // Optional 3D models. If set, aviation sources render as a glTF model
  // oriented by heading; otherwise the default point billboard is used.
  // Drop a .glb (or .gltf) into a public path and reference it here.
  // E.g. `./assets/models/helicopter.glb`. Set to null to disable.
  aviationModelUrl: null,
  groundModelUrl: null,
  aviationSources: ['adsb', 'trootrax', 'nmea'],

  // Sun lighting + atmospheric scattering. Visible at globe scale.
  enableSunLighting: false,

  // Source → category mapping for the bottom asset grid (3 columns).
  // Override per-deployment if your usage differs (e.g. an MQTT fleet of
  // drones would map mqtt → 'air'). Sources not listed default to 'vehicle'.
  categories: {
    adsb: 'air',
    trootrax: 'air',
    nmea: 'person', // typically handheld GPS
    traccar: 'vehicle',
    samsara: 'vehicle',
    aprs: 'person', // mobile ham operator
    ais: 'vehicle', // vessels — vehicles in the maritime sense
    inreach: 'person',
    mqtt: 'vehicle',
    geojson: 'vehicle',
    custom: 'vehicle',
  },
};

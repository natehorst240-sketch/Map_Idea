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
  cesiumIonToken: 'YOUR_CESIUM_ION_TOKEN_HERE',

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
};

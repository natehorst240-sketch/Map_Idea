// cesium-map.js — initialize the Cesium Viewer.
//
// The viewer is the only thing that knows about Cesium. Everything else
// works through normalized positions and the entities/camera helpers.

import { config } from '../../config.js';

const FT_TO_M = 0.3048;

export function createMap(containerId) {
  if (config.cesiumIonToken && config.cesiumIonToken !== 'YOUR_CESIUM_ION_TOKEN_HERE') {
    Cesium.Ion.defaultAccessToken = config.cesiumIonToken;
  } else {
    console.warn(
      '[cesium-map] No Cesium ion token configured. World Terrain and Bing imagery will be unavailable. ' +
        'Get a free token at https://cesium.com/ion/tokens and update config.js.',
    );
  }

  const viewer = new Cesium.Viewer(containerId, {
    terrain: Cesium.Terrain.fromWorldTerrain(),
    timeline: false,
    animation: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    baseLayerPicker: true,
    navigationHelpButton: false,
    fullscreenButton: false,
    infoBox: true,
    selectionIndicator: true,
  });

  viewer.scene.globe.enableLighting = !!config.enableSunLighting;
  viewer.scene.skyAtmosphere.show = true;

  flyToInitial(viewer);
  return viewer;
}

// Toggle sun-position-based lighting at runtime. The sky atmosphere stays on.
export function setSunLighting(viewer, enabled) {
  viewer.scene.globe.enableLighting = !!enabled;
}

function flyToInitial(viewer) {
  const { longitude, latitude, height } = config.initialView;
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
    orientation: {
      heading: 0,
      pitch: Cesium.Math.toRadians(-45),
      roll: 0,
    },
    duration: 1.5,
  });
}

// Exposed for entity helpers — feet MSL → metres (Cesium native).
export function feetToMeters(ft) {
  return ft * FT_TO_M;
}

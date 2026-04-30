// map.js — initialize a MapLibre GL JS map with terrain.
//
// MapLibre is the only renderer-aware module. Everything else (entities,
// camera, UI) works through the abstract map instance returned here.
//
// MapLibre v5 globe projection gives a 3D sphere; raster-DEM terrain
// (Terrarium-encoded RGB tiles by default) gives the surface its shape.
// Markers, trails, and 3D models are drawn on top via deck.gl in
// entities.js.

import { config } from '../../config.js';

const FT_TO_M = 0.3048;

/**
 * Build the MapLibre map. Returns the live `maplibregl.Map` instance —
 * the rest of the package treats it as opaque.
 */
export function createMap(containerId) {
  if (typeof maplibregl === 'undefined') {
    throw new Error(
      '[map] MapLibre GL JS global (`maplibregl`) is not defined. ' +
        'Load it from a CDN before this module, e.g. ' +
        '<script src="https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.js"></script>',
    );
  }

  const style = buildStyle();
  const view = config.initialView;

  const map = new maplibregl.Map({
    container: containerId,
    style,
    center: [view.longitude, view.latitude],
    zoom: view.zoom ?? 8.5,
    pitch: view.pitch ?? 55,
    bearing: view.bearing ?? 0,
    projection: 'globe',
    attributionControl: { compact: true },
    canvasContextAttributes: { antialias: true },
  });

  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
  map.addControl(new maplibregl.ScaleControl({ unit: 'imperial' }), 'bottom-left');

  map.on('style.load', () => {
    if (config.terrainTileUrl) {
      map.setTerrain({
        source: 'terrain-dem',
        exaggeration: config.terrainExaggeration ?? 1.0,
      });
    }
    setSunLighting(map, !!config.enableSunLighting);
  });

  return map;
}

/**
 * Toggle MapLibre's sky/sun lighting. On = daylight tint; off = flat
 * dark backdrop suited to dashboard layouts.
 */
export function setSunLighting(map, enabled) {
  if (!map || typeof map.setSky !== 'function') return;
  if (enabled) {
    map.setSky({
      'sky-color': '#88c0e8',
      'horizon-color': '#a8c3d8',
      'fog-color': '#dbe7f0',
      'sky-horizon-blend': 0.6,
      'horizon-fog-blend': 0.5,
      'fog-ground-blend': 0.4,
      'atmosphere-blend': 1,
    });
  } else {
    map.setSky({
      'sky-color': '#0a0a0a',
      'horizon-color': '#1a1a1a',
      'fog-color': '#0a0a0a',
      'atmosphere-blend': 0,
    });
  }
}

/** Convert feet → metres. The renderer wants metres; the schema is feet. */
export function feetToMeters(ft) {
  return ft * FT_TO_M;
}

// --- internal: build the MapLibre style spec ---

function buildStyle() {
  const sources = {};
  const layers = [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#0e1116' },
    },
  ];

  if (config.imageryTileUrl) {
    sources['imagery'] = {
      type: 'raster',
      tiles: [config.imageryTileUrl],
      tileSize: 256,
      maxzoom: 19,
      attribution: config.imageryAttribution || '',
    };
    layers.push({
      id: 'imagery',
      type: 'raster',
      source: 'imagery',
      paint: { 'raster-opacity': 1.0 },
    });
  }

  if (config.terrainTileUrl) {
    sources['terrain-dem'] = {
      type: 'raster-dem',
      tiles: [config.terrainTileUrl],
      tileSize: 256,
      maxzoom: 15,
      encoding: config.terrainEncoding || 'terrarium',
      attribution: config.terrainAttribution || '',
    };
    layers.push({
      id: 'hillshade',
      type: 'hillshade',
      source: 'terrain-dem',
      paint: {
        'hillshade-shadow-color': '#000000',
        'hillshade-highlight-color': '#ffffff',
        'hillshade-exaggeration': 0.4,
      },
    });
  }

  return {
    version: 8,
    sources,
    layers,
    sky: {
      'sky-color': '#0a0a0a',
      'horizon-color': '#1a1a1a',
      'atmosphere-blend': 0,
    },
  };
}

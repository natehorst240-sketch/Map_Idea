// Public entry for npm consumers: import { ... } from 'asset-tracker'.
//
// The map layer (cesium-*) is also re-exported, but those modules expect a
// global `Cesium` provided by the consumer's HTML — they're a thin wrapper,
// not a Cesium re-package.

export { PositionPluginRegistry, buildRegistry } from './registry.js';

export { adsbAdapter } from './adapters/adsb.js';
export { trootraxAdapter } from './adapters/trootrax.js';
export { customAdapter } from './adapters/custom.js';
export { nmeaAdapter } from './adapters/nmea.js';
export { traccarAdapter, connectTraccarWebSocket } from './adapters/traccar.js';
export { aprsAdapter } from './adapters/aprs.js';
export { samsaraAdapter, startSamsaraFeed } from './adapters/samsara.js';
export { aisAdapter } from './adapters/ais.js';
export { inreachAdapter } from './adapters/inreach.js';
export { makeMqttAdapter } from './adapters/mqtt.js';
export { geojsonAdapter } from './adapters/geojson.js';

export { createMap, setSunLighting, feetToMeters } from './map/cesium-map.js';
export { EntityStore } from './map/cesium-entities.js';
export { CameraController } from './map/cesium-camera.js';

export { Sidebar } from './ui/sidebar.js';
export { SourceBadges } from './ui/badges.js';
export { toGeoJSON, toCSV, downloadBlob } from './ui/export.js';

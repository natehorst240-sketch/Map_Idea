import type { Adapter } from '../types.js';

/**
 * GeoJSON adapter — FeatureCollection of Point features. Coordinate
 * order is `[lon, lat, elevation_m?]`. Non-Point features are silently
 * skipped. `properties.altitudeFeet` is preferred over coordinate
 * elevation so the built-in `toGeoJSON` exporter round-trips losslessly.
 */
export declare const geojsonAdapter: Adapter;

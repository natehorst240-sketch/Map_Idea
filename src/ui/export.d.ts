import type { NormalizedPosition } from '../types.js';

export interface GeoJsonFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] | [number, number, number] };
  properties: {
    id: string;
    label: string;
    source: string;
    altitudeFeet: number | null;
    heading: number | null;
    speedKts: number | null;
    timestamp: number;
  };
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

/**
 * Serialize positions to a GeoJSON FeatureCollection. Coordinate order
 * is `[lon, lat, elev_m]` per RFC 7946 — altitude in feet is converted
 * to metres for the geometry, and the original feet value is preserved
 * in `properties.altitudeFeet` so `geojsonAdapter` round-trips losslessly.
 */
export declare function toGeoJSON(positions: NormalizedPosition[]): GeoJsonFeatureCollection;

/** Serialize positions to RFC 4180 CSV. */
export declare function toCSV(positions: NormalizedPosition[]): string;

/** Trigger a browser download with the given content. Browser-only. */
export declare function downloadBlob(content: string, filename: string, mimeType: string): void;

import type { MapInstance } from '../types.js';

/**
 * Initialize a MapLibre GL JS map using the tile URLs configured in
 * `config.js`. Returns the live `maplibregl.Map` instance — typed as
 * `unknown` so this package stays free of `@types/maplibre-gl`. Cast at
 * the call site if you have those types installed.
 *
 * Requires `maplibregl` to be available globally before this is called
 * (load via CDN or your bundler's MapLibre import).
 */
export declare function createMap(containerId: string): MapInstance;

/**
 * Toggle MapLibre's sky lighting. On = daylight tint with atmospheric
 * blend; off = flat dark backdrop suited to dashboard layouts.
 */
export declare function setSunLighting(map: MapInstance, enabled: boolean): void;

/** Convert feet → metres (× 0.3048). Useful at the render boundary. */
export declare function feetToMeters(ft: number): number;

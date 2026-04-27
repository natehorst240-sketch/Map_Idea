import type { CesiumViewer } from '../types.js';

/**
 * Initialize a Cesium Viewer using the token from `config.js` and the
 * Cesium ion World Terrain + Bing imagery defaults. Returns the viewer
 * (typed as `unknown` so this package stays free of @types/cesium —
 * cast at the call site if you have those types installed).
 */
export declare function createMap(containerId: string): CesiumViewer;

/** Toggle Cesium's day/night sun lighting on the globe. */
export declare function setSunLighting(viewer: CesiumViewer, enabled: boolean): void;

/** Convert feet → metres (× 0.3048). Useful at the render boundary. */
export declare function feetToMeters(ft: number): number;

// Shared type definitions for asset-tracker.
//
// All adapters produce this single shape. The map layer never sees raw
// adapter input — it only consumes NormalizedPosition.

/**
 * Output shape of every adapter's normalize() call.
 *
 * Units:
 *   altitude   — feet MSL (null if unavailable)
 *   heading    — true degrees, 0–360 (null if unavailable)
 *   speed      — knots (null if unavailable)
 *   timestamp  — Unix epoch seconds UTC
 *
 * Conversion to metres happens *only* at the renderer boundary.
 */
export interface NormalizedPosition {
  id: string;
  lat: number;
  lon: number;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
  source: string;
  label: string;
  meta?: Record<string, unknown>;
}

/**
 * Common adapter interface. canParse() must be cheap and side-effect-free.
 * normalize() may return an array, a single position, or null. Throwing
 * from normalize() is fine — the registry catches and logs.
 */
export interface Adapter {
  readonly name: string;
  canParse(raw: unknown): boolean;
  normalize(raw: unknown): NormalizedPosition[] | NormalizedPosition | null;
  /** Stateful adapters (NMEA, AIS) expose this for tests. */
  reset?(): void;
}

/** Map of source name → CSS color string. */
export type SourceColors = Record<string, string>;

export interface RegistryOptions {
  colors?: SourceColors;
}

export interface BuildRegistryOptions extends RegistryOptions {
  adapters?: Adapter[];
}

/** Returned by registry.poll() and connect/start helpers. */
export interface StopHandle {
  stop(): void;
}

/** Returned by startSamsaraFeed() — same as StopHandle plus cursor inspection. */
export interface SamsaraFeedHandle extends StopHandle {
  cursor(): string | null;
}

/**
 * Renderer instance handle (currently a `maplibregl.Map`). Typed as
 * `unknown` so this package stays free of `@types/maplibre-gl`. If you
 * have those types installed you can cast at the call site:
 *   import type { Map as MapLibreMap } from 'maplibre-gl';
 *   const map = createMap('mapContainer') as unknown as MapLibreMap;
 */
export type MapInstance = unknown;

/** @deprecated alias kept for back-compat — use {@link MapInstance}. */
export type CesiumViewer = MapInstance;
/** @deprecated alias kept for back-compat — entities are now deck.gl objects. */
export type CesiumEntity = unknown;

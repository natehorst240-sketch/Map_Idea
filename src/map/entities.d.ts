import type { MapInstance, NormalizedPosition } from '../types.js';
import type { PositionPluginRegistry } from '../registry.js';

/**
 * Maintains one logical "entity" per asset id, rendered through deck.gl
 * layers (markers, labels, heading arrows, faded trail polylines)
 * stacked on top of a MapLibre map.
 *
 * `updateMapPositions()` is idempotent — same id updates in place. Trail
 * history is rendered as faded polyline segments (10 prior fixes per
 * asset). Markers always render on top of terrain (depth test disabled).
 */
export declare class EntityStore {
  constructor(map: MapInstance, registry: PositionPluginRegistry);

  /** Create or update entities for a batch of normalized positions. */
  updateMapPositions(positions: NormalizedPosition[]): void;

  /** Show/hide all entities of a given source. */
  setSourceVisible(source: string, visible: boolean): void;

  /** Toggle the trail history overlay globally. */
  setTrailsVisible(visible: boolean): void;

  /**
   * Toggle terrain-clamping for one source. Defaults vary by source —
   * see DEFAULT_TERRAIN_FOLLOW in the source.
   */
  setTerrainFollow(source: string, follow: boolean): void;

  /** Whether terrain-clamp is on for a source (uses defaults if not set). */
  isTerrainFollow(source: string): boolean;

  /** Map of source name → number of currently-tracked entities. */
  countBySource(): Record<string, number>;

  /** All currently-tracked positions. */
  all(): NormalizedPosition[];

  /** Remove an asset by id. */
  remove(id: string): void;

  /** Highlight an asset (typically called by CameraController.selectAsset). */
  setSelected(id: string | null): void;
}

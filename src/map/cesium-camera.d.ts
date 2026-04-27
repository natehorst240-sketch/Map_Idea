import type { CesiumViewer } from '../types.js';
import type { EntityStore } from './cesium-entities.js';

/**
 * Camera controls keyed off an EntityStore. `selectAsset(id)` flies the
 * camera to the entity and centers it; `follow(id)` locks tracking on it
 * until `unfollow()` (or the user presses Escape).
 */
export declare class CameraController {
  constructor(viewer: CesiumViewer, store: EntityStore);

  /** True if a follow is currently active. */
  followingId: string | null;

  /** Fly the camera to a specific lat/lon at altitude (feet MSL). */
  panTo(lat: number, lon: number, altitudeFt?: number | null): void;

  /** Select the entity by id and frame it in the viewport. */
  selectAsset(id: string): boolean;

  /** Lock the camera onto an entity for live tracking. */
  follow(id: string): boolean;

  /** Release a tracked entity. */
  unfollow(): void;

  /** Toggle follow mode for an id; returns true if now following. */
  toggleFollow(id: string): boolean;
}

// camera.js — pan-to / fly-to / follow controls keyed off the EntityStore.
// The UI layer calls these by asset id; nothing here knows about adapters.

import { config } from '../../config.js';

const FOLLOW_TICK_MS = 250;

export class CameraController {
  constructor(map, store) {
    this.map = map;
    this.store = store;
    this.followingId = null;
    this._installEscapeHandler();
    this._installFollowTick();
  }

  _installEscapeHandler() {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.followingId) this.unfollow();
    });
  }

  _installFollowTick() {
    if (typeof window === 'undefined') return;
    setInterval(() => this._snapToFollowed(), FOLLOW_TICK_MS);
  }

  _snapToFollowed() {
    if (!this.followingId) return;
    const entity = this.store.byId.get(this.followingId);
    if (!entity || !entity.__lastPosition) return;
    const p = entity.__lastPosition;
    this.map.easeTo({
      center: [p.lon, p.lat],
      duration: 200,
      essential: true,
    });
  }

  /** Fly the camera to a lat/lon (altitude in feet is informational only). */
  panTo(lat, lon, _altitudeFt) {
    const targetZoom = Math.max(this.map.getZoom(), 11);
    this.map.flyTo({
      center: [lon, lat],
      zoom: targetZoom,
      pitch: config.initialView.pitch ?? 55,
      bearing: 0,
      duration: 1200,
      essential: true,
    });
  }

  /** Select an entity by id, highlight it, and frame it in the viewport. */
  selectAsset(id) {
    const entity = this.store.byId.get(id);
    if (!entity || !entity.__lastPosition) return false;
    if (typeof this.store.setSelected === 'function') this.store.setSelected(id);
    const p = entity.__lastPosition;
    this.map.flyTo({
      center: [p.lon, p.lat],
      zoom: Math.max(this.map.getZoom(), 11),
      pitch: 55,
      bearing: 0,
      duration: 1200,
      essential: true,
    });
    return true;
  }

  /** Lock the camera onto an entity for live tracking. */
  follow(id) {
    const entity = this.store.byId.get(id);
    if (!entity) return false;
    this.followingId = id;
    this._snapToFollowed();
    return true;
  }

  /** Release a tracked entity. */
  unfollow() {
    this.followingId = null;
  }

  /** Toggle follow mode for an id; returns true if now following. */
  toggleFollow(id) {
    if (this.followingId === id) {
      this.unfollow();
      return false;
    }
    return this.follow(id);
  }
}

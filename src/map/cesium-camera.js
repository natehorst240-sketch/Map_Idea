// cesium-camera.js — pan-to / fly-to / follow controls keyed off the
// EntityStore. The UI layer calls these by asset id; nothing here knows
// about adapters.

import { feetToMeters } from './cesium-map.js';

export class CameraController {
  constructor(viewer, store) {
    this.viewer = viewer;
    this.store = store;
    this.followingId = null;
    this._installEscapeHandler();
  }

  _installEscapeHandler() {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.followingId) this.unfollow();
    });
  }

  panTo(lat, lon, altitudeFt) {
    const altM = typeof altitudeFt === 'number' ? feetToMeters(altitudeFt) : 0;
    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, Math.max(altM + 8000, 12000)),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-45), roll: 0 },
      duration: 1.2,
    });
  }

  selectAsset(id) {
    const entity = this.store.byId.get(id);
    if (!entity) return false;
    this.viewer.selectedEntity = entity;
    const p = entity.__lastPosition;
    this.panTo(p.lat, p.lon, p.altitude);
    return true;
  }

  follow(id) {
    const entity = this.store.byId.get(id);
    if (!entity) return false;
    this.viewer.trackedEntity = entity;
    this.followingId = id;
    return true;
  }

  unfollow() {
    this.viewer.trackedEntity = undefined;
    this.followingId = null;
  }

  toggleFollow(id) {
    if (this.followingId === id) {
      this.unfollow();
      return false;
    }
    return this.follow(id);
  }
}

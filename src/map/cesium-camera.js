// cesium-camera.js — pan-to / fly-to / follow controls keyed off the
// EntityStore. The UI layer calls these by asset id; nothing here knows
// about adapters.

import { feetToMeters } from './cesium-map.js';

export class CameraController {
  constructor(viewer, store) {
    this.viewer = viewer;
    this.store = store;
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
    return true;
  }

  unfollow() {
    this.viewer.trackedEntity = undefined;
  }
}

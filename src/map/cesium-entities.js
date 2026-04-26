// cesium-entities.js — render normalized positions as Cesium entities.
//
// updateMapPositions() is idempotent: same id → same entity, position
// updated in place. Entities are tagged with .__source so badge filters
// can show/hide by source without removing them.

import { feetToMeters } from './cesium-map.js';
import { config } from '../../config.js';

export class EntityStore {
  constructor(viewer, registry) {
    this.viewer = viewer;
    this.registry = registry;
    this.byId = new Map();
    this.hiddenSources = new Set();
  }

  updateMapPositions(positions) {
    for (const p of positions) {
      this.upsert(p);
    }
  }

  upsert(p) {
    const altMeters = typeof p.altitude === 'number' ? feetToMeters(p.altitude) : 0;
    const pos = Cesium.Cartesian3.fromDegrees(p.lon, p.lat, altMeters);
    const color = this.registry.color(p.source);
    const isStale = isPositionStale(p);
    const cesiumColor = stripeAlpha(color, isStale ? 0.35 : 1.0);

    let entity = this.byId.get(p.id);
    if (!entity) {
      entity = this.viewer.entities.add({
        id: `asset-${p.id}`,
        name: p.label,
        position: pos,
        point: {
          pixelSize: 12,
          color: cesiumColor,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.NONE,
        },
        label: {
          text: p.label,
          font: '12px sans-serif',
          pixelOffset: new Cesium.Cartesian2(0, -22),
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          showBackground: true,
          backgroundColor: new Cesium.Color(0, 0, 0, 0.5),
        },
        polyline: undefined,
        description: buildDescription(p),
      });
      entity.__source = p.source;
      entity.__lastPosition = p;
      this.byId.set(p.id, entity);
    } else {
      entity.position = pos;
      entity.point.color = cesiumColor;
      entity.label.text = p.label;
      entity.description = buildDescription(p);
      entity.__lastPosition = p;
    }

    // Heading arrow: redraw a short polyline in the heading direction when we
    // have one. Cesium polylines can't be reused easily across updates, so
    // we attach it as a property graphics object on the entity.
    if (typeof p.heading === 'number') {
      attachHeadingArrow(entity, p, altMeters);
    }

    if (this.hiddenSources.has(p.source)) {
      entity.show = false;
    }
  }

  setSourceVisible(source, visible) {
    if (visible) this.hiddenSources.delete(source);
    else this.hiddenSources.add(source);
    for (const entity of this.byId.values()) {
      if (entity.__source === source) entity.show = visible;
    }
  }

  countBySource() {
    const counts = {};
    for (const entity of this.byId.values()) {
      counts[entity.__source] = (counts[entity.__source] || 0) + 1;
    }
    return counts;
  }

  all() {
    return Array.from(this.byId.values()).map((e) => e.__lastPosition);
  }

  remove(id) {
    const entity = this.byId.get(id);
    if (!entity) return;
    this.viewer.entities.remove(entity);
    this.byId.delete(id);
  }
}

function isPositionStale(p) {
  if (typeof p.timestamp !== 'number') return false;
  const age = Date.now() / 1000 - p.timestamp;
  return age > config.staleThresholdSeconds;
}

function attachHeadingArrow(entity, p, altMeters) {
  // Length scales loosely with altitude so high-flying jets get a
  // proportionally longer indicator. Keep it modest.
  const lengthMeters = Math.max(500, Math.min(altMeters * 0.05 + 800, 5000));
  const start = Cesium.Cartesian3.fromDegrees(p.lon, p.lat, altMeters);
  const end = projectAhead(p.lat, p.lon, p.heading, lengthMeters, altMeters);
  if (!entity.polyline) {
    entity.polyline = new Cesium.PolylineGraphics({
      positions: [start, end],
      width: 2,
      material: Cesium.Color.YELLOW.withAlpha(0.9),
      arcType: Cesium.ArcType.NONE,
    });
  } else {
    entity.polyline.positions = [start, end];
  }
}

function projectAhead(lat, lon, headingDeg, distMeters, altMeters) {
  // Forward-azimuth projection on a spherical earth — accurate enough for
  // a few-km arrow visualization.
  const R = 6371000;
  const brng = (headingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;
  const ang = distMeters / R;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(ang) + Math.cos(lat1) * Math.sin(ang) * Math.cos(brng));
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(ang) * Math.cos(lat1),
      Math.cos(ang) - Math.sin(lat1) * Math.sin(lat2),
    );
  return Cesium.Cartesian3.fromDegrees((lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI, altMeters);
}

function stripeAlpha(hex, alpha) {
  const c = Cesium.Color.fromCssColorString(hex);
  return new Cesium.Color(c.red, c.green, c.blue, alpha);
}

function buildDescription(p) {
  const altStr = typeof p.altitude === 'number' ? `${Math.round(p.altitude).toLocaleString()} ft MSL` : '—';
  const spdStr = typeof p.speed === 'number' ? `${p.speed.toFixed(0)} kts` : '—';
  const hdgStr = typeof p.heading === 'number' ? `${p.heading.toFixed(0)}°` : '—';
  const tsStr = typeof p.timestamp === 'number' ? new Date(p.timestamp * 1000).toISOString() : '—';
  return `<table class="cesium-infoBox-defaultTable">
    <tr><th>ID</th><td>${escapeHtml(p.id)}</td></tr>
    <tr><th>Source</th><td>${escapeHtml(p.source)}</td></tr>
    <tr><th>Altitude</th><td>${altStr}</td></tr>
    <tr><th>Speed</th><td>${spdStr}</td></tr>
    <tr><th>Heading</th><td>${hdgStr}</td></tr>
    <tr><th>Reported</th><td>${tsStr}</td></tr>
  </table>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

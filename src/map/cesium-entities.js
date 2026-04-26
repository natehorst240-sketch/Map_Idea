// cesium-entities.js — render normalized positions as Cesium entities.
//
// updateMapPositions() is idempotent: same id → same entity, position
// updated in place. Entities are tagged with .__source so badge filters
// can show/hide by source without removing them.

import { feetToMeters } from './cesium-map.js';
import { config } from '../../config.js';

const TRAIL_LENGTH = 10;
const ALT_CALLOUT_HEIGHT_M = 500_000;

export class EntityStore {
  constructor(viewer, registry) {
    this.viewer = viewer;
    this.registry = registry;
    this.byId = new Map();
    this.trails = new Map(); // id -> { history: [{lat,lon,alt}], segments: [Entity] }
    this.hiddenSources = new Set();
    this.trailsVisible = true;
    this.altCalloutVisible = false;
    this.installCameraHook();
  }

  installCameraHook() {
    if (!this.viewer || !this.viewer.camera) return;
    this.viewer.camera.changed.addEventListener(() => this.refreshAltCallouts());
    this.viewer.camera.percentageChanged = 0.05;
  }

  refreshAltCallouts() {
    const carto = this.viewer.camera.positionCartographic;
    if (!carto) return;
    const visible = carto.height < ALT_CALLOUT_HEIGHT_M;
    if (visible === this.altCalloutVisible) return;
    this.altCalloutVisible = visible;
    for (const entity of this.byId.values()) {
      this.applyLabelText(entity, entity.__lastPosition);
    }
  }

  updateMapPositions(positions) {
    for (const p of positions) {
      this.upsert(p);
    }
  }

  upsert(p) {
    const altMeters = typeof p.altitude === 'number' ? feetToMeters(p.altitude) : 0;
    const pos = Cesium.Cartesian3.fromDegrees(p.lon, p.lat, altMeters);
    const baseColor = this.registry.color(p.source);
    const isStale = isPositionStale(p);
    const cesiumColor = renderColor(baseColor, isStale);

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
      this.byId.set(p.id, entity);
    } else {
      // Push the previous fix into the trail before overwriting.
      this.appendTrail(p.id, entity.__lastPosition);
      entity.position = pos;
      entity.point.color = cesiumColor;
      entity.description = buildDescription(p);
    }
    entity.__lastPosition = p;
    this.applyLabelText(entity, p);

    if (typeof p.heading === 'number') {
      attachHeadingArrow(entity, p, altMeters);
    }
    this.redrawTrail(p.id);

    if (this.hiddenSources.has(p.source)) {
      entity.show = false;
    }
  }

  applyLabelText(entity, p) {
    if (!entity || !p) return;
    const showAlt = this.altCalloutVisible && typeof p.altitude === 'number';
    entity.label.text = showAlt
      ? `${p.label}\n${Math.round(p.altitude).toLocaleString()} ft`
      : p.label;
  }

  appendTrail(id, prev) {
    if (!prev) return;
    let trail = this.trails.get(id);
    if (!trail) {
      trail = { history: [], segments: [] };
      this.trails.set(id, trail);
    }
    trail.history.push({ lat: prev.lat, lon: prev.lon, altitude: prev.altitude });
    while (trail.history.length > TRAIL_LENGTH) trail.history.shift();
  }

  redrawTrail(id) {
    const trail = this.trails.get(id);
    if (!trail) return;
    // Remove old segments.
    for (const seg of trail.segments) this.viewer.entities.remove(seg);
    trail.segments = [];

    if (!this.trailsVisible) return;

    const entity = this.byId.get(id);
    if (!entity) return;

    const points = [...trail.history];
    if (entity.__lastPosition) {
      points.push({
        lat: entity.__lastPosition.lat,
        lon: entity.__lastPosition.lon,
        altitude: entity.__lastPosition.altitude,
      });
    }
    if (points.length < 2) return;

    const baseColor = this.registry.color(entity.__source);
    const cesiumBase = Cesium.Color.fromCssColorString(baseColor);
    // One short polyline per segment so each can carry its own opacity —
    // entity-graphics polylines don't support per-vertex colors.
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const altA = typeof a.altitude === 'number' ? feetToMeters(a.altitude) : 0;
      const altB = typeof b.altitude === 'number' ? feetToMeters(b.altitude) : 0;
      // Older segments → lower alpha. Maps i=0..n-2 to alpha 0.1..1.0.
      const alpha = 0.1 + (0.9 * (i + 1)) / (points.length - 1);
      const seg = this.viewer.entities.add({
        polyline: {
          positions: [
            Cesium.Cartesian3.fromDegrees(a.lon, a.lat, altA),
            Cesium.Cartesian3.fromDegrees(b.lon, b.lat, altB),
          ],
          width: 2,
          material: new Cesium.Color(cesiumBase.red, cesiumBase.green, cesiumBase.blue, alpha),
          arcType: Cesium.ArcType.NONE,
        },
      });
      seg.__trailFor = id;
      trail.segments.push(seg);
    }
  }

  setTrailsVisible(visible) {
    this.trailsVisible = visible;
    for (const id of this.trails.keys()) this.redrawTrail(id);
  }

  setSourceVisible(source, visible) {
    if (visible) this.hiddenSources.delete(source);
    else this.hiddenSources.add(source);
    for (const entity of this.byId.values()) {
      if (entity.__source === source) entity.show = visible;
    }
    // Hide trails of hidden sources too.
    for (const [id, trail] of this.trails) {
      const entity = this.byId.get(id);
      if (!entity || entity.__source !== source) continue;
      for (const seg of trail.segments) seg.show = visible;
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
    if (entity) {
      this.viewer.entities.remove(entity);
      this.byId.delete(id);
    }
    const trail = this.trails.get(id);
    if (trail) {
      for (const seg of trail.segments) this.viewer.entities.remove(seg);
      this.trails.delete(id);
    }
  }
}

function isPositionStale(p) {
  if (typeof p.timestamp !== 'number') return false;
  const age = Date.now() / 1000 - p.timestamp;
  return age > config.staleThresholdSeconds;
}

// Stale: shift the marker toward grey AND drop alpha. Live: full color.
function renderColor(hex, isStale) {
  const c = Cesium.Color.fromCssColorString(hex);
  if (!isStale) return new Cesium.Color(c.red, c.green, c.blue, 1.0);
  const grey = 0.55;
  return new Cesium.Color(
    c.red * 0.4 + grey * 0.6,
    c.green * 0.4 + grey * 0.6,
    c.blue * 0.4 + grey * 0.6,
    0.4,
  );
}

function attachHeadingArrow(entity, p, altMeters) {
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

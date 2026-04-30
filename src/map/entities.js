// entities.js — render normalized positions as deck.gl layers over MapLibre.
//
// Layers, rebuilt on every updateMapPositions():
//   - PathLayer        : per-asset trail history (last 10 fixes)
//   - LineLayer        : per-asset heading arrow (when heading != null)
//   - ScatterplotLayer : the marker dot (with stale-state recolor)
//   - TextLayer        : the marker label (id; altitude callout when zoomed in)
//
// All layers render with depthTest disabled — markers always appear on top
// of terrain, even when geometrically buried inside a mountain.
//
// Public API matches the previous Cesium-backed implementation so that
// CameraController, the demo, and TS consumers don't change.

import { feetToMeters } from './map.js';
import { config } from '../../config.js';

const TRAIL_LENGTH = 10;
const ALT_CALLOUT_ZOOM = 9.5;

const DEFAULT_TERRAIN_FOLLOW = new Set(['traccar', 'samsara', 'custom', 'mqtt', 'geojson', 'aprs']);

export class EntityStore {
  constructor(map, registry) {
    if (typeof deck === 'undefined') {
      throw new Error(
        '[entities] deck.gl global (`deck`) is not defined. Load it from a CDN, e.g. ' +
          '<script src="https://unpkg.com/deck.gl@latest/dist.min.js"></script>',
      );
    }
    this.map = map;
    this.registry = registry;
    this.byId = new Map(); // id → { __source, __lastPosition }
    this.trails = new Map(); // id → NormalizedPosition[] (oldest → newest)
    this.hiddenSources = new Set();
    this.terrainFollow = new Map();
    this.trailsVisible = true;
    this.selectedId = null;
    this.altCallout = false;
    this.popup = null;

    this.overlay = new deck.MapboxOverlay({ interleaved: false, layers: [] });
    map.addControl(this.overlay);

    map.on('zoom', () => this._refreshAltCallout());
    this._refreshAltCallout(/* skipRender */ true);
  }

  isTerrainFollow(source) {
    if (this.terrainFollow.has(source)) return this.terrainFollow.get(source);
    return DEFAULT_TERRAIN_FOLLOW.has(source);
  }

  setTerrainFollow(source, follow) {
    this.terrainFollow.set(source, follow);
    this._render();
  }

  updateMapPositions(positions) {
    for (const p of positions) {
      const prev = this.byId.get(p.id);
      if (prev && prev.__lastPosition) {
        const trail = this.trails.get(p.id) || [];
        trail.push(prev.__lastPosition);
        while (trail.length > TRAIL_LENGTH) trail.shift();
        this.trails.set(p.id, trail);
      }
      this.byId.set(p.id, { __source: p.source, __lastPosition: p });
    }
    this._render();
  }

  setSourceVisible(source, visible) {
    if (visible) this.hiddenSources.delete(source);
    else this.hiddenSources.add(source);
    this._render();
  }

  setTrailsVisible(visible) {
    this.trailsVisible = !!visible;
    this._render();
  }

  countBySource() {
    const counts = {};
    for (const { __source } of this.byId.values()) {
      counts[__source] = (counts[__source] || 0) + 1;
    }
    return counts;
  }

  all() {
    return Array.from(this.byId.values()).map((e) => e.__lastPosition);
  }

  remove(id) {
    this.byId.delete(id);
    this.trails.delete(id);
    if (this.selectedId === id) this.selectedId = null;
    this._render();
  }

  /** Highlight an asset (called by CameraController.selectAsset). */
  setSelected(id) {
    this.selectedId = id;
    this._render();
  }

  _refreshAltCallout(skipRender) {
    const z = this.map.getZoom();
    const want = z >= ALT_CALLOUT_ZOOM;
    if (want === this.altCallout) return;
    this.altCallout = want;
    if (!skipRender) this._render();
  }

  _zForSource(p) {
    if (this.isTerrainFollow(p.source)) return 0;
    if (typeof p.altitude !== 'number') return 0;
    return feetToMeters(p.altitude);
  }

  _isStale(p) {
    if (typeof p.timestamp !== 'number') return false;
    return Date.now() / 1000 - p.timestamp > config.staleThresholdSeconds;
  }

  _render() {
    const visible = [];
    for (const { __source, __lastPosition } of this.byId.values()) {
      if (this.hiddenSources.has(__source)) continue;
      visible.push(__lastPosition);
    }

    const layers = [];

    if (this.trailsVisible) {
      const trailData = [];
      for (const p of visible) {
        const history = this.trails.get(p.id) || [];
        if (history.length === 0) continue;
        const path = [...history, p].map((h) => [h.lon, h.lat, this._zForSource(h)]);
        trailData.push({ id: p.id, source: p.source, path });
      }
      if (trailData.length) {
        layers.push(
          new deck.PathLayer({
            id: 'asset-trails',
            data: trailData,
            getPath: (d) => d.path,
            getColor: (d) => rgbaFromHex(this.registry.color(d.source), 200),
            getWidth: 2,
            widthUnits: 'pixels',
            parameters: { depthTest: false },
          }),
        );
      }
    }

    const arrowData = visible.filter((p) => typeof p.heading === 'number');
    if (arrowData.length) {
      layers.push(
        new deck.LineLayer({
          id: 'asset-heading-arrows',
          data: arrowData,
          getSourcePosition: (d) => [d.lon, d.lat, this._zForSource(d)],
          getTargetPosition: (d) => {
            const lengthM = Math.max(1500, Math.min(this._zForSource(d) * 0.05 + 1500, 6000));
            const [lon, lat] = projectAhead(d.lat, d.lon, d.heading, lengthM);
            return [lon, lat, this._zForSource(d)];
          },
          getColor: [255, 215, 0, 220],
          getWidth: 2,
          widthUnits: 'pixels',
          parameters: { depthTest: false },
        }),
      );
    }

    if (visible.length) {
      layers.push(
        new deck.ScatterplotLayer({
          id: 'asset-markers',
          data: visible,
          pickable: true,
          stroked: true,
          filled: true,
          radiusUnits: 'pixels',
          lineWidthUnits: 'pixels',
          getPosition: (d) => [d.lon, d.lat, this._zForSource(d)],
          getRadius: () => 7,
          getFillColor: (d) => this._fillColor(d),
          getLineColor: (d) =>
            this.selectedId === d.id ? [255, 220, 80, 240] : [255, 255, 255, 220],
          getLineWidth: (d) => (this.selectedId === d.id ? 3 : 1.5),
          updateTriggers: {
            getFillColor: [this.selectedId],
            getLineColor: [this.selectedId],
            getLineWidth: [this.selectedId],
          },
          parameters: { depthTest: false },
          onClick: (info) => this._onMarkerClick(info),
        }),
      );

      layers.push(
        new deck.TextLayer({
          id: 'asset-labels',
          data: visible,
          pickable: false,
          getPosition: (d) => [d.lon, d.lat, this._zForSource(d)],
          getText: (d) => this._labelText(d),
          getSize: 12,
          sizeUnits: 'pixels',
          getColor: [240, 240, 240, 255],
          getPixelOffset: [0, -22],
          background: true,
          backgroundPadding: [4, 2],
          getBackgroundColor: [0, 0, 0, 160],
          characterSet:
            ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~°—\n',
          parameters: { depthTest: false },
          updateTriggers: {
            getText: [this.altCallout],
          },
        }),
      );
    }

    this.overlay.setProps({ layers });
  }

  _labelText(p) {
    if (this.altCallout && typeof p.altitude === 'number') {
      return `${p.label}\n${Math.round(p.altitude).toLocaleString()} ft`;
    }
    return p.label;
  }

  _fillColor(p) {
    const baseRgb = rgbFromHex(this.registry.color(p.source));
    if (this._isStale(p)) {
      const grey = 140;
      return [
        Math.round(baseRgb[0] * 0.4 + grey * 0.6),
        Math.round(baseRgb[1] * 0.4 + grey * 0.6),
        Math.round(baseRgb[2] * 0.4 + grey * 0.6),
        110,
      ];
    }
    return [baseRgb[0], baseRgb[1], baseRgb[2], 240];
  }

  _onMarkerClick(info) {
    const p = info && info.object;
    if (!p) return;
    this.selectedId = p.id;
    this._render();
    this._showPopup(p);
  }

  _showPopup(p) {
    if (this.popup) this.popup.remove();
    this.popup = new maplibregl.Popup({ closeButton: true, offset: 14 })
      .setLngLat([p.lon, p.lat])
      .setHTML(buildDescriptionHtml(p))
      .addTo(this.map);
  }
}

function projectAhead(lat, lon, headingDeg, distMeters) {
  const R = 6371000;
  const brng = (headingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;
  const ang = distMeters / R;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(ang) + Math.cos(lat1) * Math.sin(ang) * Math.cos(brng),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(ang) * Math.cos(lat1),
      Math.cos(ang) - Math.sin(lat1) * Math.sin(lat2),
    );
  return [(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI];
}

function rgbFromHex(hex) {
  const s = String(hex).replace('#', '');
  const v = parseInt(s.length === 3 ? s.split('').map((c) => c + c).join('') : s, 16);
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}

function rgbaFromHex(hex, alpha) {
  const [r, g, b] = rgbFromHex(hex);
  return [r, g, b, alpha];
}

function buildDescriptionHtml(p) {
  const altStr = typeof p.altitude === 'number' ? `${Math.round(p.altitude).toLocaleString()} ft MSL` : '—';
  const spdStr = typeof p.speed === 'number' ? `${p.speed.toFixed(0)} kts` : '—';
  const hdgStr = typeof p.heading === 'number' ? `${p.heading.toFixed(0)}°` : '—';
  const tsStr = typeof p.timestamp === 'number' ? new Date(p.timestamp * 1000).toISOString() : '—';
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; min-width: 200px; color:#222">
    <div style="font-weight:600;font-size:13px;margin-bottom:4px">${escapeHtml(p.label)}</div>
    <table style="border-collapse:collapse;width:100%">
      <tr><td style="color:#666;padding:2px 8px 2px 0">Source</td><td>${escapeHtml(p.source)}</td></tr>
      <tr><td style="color:#666;padding:2px 8px 2px 0">Altitude</td><td>${altStr}</td></tr>
      <tr><td style="color:#666;padding:2px 8px 2px 0">Speed</td><td>${spdStr}</td></tr>
      <tr><td style="color:#666;padding:2px 8px 2px 0">Heading</td><td>${hdgStr}</td></tr>
      <tr><td style="color:#666;padding:2px 8px 2px 0">Reported</td><td>${tsStr}</td></tr>
    </table>
  </div>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

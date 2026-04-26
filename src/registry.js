// PositionPluginRegistry
//
// Routes raw payloads from any source to the first registered adapter that
// claims it via canParse(). The map layer never sees raw data — only the
// normalized position objects emitted by adapter.normalize().
//
// Normalized position schema:
//   { id, lat, lon, altitude, heading, speed, timestamp, source, label, meta }
// altitude is feet MSL (null if unavailable). Conversion to metres happens
// only at the Cesium render boundary.

export class PositionPluginRegistry {
  constructor({ colors = {} } = {}) {
    this.adapters = [];
    this.colors = { ...colors };
  }

  // Register an adapter. Order matters: first canParse() match wins.
  reg(adapter) {
    if (!adapter || typeof adapter.canParse !== 'function' || typeof adapter.normalize !== 'function') {
      throw new Error('Adapter must implement canParse() and normalize()');
    }
    if (!adapter.name) {
      throw new Error('Adapter must have a name');
    }
    this.adapters.push(adapter);
    return this;
  }

  // Run a raw payload through the registered adapters and return an array of
  // normalized positions. Returns [] if no adapter matches.
  parse(raw) {
    for (const adapter of this.adapters) {
      let matched = false;
      try {
        matched = adapter.canParse(raw);
      } catch (_err) {
        matched = false;
      }
      if (!matched) continue;
      try {
        const out = adapter.normalize(raw);
        return Array.isArray(out) ? out.filter(Boolean) : out ? [out] : [];
      } catch (err) {
        // Adapter claimed the payload but failed to normalize it. Surface the
        // error to the caller via console; do not let one bad packet kill the
        // pipeline.
        console.warn(`[registry] adapter ${adapter.name} failed: ${err.message}`);
        return [];
      }
    }
    return [];
  }

  color(source) {
    return this.colors[source] || '#888888';
  }

  setColor(source, hex) {
    this.colors[source] = hex;
  }

  list() {
    return this.adapters.map((a) => a.name);
  }
}

// Convenience: build a registry with a stock set of adapters.
export function buildRegistry({ adapters = [], colors = {} } = {}) {
  const reg = new PositionPluginRegistry({ colors });
  for (const a of adapters) reg.reg(a);
  return reg;
}

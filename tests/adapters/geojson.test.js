import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { geojsonAdapter } from '../../src/adapters/geojson.js';
import { toGeoJSON } from '../../src/ui/export.js';

const here = dirname(fileURLToPath(import.meta.url));
const thirdParty = JSON.parse(
  readFileSync(resolve(here, '../fixtures/geojson-third-party.json'), 'utf8'),
);

describe('geojson adapter', () => {
  test('canParse fingerprints FeatureCollection containing Point features', () => {
    expect(geojsonAdapter.canParse(thirdParty)).toBe(true);
  });

  test('canParse rejects non-FeatureCollection or no-Point shapes', () => {
    expect(geojsonAdapter.canParse({ type: 'Feature' })).toBe(false);
    expect(
      geojsonAdapter.canParse({
        type: 'FeatureCollection',
        features: [{ geometry: { type: 'LineString', coordinates: [] } }],
      }),
    ).toBe(false);
    expect(geojsonAdapter.canParse({ aircraft: [], now: 0, messages: 0 })).toBe(false);
  });

  test('third-party export: coordinate order is [lon, lat, elev_m]; LineString skipped', () => {
    const out = geojsonAdapter.normalize(thirdParty);
    expect(out).toHaveLength(2); // LineString filtered
    const wp1 = out.find((p) => p.id === 'wp-1');
    expect(wp1.lat).toBe(40.6125);
    expect(wp1.lon).toBe(-111.5582);
    // 1448 m → ft
    expect(wp1.altitude).toBeCloseTo(1448 * 3.28084, 1);
    expect(wp1.label).toBe('Park Junction');
    expect(wp1.timestamp).toBeCloseTo(Date.parse('2026-04-26T17:12:30Z') / 1000, 1);
  });

  test('elevation property is recognized when no third coord', () => {
    const out = geojsonAdapter.normalize(thirdParty);
    const trailhead = out.find((p) => p.label === 'Trailhead');
    expect(trailhead.altitude).toBeCloseTo(1580 * 3.28084, 1);
    expect(trailhead.heading).toBe(92);
    expect(trailhead.speed).toBe(0);
  });

  test('round-trips with our own toGeoJSON exporter', () => {
    const positions = [
      {
        id: 'A1',
        label: 'Aircraft 1',
        source: 'adsb',
        lat: 40.5,
        lon: -111.9,
        altitude: 35000,
        heading: 270,
        speed: 420,
        timestamp: 1714158000,
        meta: {},
      },
    ];
    const exported = toGeoJSON(positions);
    expect(geojsonAdapter.canParse(exported)).toBe(true);
    const round = geojsonAdapter.normalize(exported);
    expect(round).toHaveLength(1);
    expect(round[0].id).toBe('A1');
    // exporter wrote altitudeFeet → adapter prefers it over the coord elevation
    expect(round[0].altitude).toBe(35000);
    expect(round[0].source).toBe('adsb'); // preserved via properties.source
    expect(round[0].heading).toBe(270);
    expect(round[0].speed).toBe(420);
  });
});

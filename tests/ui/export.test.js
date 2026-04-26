import { toGeoJSON, toCSV } from '../../src/ui/export.js';

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
  {
    id: 'B2',
    label: 'Truck, Big',
    source: 'traccar',
    lat: 40.6,
    lon: -111.8,
    altitude: null,
    heading: null,
    speed: 30,
    timestamp: 1714158005,
    meta: {},
  },
];

describe('export', () => {
  test('toGeoJSON emits Point features with [lon, lat, elev_m]', () => {
    const g = toGeoJSON(positions);
    expect(g.type).toBe('FeatureCollection');
    expect(g.features).toHaveLength(2);
    expect(g.features[0].geometry.coordinates[0]).toBe(-111.9);
    expect(g.features[0].geometry.coordinates[1]).toBe(40.5);
    // 35000 ft × 0.3048 → metres
    expect(g.features[0].geometry.coordinates[2]).toBeCloseTo(35000 * 0.3048, 4);
    expect(g.features[0].properties.source).toBe('adsb');
    expect(g.features[1].geometry.coordinates).toHaveLength(2); // no altitude
  });

  test('toCSV escapes commas and quotes inside fields', () => {
    const csv = toCSV(positions);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('id,label,source,lat,lon,altitudeFeet,heading,speedKts,timestamp');
    expect(lines[2]).toContain('"Truck, Big"');
    // null altitude/heading → empty cells
    expect(lines[2].split(',')).toContain('');
  });
});

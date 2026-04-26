import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { adsbAdapter } from '../../src/adapters/adsb.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(resolve(here, '../fixtures/adsb.json'), 'utf8'));

describe('adsb adapter', () => {
  test('canParse fingerprints dump1090 payload', () => {
    expect(adsbAdapter.canParse(fixture)).toBe(true);
  });

  test('canParse rejects unrelated JSON', () => {
    expect(adsbAdapter.canParse({ flights: [] })).toBe(false);
    expect(adsbAdapter.canParse(null)).toBe(false);
    expect(adsbAdapter.canParse('hello')).toBe(false);
  });

  test('normalize emits one position per fixed aircraft and skips unfixed', () => {
    const out = adsbAdapter.normalize(fixture);
    expect(out).toHaveLength(2);
    const dal = out.find((p) => p.label === 'DAL123');
    expect(dal).toBeDefined();
    expect(dal.lat).toBeCloseTo(40.7126);
    expect(dal.altitude).toBe(35150);
    expect(dal.heading).toBe(273);
    expect(dal.source).toBe('adsb');
    expect(dal.timestamp).toBeCloseTo(1714158000 - 0.4);
  });

  test('alt_geom preferred over alt_baro', () => {
    const out = adsbAdapter.normalize(fixture);
    const heli = out.find((p) => p.id === 'ad88e2');
    expect(heli.altitude).toBe(4810);
  });
});

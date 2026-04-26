import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { customAdapter } from '../../src/adapters/custom.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(resolve(here, '../fixtures/custom.json'), 'utf8'));

describe('custom adapter', () => {
  test('canParse only on explicit source marker', () => {
    expect(customAdapter.canParse(fixture)).toBe(true);
    expect(customAdapter.canParse({ points: [] })).toBe(false);
    expect(customAdapter.canParse({ source: 'adsb' })).toBe(false);
  });

  test('normalize handles points array', () => {
    const out = customAdapter.normalize(fixture);
    expect(out).toHaveLength(2);
    const t1 = out.find((p) => p.id === 'TRUCK-1');
    expect(t1.altitude).toBe(4500);
    expect(t1.heading).toBe(90);
    expect(t1.speed).toBe(30);
    expect(t1.timestamp).toBe(1714158000);
    expect(t1.label).toBe('Supply Truck 1');
    expect(t1.source).toBe('custom');
  });

  test('normalize handles single inline point', () => {
    const out = customAdapter.normalize({ source: 'custom', id: 'X', lat: 1, lon: 2, ts: 0 });
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('X');
  });
});

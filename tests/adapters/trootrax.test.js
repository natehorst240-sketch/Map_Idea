import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { trootraxAdapter } from '../../src/adapters/trootrax.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(resolve(here, '../fixtures/trootrax.json'), 'utf8'));

describe('trootrax adapter', () => {
  test('canParse on feed marker', () => {
    expect(trootraxAdapter.canParse(fixture)).toBe(true);
  });

  test('canParse rejects ADS-B fixture shape', () => {
    expect(trootraxAdapter.canParse({ aircraft: [], now: 0, messages: 0 })).toBe(false);
  });

  test('normalize emits one position per asset with feet altitude', () => {
    const out = trootraxAdapter.normalize(fixture);
    expect(out).toHaveLength(3);
    const heli = out.find((p) => p.id === 'N251HC');
    expect(heli.altitude).toBe(4750);
    expect(heli.heading).toBe(305);
    expect(heli.speed).toBe(95);
    expect(heli.source).toBe('trootrax');
    expect(heli.label).toBe('N251HC');
  });

  test('timestamp parsed from ISO', () => {
    const out = trootraxAdapter.normalize(fixture);
    const heli = out.find((p) => p.id === 'N251HC');
    expect(heli.timestamp).toBeCloseTo(Date.parse('2026-04-26T17:12:30Z') / 1000);
  });
});

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { flightdocsAdapter } from '../../src/adapters/flightdocs.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(resolve(here, '../fixtures/flightdocs.json'), 'utf8'));

describe('flightdocs adapter', () => {
  test('canParse on flights array with aircraft + position', () => {
    expect(flightdocsAdapter.canParse(fixture)).toBe(true);
  });

  test('canParse rejects empty flights', () => {
    expect(flightdocsAdapter.canParse({ flights: [] })).toBe(false);
  });

  test('canParse rejects trootrax shape', () => {
    expect(flightdocsAdapter.canParse({ feed: 'trootrax', assets: [] })).toBe(false);
  });

  test('normalize emits altitude in feet, heading from trueHeading', () => {
    const out = flightdocsAdapter.normalize(fixture);
    expect(out).toHaveLength(2);
    const f1 = out.find((p) => p.id === 'N731HC');
    expect(f1.altitude).toBe(5200);
    expect(f1.heading).toBe(187);
    expect(f1.speed).toBe(110);
    expect(f1.source).toBe('flightdocs');
    expect(f1.meta.flightId).toBe('FD-001');
  });
});

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { inreachAdapter } from '../../src/adapters/inreach.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(resolve(here, '../fixtures/inreach.json'), 'utf8'));

describe('inreach adapter', () => {
  test('canParse fingerprints IPC Outbound envelope', () => {
    expect(inreachAdapter.canParse(fixture)).toBe(true);
  });

  test('canParse rejects unrelated shapes', () => {
    expect(inreachAdapter.canParse({ Events: [] })).toBe(false);
    expect(inreachAdapter.canParse({ Version: '2.0', Events: [{}] })).toBe(false);
    expect(inreachAdapter.canParse({ feed: 'trootrax', assets: [] })).toBe(false);
  });

  test('normalize converts metres → feet and km/h → knots', () => {
    const out = inreachAdapter.normalize(fixture);
    // Only messageCode 0 and 1 are emitted (4 events, 2 of which qualify).
    expect(out).toHaveLength(2);
    const first = out.find((p) => p.id === '300434061234567');
    expect(first.altitude).toBeCloseTo(2050 * 3.28084, 1);
    expect(first.speed).toBeCloseTo(12.5 * 0.539957, 2);
    expect(first.heading).toBe(270);
    expect(first.source).toBe('inreach');
    expect(first.timestamp).toBe(1714158000);
  });

  test('messageCode 10 (text) and 64 (SOS) are filtered out', () => {
    const out = inreachAdapter.normalize(fixture);
    expect(out.find((p) => p.id === '300434061234569')).toBeUndefined();
    expect(out.find((p) => p.id === '300434061234570')).toBeUndefined();
  });

  test('messageCode + addresses pass through to meta', () => {
    const out = inreachAdapter.normalize(fixture);
    const first = out.find((p) => p.id === '300434061234567');
    expect(first.meta.messageCode).toBe(0);
    expect(first.meta.addresses).toEqual([{ address: 'ops@example.com' }]);
  });
});

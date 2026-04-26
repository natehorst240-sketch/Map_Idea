import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { aisAdapter } from '../../src/adapters/ais.js';

const here = dirname(fileURLToPath(import.meta.url));
const lines = readFileSync(resolve(here, '../fixtures/ais.txt'), 'utf8')
  .split(/\r?\n/)
  .filter((l) => l.trim().length > 0);

const TYPE1 = lines[0]; // !AIVDM,1,1,,A,177KQJ5000G?tO`K>RA1wUbN0TKH,0*5C — gpsd reference
const TYPE18 = lines[1]; // !AIVDM,1,1,,B,B6CdCm0t3`tba35f@V9faHi7kP06,0*58
const FRAG1 = lines[2]; // 2-fragment Type 5 (static voyage data) — fragment 1
const FRAG2 = lines[3]; // 2-fragment Type 5 — fragment 2
const BAD_CHECKSUM = lines[4];

describe('ais adapter', () => {
  beforeEach(() => aisAdapter.reset());

  test('canParse only on AIVDM/AIVDO strings', () => {
    expect(aisAdapter.canParse(TYPE1)).toBe(true);
    expect(aisAdapter.canParse('!AIVDO,1,1,,A,...,0*00')).toBe(true);
    expect(aisAdapter.canParse('hello')).toBe(false);
    expect(aisAdapter.canParse({ aircraft: [] })).toBe(false);
  });

  test('Type 1 — gpsd reference sentence decodes to MMSI 477553000 near Seattle', () => {
    const out = aisAdapter.normalize(TYPE1);
    expect(out).toHaveLength(1);
    const p = out[0];
    expect(p.id).toBe('477553000');
    expect(p.meta.mmsi).toBe(477553000);
    expect(p.meta.type).toBe(1);
    // 47°34.97' N, 122°20.75' W (approximately) — the canonical proof point.
    expect(p.lat).toBeCloseTo(47.5828, 2);
    expect(p.lon).toBeCloseTo(-122.3458, 2);
    // SOG and heading values vary per sentence; just verify they decode to
    // plausible ranges (or null sentinels).
    expect(p.speed === null || (p.speed >= 0 && p.speed < 102.3)).toBe(true);
    expect(p.heading === null || (p.heading >= 0 && p.heading < 360)).toBe(true);
    expect(p.altitude).toBeNull();
    expect(p.source).toBe('ais');
  });

  test('Type 18 — Class B position decodes within Earth bounds', () => {
    const out = aisAdapter.normalize(TYPE18);
    expect(out).toHaveLength(1);
    const p = out[0];
    expect(p.meta.classB).toBe(true);
    expect(p.meta.type).toBe(18);
    expect(Number.isFinite(p.lat)).toBe(true);
    expect(Number.isFinite(p.lon)).toBe(true);
    expect(p.lat).toBeGreaterThanOrEqual(-90);
    expect(p.lat).toBeLessThanOrEqual(90);
    expect(p.lon).toBeGreaterThanOrEqual(-180);
    expect(p.lon).toBeLessThanOrEqual(180);
  });

  test('multi-fragment Type 5 assembles silently and yields no position', () => {
    // Fragment 1 alone — should buffer, no output.
    const partial = aisAdapter.normalize(FRAG1);
    expect(partial).toHaveLength(0);
    // Fragment 2 completes assembly — Type 5 is not a position type, so
    // still no position emitted, but no exception either.
    const complete = aisAdapter.normalize(FRAG2);
    expect(complete).toHaveLength(0);
  });

  test('bad checksum is silently skipped', () => {
    const out = aisAdapter.normalize(BAD_CHECKSUM);
    expect(out).toHaveLength(0);
  });

  test('feeding the full fixture stream parses without exceptions', () => {
    expect(() => aisAdapter.normalize(lines.join('\n'))).not.toThrow();
  });

  test('garbage input is rejected without exception', () => {
    expect(aisAdapter.canParse('GARBAGE LINE')).toBe(false);
    expect(() => aisAdapter.normalize('GARBAGE LINE')).not.toThrow();
  });
});

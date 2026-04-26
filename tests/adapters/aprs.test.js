import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { aprsAdapter } from '../../src/adapters/aprs.js';

const here = dirname(fileURLToPath(import.meta.url));
const restFixture = JSON.parse(readFileSync(resolve(here, '../fixtures/aprs-rest.json'), 'utf8'));
const packetText = readFileSync(resolve(here, '../fixtures/aprs-packets.txt'), 'utf8');

describe('aprs adapter — REST (aprs.fi)', () => {
  test('canParse on result:ok with entries[]', () => {
    expect(aprsAdapter.canParse(restFixture)).toBe(true);
  });

  test('canParse rejects unrelated JSON', () => {
    expect(aprsAdapter.canParse({ result: 'fail' })).toBe(false);
    expect(aprsAdapter.canParse({ aircraft: [], now: 0, messages: 0 })).toBe(false);
  });

  test('parseFloat handles string lat/lng/speed/altitude', () => {
    const out = aprsAdapter.normalize(restFixture);
    expect(out).toHaveLength(2);
    const k7 = out.find((p) => p.id === 'K7XYZ-9');
    expect(k7.lat).toBeCloseTo(40.6125);
    expect(k7.lon).toBeCloseTo(-111.5582);
    expect(k7.altitude).toBeCloseTo(1450 * 3.28084, 1);
    // 65 km/h × 0.539957 ≈ 35.097 kts
    expect(k7.speed).toBeCloseTo(65 * 0.539957, 2);
    expect(k7.heading).toBe(270);
    expect(k7.source).toBe('aprs');
    expect(k7.meta.symbol).toBe('/>');
  });

  test('uses lasttime preferentially for timestamp', () => {
    const out = aprsAdapter.normalize(restFixture);
    const k7 = out.find((p) => p.id === 'K7XYZ-9');
    expect(k7.timestamp).toBe(1714158020);
  });
});

describe('aprs adapter — raw APRS-IS packets', () => {
  test('canParse string packets', () => {
    expect(aprsAdapter.canParse('K7XYZ-9>APRS,WIDE1:!4036.75N/11133.49W>')).toBe(true);
    expect(aprsAdapter.canParse('hello world')).toBe(false);
  });

  test('parses uncompressed position with course/speed/altitude', () => {
    const out = aprsAdapter.normalize(packetText);
    expect(out.length).toBeGreaterThanOrEqual(3);
    const k7 = out.find((p) => p.id === 'K7XYZ-9');
    expect(k7.lat).toBeCloseTo(40 + 36.75 / 60, 4);
    expect(k7.lon).toBeCloseTo(-(111 + 33.49 / 60), 4);
    expect(k7.heading).toBe(270);
    expect(k7.speed).toBe(65);
    expect(k7.altitude).toBe(4750);
    expect(k7.meta.symbolTable).toBe('/');
    expect(k7.meta.symbolCode).toBe('>');
  });

  test('handles timestamped (@) packet by stripping the 7-byte timestamp', () => {
    const out = aprsAdapter.normalize(packetText);
    const n0 = out.find((p) => p.id === 'N0CALL');
    expect(n0).toBeDefined();
    expect(n0.lat).toBeCloseTo(33 + 58.5 / 60, 4);
    expect(n0.lon).toBeCloseTo(-(118 + 20.0 / 60), 4);
    expect(n0.altitude).toBe(1200);
  });

  test('garbage lines silently skipped', () => {
    const out = aprsAdapter.normalize('GARBAGE LINE WITHOUT FORMAT');
    expect(out).toHaveLength(0);
  });

  test('omits course/speed when not present', () => {
    const out = aprsAdapter.normalize('WB7DEF>APRS,WIDE2-2:!4042.69N/11155.93Wk');
    expect(out).toHaveLength(1);
    expect(out[0].heading).toBeNull();
    expect(out[0].speed).toBeNull();
    expect(out[0].altitude).toBeNull();
  });
});

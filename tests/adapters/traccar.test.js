import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { traccarAdapter } from '../../src/adapters/traccar.js';

const here = dirname(fileURLToPath(import.meta.url));
const restFixture = JSON.parse(readFileSync(resolve(here, '../fixtures/traccar-rest.json'), 'utf8'));
const wsFixture = JSON.parse(readFileSync(resolve(here, '../fixtures/traccar-ws.json'), 'utf8'));

describe('traccar adapter', () => {
  test('canParse fingerprints REST array', () => {
    expect(traccarAdapter.canParse(restFixture)).toBe(true);
  });

  test('canParse fingerprints WS positions envelope', () => {
    expect(traccarAdapter.canParse(wsFixture)).toBe(true);
  });

  test('canParse rejects flightdocs / trootrax / adsb shapes', () => {
    expect(traccarAdapter.canParse({ feed: 'trootrax', assets: [] })).toBe(false);
    expect(traccarAdapter.canParse({ aircraft: [], now: 0, messages: 0 })).toBe(false);
    expect(traccarAdapter.canParse({ flights: [{ aircraft: {}, position: {} }] })).toBe(false);
    expect(traccarAdapter.canParse([])).toBe(false);
  });

  test('REST normalize converts metres → feet, drops invalid fixes', () => {
    const out = traccarAdapter.normalize(restFixture);
    expect(out).toHaveLength(2); // GT06 Bike has valid=false
    const truck = out.find((p) => p.id === 'Truck 12');
    expect(truck.altitude).toBeCloseTo(1448 * 3.28084, 1);
    expect(truck.heading).toBe(87);
    expect(truck.speed).toBe(35);
    expect(truck.source).toBe('traccar');
    expect(truck.timestamp).toBeCloseTo(Date.parse('2026-04-26T17:12:30.000+00:00') / 1000, 1);
  });

  test('attributes pass through into meta', () => {
    const out = traccarAdapter.normalize(restFixture);
    const truck = out.find((p) => p.id === 'Truck 12');
    expect(truck.meta.ignition).toBe(true);
    expect(truck.meta.battery).toBe(87);
    expect(truck.meta.odometer).toBe(142500);
    expect(truck.meta.deviceId).toBe(12);
    expect(truck.meta.raw.rssi).toBe(4);
  });

  test('WS envelope normalizes the same way', () => {
    const out = traccarAdapter.normalize(wsFixture);
    expect(out).toHaveLength(1);
    const a = out[0];
    expect(a.id).toBe('Asset-21');
    expect(a.lat).toBeCloseTo(40.7115);
    expect(a.altitude).toBeCloseTo(1605 * 3.28084, 1);
    expect(a.heading).toBe(192);
  });

  test('falls back to traccar-<deviceId> label when deviceName missing', () => {
    const out = traccarAdapter.normalize([
      {
        deviceId: 99,
        fixTime: '2026-04-26T17:00:00Z',
        latitude: 1,
        longitude: 2,
        valid: true,
      },
    ]);
    expect(out[0].id).toBe('traccar-99');
  });
});

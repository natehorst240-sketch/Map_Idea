import { jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { PositionPluginRegistry, buildRegistry } from '../src/registry.js';
import { adsbAdapter } from '../src/adapters/adsb.js';
import { trootraxAdapter } from '../src/adapters/trootrax.js';
import { customAdapter } from '../src/adapters/custom.js';

const here = dirname(fileURLToPath(import.meta.url));
function fx(name) {
  return JSON.parse(readFileSync(resolve(here, `fixtures/${name}.json`), 'utf8'));
}

describe('PositionPluginRegistry', () => {
  test('rejects malformed adapter', () => {
    const r = new PositionPluginRegistry();
    expect(() => r.reg({})).toThrow();
    expect(() => r.reg({ name: 'x', canParse: () => true })).toThrow();
  });

  test('routes payloads to the first matching adapter', () => {
    const reg = buildRegistry({
      adapters: [adsbAdapter, trootraxAdapter, customAdapter],
      colors: { adsb: '#1f77b4' },
    });
    expect(reg.parse(fx('adsb'))).toHaveLength(2);
    expect(reg.parse(fx('trootrax'))).toHaveLength(3);
    expect(reg.parse(fx('custom'))).toHaveLength(2);
  });

  test('returns empty array for unknown payloads', () => {
    const reg = buildRegistry({ adapters: [adsbAdapter] });
    expect(reg.parse({ random: 'thing' })).toEqual([]);
  });

  test('color falls back to default', () => {
    const reg = new PositionPluginRegistry({ colors: { adsb: '#abc' } });
    expect(reg.color('adsb')).toBe('#abc');
    expect(reg.color('unknown')).toBe('#888888');
  });

  test('poll invokes fetchFn at intervals and routes through parse()', async () => {
    const reg = buildRegistry({ adapters: [adsbAdapter] });
    const calls = [];
    const handle = reg.poll(
      () => {
        calls.push('fetch');
        return { now: 1714158000.0, messages: 1, aircraft: [{ hex: 'aa', lat: 1, lon: 2, alt_baro: 100, seen_pos: 0 }] };
      },
      20,
      (positions) => {
        calls.push(['emit', positions.length]);
      },
    );
    await new Promise((r) => setTimeout(r, 70));
    handle.stop();
    expect(calls.filter((c) => c === 'fetch').length).toBeGreaterThanOrEqual(2);
    expect(calls.find((c) => Array.isArray(c) && c[0] === 'emit')).toEqual(['emit', 1]);
  });

  test('poll catches fetch errors and keeps ticking', async () => {
    const reg = buildRegistry({ adapters: [adsbAdapter] });
    let count = 0;
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const handle = reg.poll(
      () => {
        count++;
        throw new Error('boom');
      },
      15,
      () => {},
    );
    await new Promise((r) => setTimeout(r, 50));
    handle.stop();
    spy.mockRestore();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('adapter normalize errors do not propagate', () => {
    const bad = {
      name: 'bad',
      canParse: () => true,
      normalize: () => {
        throw new Error('boom');
      },
    };
    const reg = buildRegistry({ adapters: [bad] });
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(reg.parse({})).toEqual([]);
    spy.mockRestore();
  });
});

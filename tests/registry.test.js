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

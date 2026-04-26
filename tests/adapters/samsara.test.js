import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { samsaraAdapter, startSamsaraFeed } from '../../src/adapters/samsara.js';

const here = dirname(fileURLToPath(import.meta.url));
const snapshot = JSON.parse(readFileSync(resolve(here, '../fixtures/samsara-snapshot.json'), 'utf8'));
const feed = JSON.parse(readFileSync(resolve(here, '../fixtures/samsara-feed.json'), 'utf8'));

describe('samsara adapter', () => {
  test('canParse fingerprints snapshot (singular location)', () => {
    expect(samsaraAdapter.canParse(snapshot)).toBe(true);
  });

  test('canParse fingerprints feed (locations array)', () => {
    expect(samsaraAdapter.canParse(feed)).toBe(true);
  });

  test('canParse rejects unrelated shapes', () => {
    expect(samsaraAdapter.canParse({ data: [] })).toBe(false);
    expect(samsaraAdapter.canParse({ feed: 'trootrax', assets: [] })).toBe(false);
    expect(samsaraAdapter.canParse([])).toBe(false);
  });

  test('snapshot normalize converts MPH → knots, sets altitude null', () => {
    const out = samsaraAdapter.normalize(snapshot);
    expect(out).toHaveLength(2);
    const truck = out.find((p) => p.id === 'F-150 — Truck 7');
    expect(truck.altitude).toBeNull();
    expect(truck.heading).toBe(87);
    // 41.5 mph × 0.868976 ≈ 36.06 kts
    expect(truck.speed).toBeCloseTo(41.5 * 0.868976, 2);
    expect(truck.source).toBe('samsara');
    expect(truck.timestamp).toBeCloseTo(Date.parse('2026-04-26T17:12:30Z') / 1000, 1);
  });

  test('vin/make/model/tags pass through to meta', () => {
    const out = samsaraAdapter.normalize(snapshot);
    const truck = out.find((p) => p.id === 'F-150 — Truck 7');
    expect(truck.meta.vin).toBe('1FTFW1ET5DFC10312');
    expect(truck.meta.make).toBe('Ford');
    expect(truck.meta.model).toBe('F-150');
    expect(truck.meta.tags).toEqual([{ id: '1', name: 'Field Ops' }]);
  });

  test('feed shape emits one position per locations[] entry', () => {
    const out = samsaraAdapter.normalize(feed);
    expect(out).toHaveLength(2);
    expect(out[0].timestamp).toBeLessThan(out[1].timestamp);
    expect(out[0].id).toBe('F-150 — Truck 7');
  });

  test('startSamsaraFeed advances cursor across calls', async () => {
    const calls = [];
    const handle = startSamsaraFeed(
      async (after) => {
        calls.push(after);
        // Stop after the first tick to keep the test deterministic.
        handle.stop();
        return feed;
      },
      () => {},
      { intervalMs: 10 },
    );
    // Wait briefly for the first tick.
    await new Promise((r) => setTimeout(r, 30));
    expect(calls[0]).toBeNull();
    expect(handle.cursor()).toBe('MTcxNDE1ODE5MA==');
  });
});

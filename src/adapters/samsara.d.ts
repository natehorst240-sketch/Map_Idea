import type { Adapter, NormalizedPosition, SamsaraFeedHandle } from '../types.js';

/**
 * Samsara adapter — handles both the snapshot envelope (singular
 * `location`) and the live feed envelope (`locations[]` per vehicle).
 * MPH → knots; altitude is null (Samsara does not report it).
 */
export declare const samsaraAdapter: Adapter;

export interface SamsaraFeedOptions {
  /** Polling interval in ms. Default 5000. */
  intervalMs?: number;
}

/**
 * Cursor-paginated Samsara feed driver. fetchFeed receives the current
 * `after` cursor (null on first call) and should return the parsed JSON
 * response. Advances the cursor automatically on each successful fetch.
 */
export declare function startSamsaraFeed(
  fetchFeed: (after: string | null) => unknown | Promise<unknown>,
  onPositions: (positions: NormalizedPosition[]) => void,
  options?: SamsaraFeedOptions,
): SamsaraFeedHandle;

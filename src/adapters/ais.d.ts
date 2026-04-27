import type { Adapter } from '../types.js';

/**
 * AIS (AIVDM/AIVDO) adapter — Type 1/2/3 (Class A) and Type 18 (Class B)
 * position reports. Multi-fragment messages are buffered per
 * (channel, sequenceId) with a 30s stale timeout.
 */
export declare const aisAdapter: Adapter & {
  reset(): void;
};

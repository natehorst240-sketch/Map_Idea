import type { Adapter } from '../types.js';

/**
 * Garmin inReach IPC Outbound adapter.
 *
 * Filters to messageCode 0 (locate) and 1 (tracking start); ignores text
 * messages, mail-check, and SOS events. Requires an enterprise Garmin
 * Explore / inReach Pro subscription — no free public test endpoint.
 */
export declare const inreachAdapter: Adapter;

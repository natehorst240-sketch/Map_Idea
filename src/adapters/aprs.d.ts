import type { Adapter } from '../types.js';

/**
 * APRS adapter — handles two upstream shapes:
 *   1. aprs.fi REST API (`{ result: "ok", entries: [...] }`).
 *   2. Raw APRS-IS uncompressed position packets
 *      (`CALL>PATH:!DDMM.MMN/DDDMM.MMW...`).
 */
export declare const aprsAdapter: Adapter;

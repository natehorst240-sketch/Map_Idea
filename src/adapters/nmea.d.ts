import type { Adapter } from '../types.js';

/** Optional envelope for multiplexing multiple devices through one adapter. */
export interface NmeaEnvelope {
  source?: 'nmea';
  deviceId?: string;
  sentences: string;
}

/**
 * NMEA 0183 adapter — parses $GPGGA + $GPRMC, validates XOR checksum,
 * accepts GP/GN/GL/BD/GB/GA talker prefixes, merges per-device.
 *
 * Pass either:
 *   - a raw string of newline-separated sentences (default deviceId
 *     "nmea-default"), or
 *   - an `NmeaEnvelope` object with `deviceId` and `sentences`.
 */
export declare const nmeaAdapter: Adapter & {
  reset(): void;
};

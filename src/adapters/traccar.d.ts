import type { Adapter, NormalizedPosition, StopHandle } from '../types.js';

/** Traccar adapter — REST `/api/positions` array or WebSocket envelope. */
export declare const traccarAdapter: Adapter;

export interface TraccarWebSocketOptions {
  /** Cap for exponential backoff between reconnects. Default 30000 ms. */
  maxBackoffMs?: number;
}

/**
 * Open a Traccar `/api/socket` WebSocket and re-emit normalized positions
 * on each `positions` frame. Reconnects with exponential backoff on close
 * or error. Returns a StopHandle.
 */
export declare function connectTraccarWebSocket(
  url: string,
  onPositions: (positions: NormalizedPosition[]) => void,
  options?: TraccarWebSocketOptions,
): StopHandle;

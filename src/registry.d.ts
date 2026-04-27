import type {
  Adapter,
  BuildRegistryOptions,
  NormalizedPosition,
  RegistryOptions,
  StopHandle,
} from './types.js';

export declare class PositionPluginRegistry {
  constructor(options?: RegistryOptions);
  /** Register an adapter. First canParse() match wins. Returns this for chaining. */
  reg(adapter: Adapter): this;
  /** Run a raw payload through the adapters and return normalized positions. */
  parse(raw: unknown): NormalizedPosition[];
  /** Lookup the marker color for a source. Falls back to '#888888'. */
  color(source: string): string;
  /** Set or override the color for a source. */
  setColor(source: string, hex: string): void;
  /** Names of all registered adapters, in registration order. */
  list(): string[];
  /**
   * Live polling. Calls fetchFn at the given cadence, routes the result
   * through parse(), and hands normalized positions to onPositions.
   * Errors are caught and logged — they never break the timer.
   */
  poll(
    fetchFn: () => unknown | Promise<unknown>,
    intervalMs: number,
    onPositions: (positions: NormalizedPosition[]) => void,
  ): StopHandle;
}

export declare function buildRegistry(options?: BuildRegistryOptions): PositionPluginRegistry;

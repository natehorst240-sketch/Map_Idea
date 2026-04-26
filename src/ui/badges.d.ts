import type { PositionPluginRegistry } from '../registry.js';

export interface SourceBadgesOptions {
  /** Called when a badge is clicked, with the toggled visibility state. */
  onToggle?: (source: string, visible: boolean) => void;
}

/** Per-source filter badges. Each badge toggles entity visibility. */
export declare class SourceBadges {
  constructor(rootEl: HTMLElement, registry: PositionPluginRegistry, options?: SourceBadgesOptions);

  /** Re-render with the given source-name → count map. */
  render(counts: Record<string, number>): void;
}

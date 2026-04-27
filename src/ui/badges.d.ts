import type { PositionPluginRegistry } from '../registry.js';

export interface SourceBadgesOptions {
  /** Called when a source is toggled, with the new visibility state. */
  onToggle?: (source: string, visible: boolean) => void;
  /** Button label. Default 'Sources'. */
  label?: string;
}

/**
 * Per-source filter, rendered as a header button that opens a dropdown
 * panel of source toggles. (Class name kept for back-compat — the visual
 * is now a popover, not inline pills.)
 */
export declare class SourceBadges {
  constructor(rootEl: HTMLElement, registry: PositionPluginRegistry, options?: SourceBadgesOptions);

  /** Re-render with the given source-name → count map. */
  render(counts: Record<string, number>): void;

  /** Open or close the dropdown programmatically. */
  setOpen(open: boolean): void;
}

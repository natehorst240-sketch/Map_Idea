import type { NormalizedPosition } from '../types.js';

export type SidebarExportFormat = 'geojson' | 'csv';

export interface SidebarOptions {
  /** Heading shown above the asset list. Default 'Assets'. */
  title?: string;
  /** Restrict the sidebar to a subset of positions (e.g. one category). */
  filter?: (position: NormalizedPosition) => boolean;
  /** Called when the user clicks an asset row. */
  onSelect?: (id: string) => void;
  /**
   * Called when the user clicks an export button. The positions argument
   * is the *scoped* list (after the optional filter), not all positions.
   */
  onExport?: (format: SidebarExportFormat, positions: NormalizedPosition[]) => void;
}

/**
 * Asset list + search filter + GeoJSON/CSV export. Plain DOM, no framework.
 * Pass any container element; the sidebar takes over its innerHTML.
 *
 * Multiple instances may be mounted side-by-side, each with a different
 * `title` and `filter`, to build categorized layouts.
 */
export declare class Sidebar {
  constructor(rootEl: HTMLElement, options?: SidebarOptions);

  /** Re-render the list from the given positions. */
  render(positions: NormalizedPosition[]): void;

  /** Update the heading text after construction. */
  setTitle(title: string): void;
}

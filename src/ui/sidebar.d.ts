import type { NormalizedPosition } from '../types.js';

export type SidebarExportFormat = 'geojson' | 'csv';

export interface SidebarOptions {
  /** Called when the user clicks an asset row. */
  onSelect?: (id: string) => void;
  /** Called when the user clicks an export button. */
  onExport?: (format: SidebarExportFormat, positions: NormalizedPosition[]) => void;
}

/**
 * Asset list + search filter + GeoJSON/CSV export. Plain DOM, no framework.
 * Pass any container element; the sidebar takes over its innerHTML.
 */
export declare class Sidebar {
  constructor(rootEl: HTMLElement, options?: SidebarOptions);

  /** Re-render the list from the given positions. */
  render(positions: NormalizedPosition[]): void;
}

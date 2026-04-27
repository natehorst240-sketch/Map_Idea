// sidebar.js — asset list + selection + search + export.
//
// Multiple Sidebar instances can co-exist on a page. Pass a `title` and a
// `filter` predicate to scope each instance to one category (air assets,
// vehicles, persons, etc.).

export class Sidebar {
  constructor(rootEl, { title, onSelect, onExport, filter } = {}) {
    this.rootEl = rootEl;
    this.title = title || 'Assets';
    this.onSelect = onSelect || (() => {});
    this.onExport = onExport || (() => {});
    this.filter = '';
    this.filterFn = typeof filter === 'function' ? filter : null;
    this.lastPositions = [];
    this.rootEl.classList.add('asset-sidebar');
    this.rootEl.innerHTML = `
      <div class="sidebar-header">
        <h2 data-title>${escapeHtml(this.title)}</h2>
        <span class="sidebar-count" data-count></span>
      </div>
      <div class="sidebar-toolbar">
        <input type="search" class="asset-search" data-search placeholder="Filter by id or label" />
        <div class="sidebar-export">
          <button type="button" class="export-btn" data-export="geojson">GeoJSON</button>
          <button type="button" class="export-btn" data-export="csv">CSV</button>
        </div>
      </div>
      <ul class="asset-list" data-list></ul>
    `;
    this.listEl = this.rootEl.querySelector('[data-list]');
    this.countEl = this.rootEl.querySelector('[data-count]');
    this.searchEl = this.rootEl.querySelector('[data-search]');
    this.searchEl.addEventListener('input', () => {
      this.filter = this.searchEl.value.trim().toLowerCase();
      this.draw();
    });
    for (const btn of this.rootEl.querySelectorAll('[data-export]')) {
      btn.addEventListener('click', () =>
        this.onExport(btn.dataset.export, this.scopedPositions()),
      );
    }
  }

  setTitle(title) {
    this.title = title;
    const el = this.rootEl.querySelector('[data-title]');
    if (el) el.textContent = title;
  }

  render(positions) {
    this.lastPositions = positions;
    this.draw();
  }

  /** Positions after the category-scope filter (used for export). */
  scopedPositions() {
    return this.filterFn ? this.lastPositions.filter(this.filterFn) : this.lastPositions;
  }

  draw() {
    const scoped = this.scopedPositions();
    const filtered = this.filter
      ? scoped.filter(
          (p) =>
            p.id.toString().toLowerCase().includes(this.filter) ||
            p.label.toString().toLowerCase().includes(this.filter),
        )
      : scoped;
    this.countEl.textContent = this.filter
      ? `${filtered.length} / ${scoped.length}`
      : `${filtered.length}`;
    this.listEl.innerHTML = '';
    const sorted = [...filtered].sort((a, b) => a.label.localeCompare(b.label));
    for (const p of sorted) {
      const li = document.createElement('li');
      li.className = 'asset-row';
      li.dataset.id = p.id;
      const altStr = typeof p.altitude === 'number' ? `${Math.round(p.altitude).toLocaleString()} ft` : '—';
      li.innerHTML = `
        <div class="asset-label">${escapeHtml(p.label)}</div>
        <div class="asset-meta">
          <span class="asset-source">${escapeHtml(p.source)}</span>
          <span class="asset-alt">${altStr}</span>
        </div>
      `;
      li.addEventListener('click', () => this.onSelect(p.id));
      this.listEl.appendChild(li);
    }
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

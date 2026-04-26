// sidebar.js — asset list + selection + search + export.

export class Sidebar {
  constructor(rootEl, { onSelect, onExport } = {}) {
    this.rootEl = rootEl;
    this.onSelect = onSelect || (() => {});
    this.onExport = onExport || (() => {});
    this.filter = '';
    this.lastPositions = [];
    this.rootEl.classList.add('asset-sidebar');
    this.rootEl.innerHTML = `
      <div class="sidebar-header">
        <h2>Assets</h2>
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
      btn.addEventListener('click', () => this.onExport(btn.dataset.export, this.lastPositions));
    }
  }

  render(positions) {
    this.lastPositions = positions;
    this.draw();
  }

  draw() {
    const filtered = this.filter
      ? this.lastPositions.filter(
          (p) =>
            p.id.toString().toLowerCase().includes(this.filter) ||
            p.label.toString().toLowerCase().includes(this.filter),
        )
      : this.lastPositions;
    this.countEl.textContent = this.filter
      ? `${filtered.length} / ${this.lastPositions.length}`
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

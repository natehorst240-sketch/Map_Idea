// sidebar.js — asset list + selection. Plain DOM, no framework.

export class Sidebar {
  constructor(rootEl, { onSelect } = {}) {
    this.rootEl = rootEl;
    this.onSelect = onSelect || (() => {});
    this.rootEl.classList.add('asset-sidebar');
    this.rootEl.innerHTML = `
      <div class="sidebar-header">
        <h2>Assets</h2>
        <span class="sidebar-count" data-count></span>
      </div>
      <ul class="asset-list" data-list></ul>
    `;
    this.listEl = this.rootEl.querySelector('[data-list]');
    this.countEl = this.rootEl.querySelector('[data-count]');
  }

  render(positions) {
    this.countEl.textContent = `${positions.length}`;
    this.listEl.innerHTML = '';
    const sorted = [...positions].sort((a, b) => a.label.localeCompare(b.label));
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

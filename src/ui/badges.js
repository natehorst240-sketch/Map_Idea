// badges.js — per-source filter, rendered as a header dropdown popover.
//
// (Class name kept as SourceBadges for backwards compatibility — the visual
// is now a button that opens a panel of source toggles, not inline pills.)

export class SourceBadges {
  constructor(rootEl, registry, { onToggle, label } = {}) {
    this.rootEl = rootEl;
    this.registry = registry;
    this.onToggle = onToggle || (() => {});
    this.label = label || 'Sources';
    this.state = {}; // source -> visible bool
    this.lastCounts = {};
    this.open = false;
    this.rootEl.classList.add('source-dropdown');
    this.rootEl.innerHTML = `
      <button type="button" class="source-toggle" data-toggle>
        <span data-label>${escapeHtml(this.label)}</span>
        <span class="source-summary" data-summary></span>
        <span class="caret">▾</span>
      </button>
      <div class="source-panel" data-panel hidden>
        <div class="source-panel-header">Tracked-by sources</div>
        <ul class="source-panel-list" data-list></ul>
      </div>
    `;
    this.toggleEl = this.rootEl.querySelector('[data-toggle]');
    this.panelEl = this.rootEl.querySelector('[data-panel]');
    this.listEl = this.rootEl.querySelector('[data-list]');
    this.summaryEl = this.rootEl.querySelector('[data-summary]');

    this.toggleEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setOpen(!this.open);
    });
    document.addEventListener('click', (e) => {
      if (this.open && !this.rootEl.contains(e.target)) this.setOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.open) this.setOpen(false);
    });
  }

  setOpen(open) {
    this.open = !!open;
    this.toggleEl.classList.toggle('open', this.open);
    this.panelEl.hidden = !this.open;
  }

  render(counts) {
    this.lastCounts = counts;
    const sources = Object.keys(counts).sort();
    this.listEl.innerHTML = '';
    for (const source of sources) {
      if (this.state[source] === undefined) this.state[source] = true;
      const visible = this.state[source];
      const row = document.createElement('li');
      row.className = `source-row ${visible ? 'on' : 'off'}`;
      const swatch = `<span class="swatch" style="background:${this.registry.color(source)}"></span>`;
      row.innerHTML = `
        ${swatch}
        <span class="source-name">${escapeHtml(source)}</span>
        <span class="source-count">${counts[source]}</span>
        <span class="source-state">${visible ? 'on' : 'off'}</span>
      `;
      row.addEventListener('click', () => {
        this.state[source] = !this.state[source];
        this.onToggle(source, this.state[source]);
        this.render(this.lastCounts);
      });
      this.listEl.appendChild(row);
    }
    this.refreshSummary();
  }

  refreshSummary() {
    const sources = Object.keys(this.lastCounts);
    if (sources.length === 0) {
      this.summaryEl.textContent = '';
      return;
    }
    const on = sources.filter((s) => this.state[s] !== false).length;
    this.summaryEl.textContent = `${on}/${sources.length}`;
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

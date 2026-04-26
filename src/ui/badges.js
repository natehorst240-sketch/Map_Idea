// badges.js — per-source filter badges that toggle entity visibility.

export class SourceBadges {
  constructor(rootEl, registry, { onToggle } = {}) {
    this.rootEl = rootEl;
    this.registry = registry;
    this.onToggle = onToggle || (() => {});
    this.state = {}; // source -> visible bool
    this.rootEl.classList.add('source-badges');
  }

  render(counts) {
    this.rootEl.innerHTML = '';
    const sources = Object.keys(counts).sort();
    for (const source of sources) {
      if (this.state[source] === undefined) this.state[source] = true;
      const visible = this.state[source];
      const badge = document.createElement('button');
      badge.type = 'button';
      badge.className = `badge ${visible ? 'on' : 'off'}`;
      badge.style.borderColor = this.registry.color(source);
      badge.style.color = visible ? '#fff' : this.registry.color(source);
      badge.style.background = visible ? this.registry.color(source) : 'transparent';
      badge.textContent = `${source} (${counts[source]})`;
      badge.addEventListener('click', () => {
        this.state[source] = !this.state[source];
        this.onToggle(source, this.state[source]);
        this.render(counts);
      });
      this.rootEl.appendChild(badge);
    }
  }
}

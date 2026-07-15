// Universal configurator — edits one TV's config from any desktop.
// Every change PATCHes the server and live-syncs to the TV (and any other
// open configurator) over SSE.

const tvId = location.pathname.split('/').filter(Boolean)[0];
const app = document.getElementById('app');

const STYLE_NAMES = { a: 'A · Meridian', b: 'B · Centered', c: 'C · Baseline' };
const STYLES = ['a', 'b', 'c'];

let config = null;
let manifest = [];
let pendingRender = false;

const esc = (s) => String(s ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

// ------------------------------------------------------------------ network

async function patch(obj) {
  applyLocal(config, obj);
  scheduleRender();
  await fetch(`/api/tv/${tvId}/config`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj),
  }).catch(() => {});
}

function applyLocal(base, p) {
  for (const [k, v] of Object.entries(p)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
      applyLocal(base[k], v);
    } else {
      base[k] = v;
    }
  }
}

function pathPatch(path, value) {
  const keys = path.split('.');
  const root = {};
  let cur = root;
  for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]] = {};
  cur[keys[keys.length - 1]] = value;
  return root;
}

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

// ------------------------------------------------------------------- render

function scheduleRender() {
  const ae = document.activeElement;
  if (ae && (ae.tagName === 'INPUT' && ae.type === 'text' || ae.tagName === 'TEXTAREA') && app.contains(ae)) {
    pendingRender = true; // don't clobber what the user is typing
    return;
  }
  render();
}

const chip = (label, active, attrs) => `<button class="chip${active ? ' active' : ''}" ${attrs}>${label}</button>`;
const setChip = (label, path, value, current) =>
  chip(label, JSON.stringify(current) === JSON.stringify(value), `data-action="set" data-path="${path}" data-json='${esc(JSON.stringify(value))}'`);

function schemaField(plugin, field) {
  const base = `plugins.${plugin.id}.${field.key}`;
  const cur = getPath(config, base);
  let control = '';
  if (field.type === 'toggle') {
    control = `<div class="chips">${setChip('On', base, true, !!cur)}${setChip('Off', base, false, !!cur)}</div>`;
  } else if (field.type === 'select') {
    control = `<div class="chips">${field.options.map(([v, lb]) => setChip(esc(lb), base, v, cur)).join('')}</div>`;
  } else if (field.type === 'toggles') {
    control = `<div class="chips">${field.items.map(([k, lb]) => {
      const on = !!getPath(config, `${base}.${k}`);
      return chip(esc(lb), on, `data-action="set" data-path="${base}.${k}" data-json='${JSON.stringify(!on)}'`);
    }).join('')}</div>`;
  } else if (field.type === 'number') {
    control = `<div class="range-row"><input type="range" min="${field.min ?? 0}" max="${field.max ?? 10}" step="1" value="${Number(cur) || 0}" data-action="range" data-path="${base}"><span class="val">${Number(cur) || 0}</span></div>`;
  } else { // text
    control = `<input type="text" value="${esc(cur ?? '')}" data-action="text" data-path="${base}">`;
  }
  return `<div class="label">${esc(field.label)}</div>${control}`;
}

function viewRows() {
  const enabled = config.views;
  const disabled = manifest.map((p) => p.id).filter((id) => !enabled.includes(id));
  const row = (id, idx) => {
    const p = manifest.find((m) => m.id === id) || { id, name: id };
    const on = idx !== null;
    return `<div class="view-row${on ? '' : ' disabled'}">
      <span class="keynum">${on ? idx + 1 : '·'}</span>
      <span class="vname">${esc(p.name)}</span>
      ${p.hasPage ? `<a class="pagelink" href="/${tvId}/plugins/${p.id}">page →</a>` : ''}
      <span class="chips">${STYLES.map((s) =>
        chip(s.toUpperCase(), config.styles.perView[id] === s, `data-action="view-style" data-view="${id}" data-style="${s}" ${on ? '' : 'disabled'}`)
      ).join('')}</span>
      <button class="icon-btn" data-action="view-up" data-view="${id}" ${!on || idx === 0 ? 'disabled' : ''}>↑</button>
      <button class="icon-btn" data-action="view-down" data-view="${id}" ${!on || idx === enabled.length - 1 ? 'disabled' : ''}>↓</button>
      ${chip(on ? 'On' : 'Off', on, `data-action="view-toggle" data-view="${id}"`)}
    </div>`;
  };
  return enabled.map((id, i) => row(id, i)).join('') + disabled.map((id) => row(id, null)).join('');
}

function render() {
  pendingRender = false;
  const c = config;
  app.innerHTML = `
  <header class="page-header">
    <nav class="crumbs"><a href="/">← All TVs</a><a href="/${tvId}" target="_blank">Open TV screen ↗</a></nav>
    <h1>${esc(c.name)} — Configurator</h1>
    <div class="sub">Universal — edit from any desktop, syncs live to the TV. Number keys on the TV follow the order below; 0 shows the config screen, C toggles the style cycle.</div>
  </header>
  <div class="grid">

    <section class="card">
      <h2>TV</h2>
      <div class="label">Name</div>
      <input type="text" value="${esc(c.name)}" data-action="text" data-path="name">
      <div class="label">Clock format</div>
      <div class="chips">${setChip('24-hour', 'clock.format24', true, c.clock.format24)}${setChip('12-hour', 'clock.format24', false, c.clock.format24)}</div>
      <div class="label">Date format</div>
      <div class="chips">
        ${setChip('Wednesday, 15 July', 'clock.dateFormat', 'long', c.clock.dateFormat)}
        ${setChip('Wed 15 Jul', 'clock.dateFormat', 'medium', c.clock.dateFormat)}
        ${setChip('2026-07-15', 'clock.dateFormat', 'iso', c.clock.dateFormat)}
      </div>
      <div class="label">View on power-up</div>
      <div class="chips">${c.views.map((id) => {
        const p = manifest.find((m) => m.id === id);
        return setChip(esc(p ? p.name : id), 'defaultView', id, c.defaultView);
      }).join('')}</div>
    </section>

    <section class="card wide">
      <h2><span class="key">1–9</span>Views &amp; keys</h2>
      ${viewRows()}
      <div class="hint-text">Order = number keys on the TV remote. A/B/C picks the style each view uses when the cycle is off.</div>
    </section>

    <section class="card">
      <h2><span class="key">C</span>Styles &amp; cycle</h2>
      <div class="label">Styles enabled for cycle</div>
      <div class="chips">${STYLES.map((s) => chip(STYLE_NAMES[s], c.styles.enabled.includes(s), `data-action="style-enable" data-style="${s}"`)).join('')}</div>
      <div class="label">Cycle mode</div>
      <div class="chips">
        ${setChip('On', 'cycle.on', true, c.cycle.on)}${setChip('Off', 'cycle.on', false, c.cycle.on)}
        <span class="hint-text">every</span>
        ${[8, 15, 30, 60].map((s) => setChip(s + 's', 'cycle.seconds', s, c.cycle.seconds)).join('')}
      </div>
      <div class="hint-text">When on, the TV rotates the current view through the enabled styles on this timer.</div>
    </section>

    <section class="card">
      <h2>Motion &amp; brightness</h2>
      <div class="label">Motion intensity (anti burn-in drift)</div>
      <div class="range-row"><input type="range" min="0" max="10" step="1" value="${c.motion}" data-action="range" data-path="motion"><span class="val">${c.motion}</span></div>
      <div class="label">Secondary text brightness</div>
      <div class="range-row"><input type="range" min="0.25" max="0.9" step="0.05" value="${c.brightness.secondary}" data-action="range" data-path="brightness.secondary"><span class="val">${c.brightness.secondary}</span></div>
      <div class="label">Tertiary text brightness</div>
      <div class="range-row"><input type="range" min="0.1" max="0.6" step="0.05" value="${c.brightness.tertiary}" data-action="range" data-path="brightness.tertiary"><span class="val">${c.brightness.tertiary}</span></div>
    </section>

    ${manifest.map((p) => `
    <section class="card">
      <h2>${esc(p.name)}${p.hasPage ? ` <a class="pagelink" style="font-family:'Space Mono',monospace;font-size:12px;font-weight:400;color:rgba(255,255,255,.5);text-decoration:none" href="/${tvId}/plugins/${p.id}">manage →</a>` : ''}</h2>
      ${p.description ? `<div class="hint-text">${esc(p.description)}</div>` : ''}
      ${(p.configSchema || []).map((f) => schemaField(p, f)).join('')}
    </section>`).join('')}

  </div>`;
}

// ------------------------------------------------------------------- events

app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const a = el.dataset.action;

  if (a === 'set') {
    patch(pathPatch(el.dataset.path, JSON.parse(el.dataset.json)));
  } else if (a === 'view-toggle') {
    const id = el.dataset.view;
    const views = config.views.includes(id)
      ? config.views.filter((v) => v !== id)
      : [...config.views, id];
    patch({ views });
  } else if (a === 'view-up' || a === 'view-down') {
    const id = el.dataset.view;
    const views = [...config.views];
    const i = views.indexOf(id);
    const j = a === 'view-up' ? i - 1 : i + 1;
    if (i === -1 || j < 0 || j >= views.length) return;
    [views[i], views[j]] = [views[j], views[i]];
    patch({ views });
  } else if (a === 'view-style') {
    patch({ styles: { perView: { [el.dataset.view]: el.dataset.style } } });
  } else if (a === 'style-enable') {
    const s = el.dataset.style;
    let enabled = config.styles.enabled.includes(s)
      ? config.styles.enabled.filter((x) => x !== s)
      : [...STYLES.filter((x) => config.styles.enabled.includes(x) || x === s)];
    if (!enabled.length) enabled = [s]; // never allow an empty cycle pool
    patch({ styles: { enabled } });
  }
});

app.addEventListener('change', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  if (el.dataset.action === 'text') patch(pathPatch(el.dataset.path, el.value));
  if (el.dataset.action === 'range') patch(pathPatch(el.dataset.path, Number(el.value)));
});

app.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.action === 'range') {
    const val = el.parentElement.querySelector('.val');
    if (val) val.textContent = el.value;
  }
});

app.addEventListener('focusout', () => {
  if (pendingRender) setTimeout(() => pendingRender && render(), 100);
});

// --------------------------------------------------------------------- boot

(async function boot() {
  const meta = await fetch(`/api/tv/${tvId}`).then((r) => r.json());
  config = meta.config;
  manifest = meta.manifest;
  document.title = `${config.name} — Configurator`;
  render();

  const es = new EventSource(`/api/tv/${tvId}/events`);
  es.addEventListener('config', (e) => {
    config = JSON.parse(e.data).config;
    scheduleRender();
  });
})();

// TV runtime: boots config + data, loads plugin renderers, handles remote keys,
// live-syncs over SSE, cycles styles, keeps the TV awake and fullscreen.

const tvId = location.pathname.split('/').filter(Boolean)[0];
const stage = document.getElementById('stage');
const hint = document.getElementById('hint');

const state = {
  config: null,
  manifest: [],
  data: {},
  renderers: new Map(),
  view: null, // plugin id or 'config'
  cycleIdx: 0,
  connected: false,
};

// ------------------------------------------------------------------ helpers

const esc = (s) => String(s ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

const pad = (n) => String(n).padStart(2, '0');

const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MO = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function timeVals() {
  const d = new Date();
  const cfg = state.config?.clock || { format24: true, dateFormat: 'long' };
  let hh;
  if (cfg.format24) hh = pad(d.getHours());
  else {
    let x = d.getHours() % 12;
    if (!x) x = 12;
    hh = pad(x);
  }
  let dateLong;
  if (cfg.dateFormat === 'iso') {
    dateLong = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  } else if (cfg.dateFormat === 'medium') {
    dateLong = `${WD[d.getDay()].slice(0, 3)} ${d.getDate()} ${MO[d.getMonth()].slice(0, 3)}`;
  } else {
    dateLong = `${WD[d.getDay()]}, ${d.getDate()} ${MO[d.getMonth()]}`;
  }
  return { hh, mm: pad(d.getMinutes()), ss: pad(d.getSeconds()), dateLong };
}

function calVals() {
  const d = new Date();
  const y = d.getFullYear(), mo = d.getMonth(), today = d.getDate();
  const weekStart = today - d.getDay();
  const weekDays7 = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(y, mo, weekStart + i);
    weekDays7.push({ n: dd.getDate(), today: dd.getDate() === today && dd.getMonth() === mo });
  }
  const onejan = new Date(y, 0, 1);
  const weekNo = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
  return { month: MO[mo], year: y, day: today, weekday: WD[d.getDay()], weekNo, weekDays7 };
}

// Elements tagged data-clk are updated in place every second, so CSS drift
// animations never restart between renders.
const clk = (name) => `<span data-clk="${name}">${esc(timeVals()[name])}</span>`;

function updateClock() {
  const t = timeVals();
  for (const el of stage.querySelectorAll('[data-clk]')) {
    const v = t[el.dataset.clk];
    if (v !== undefined && el.textContent !== v) el.textContent = v;
  }
}

// ------------------------------------------------------------------- render

function currentStyle() {
  const st = state.config.styles;
  if (state.config.cycle?.on && st.enabled?.length) {
    return st.enabled[state.cycleIdx % st.enabled.length];
  }
  return st.perView?.[state.view] || 'a';
}

function ctxFor(view, style) {
  return {
    style,
    cfg: state.config.plugins?.[view] || {},
    data: state.data[view],
    tv: state.config,
    g: {
      esc, clk, pad,
      time: timeVals(),
      cal: calVals(),
      // shorthand for the two dimmed text tones (config-driven brightness cap)
      S: 'rgba(255,255,255,var(--sec))',
      T: 'rgba(255,255,255,var(--ter))',
    },
  };
}

function configScreen() {
  const g = { S: 'rgba(255,255,255,var(--sec))', T: 'rgba(255,255,255,var(--ter))' };
  const url = `${location.origin}/${tvId}/config`;
  const keys = (state.config.views || []).map((v, i) => {
    const p = state.manifest.find((m) => m.id === v);
    return `<div style="display:flex;gap:28px;font-size:34px"><span style="width:60px;color:${g.T};font-variant-numeric:tabular-nums">${i + 1}</span><span>${esc(p ? p.name : v)}</span></div>`;
  }).join('');
  return `
  <div style="position:absolute;inset:0;padding:120px;display:flex;flex-direction:column;justify-content:space-between;animation:drift 90s ease-in-out infinite alternate">
    <div style="display:flex;justify-content:space-between;font-size:22px;letter-spacing:.36em;text-transform:uppercase">
      <span style="color:${g.S}">Configuration</span><span style="color:${g.T}">${esc(state.config.name)}</span>
    </div>
    <div>
      <div style="font-size:84px;font-weight:600;letter-spacing:-.02em;max-width:1500px">Settings sync from any desktop</div>
      <div style="margin-top:36px;font-family:'Space Mono',monospace;font-size:44px;color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:14px;padding:26px 34px;display:inline-block">${esc(url)}</div>
      <div style="margin-top:30px;font-size:30px;color:${g.S};max-width:1400px;line-height:1.45">Changes appear on this screen instantly — no reload needed.</div>
    </div>
    <div style="display:flex;gap:110px;align-items:flex-end">
      <div style="display:flex;flex-direction:column;gap:16px">${keys}</div>
      <div style="font-size:24px;color:${g.T};line-height:1.7">0 — this screen<br>C — toggle style cycle<br>&larr; &rarr; — previous / next view</div>
    </div>
  </div>`;
}

function waitingScreen(label) {
  return `
  <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;animation:breathe 7s ease-in-out infinite alternate">
    <div style="font-family:'Space Mono',monospace;font-size:26px;letter-spacing:.3em;text-transform:uppercase;color:rgba(255,255,255,var(--ter))">${esc(label)}</div>
  </div>`;
}

function render() {
  if (!state.config) return;
  let html;
  if (state.view === 'config') {
    html = configScreen();
  } else {
    const renderer = state.renderers.get(state.view);
    const data = state.data[state.view];
    if (!renderer) html = waitingScreen(`${state.view} — no renderer`);
    else if (!data) html = waitingScreen('Waiting for data');
    else {
      const style = currentStyle();
      const fn = renderer.render[style] || renderer.render.a;
      try {
        html = fn(ctxFor(state.view, style));
      } catch (err) {
        console.error(`render ${state.view}/${style}:`, err);
        html = waitingScreen('Render error — see console');
      }
    }
  }
  stage.innerHTML = html;
  updateClock();
}

function applyVars() {
  const c = state.config;
  const amp = (c.motion ?? 6) * 2;
  stage.style.setProperty('--amp', amp + 'px');
  stage.style.setProperty('--amp2', Math.max(2, Math.round(amp / 2)) + 'px');
  stage.style.setProperty('--sec', c.brightness?.secondary ?? 0.55);
  stage.style.setProperty('--ter', c.brightness?.tertiary ?? 0.3);
}

// -------------------------------------------------------------- style cycle

let cycleTimer = null;
function restartCycle() {
  clearInterval(cycleTimer);
  cycleTimer = null;
  const cy = state.config?.cycle;
  if (!cy?.on) return;
  cycleTimer = setInterval(() => {
    state.cycleIdx++;
    render();
  }, Math.max(3, cy.seconds || 15) * 1000);
}

// --------------------------------------------------------------------- keys

function setView(view) {
  if (view === state.view) return;
  state.view = view;
  render();
}

async function toggleCycle() {
  const on = !state.config.cycle?.on;
  await fetch(`/api/tv/${tvId}/config`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cycle: { on } }),
  }).catch(() => {});
  flashHint(on ? 'Style cycle on' : 'Style cycle off');
}

function stepView(delta) {
  const views = state.config.views || [];
  if (!views.length) return;
  const i = views.indexOf(state.view);
  const next = i === -1 ? 0 : (i + delta + views.length) % views.length;
  setView(views[next]);
}

document.addEventListener('keydown', (e) => {
  interact();
  if (e.key >= '0' && e.key <= '9') {
    const n = +e.key;
    if (n === 0) setView('config');
    else if (state.config?.views?.[n - 1]) setView(state.config.views[n - 1]);
  } else if (e.key === 'c' || e.key === 'C') {
    toggleCycle();
  } else if (e.key === 'ArrowUp') {
    stepView(1);
  } else if (e.key === 'ArrowDown') {
    stepView(-1);
  }
});

// ------------------------------------------- fullscreen / wake lock / hints

let wakeLock = null;
async function ensureWakeLock() {
  if (wakeLock || !('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch { /* not fatal — the hidden video covers it */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') ensureWakeLock();
});

function startWakeVideo() {
  const v = document.getElementById('wakevideo');
  // Play a real, looping, full-viewport video file through the hardware decoder.
  // On webOS this is the one thing that actually holds off the TV screensaver —
  // a canvas.captureStream or a hidden/tiny element isn't treated as fullscreen
  // video playback by the TV's power manager, so those never suppressed it.
  if (!v.src) v.src = '/assets/blank.mp4';
  v.play().catch(() => { /* retried on first interaction */ });
}

function goFullscreen() {
  if (document.fullscreenElement || document.webkitFullscreenElement) return;
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (req) {
    try {
      const p = req.call(el);
      p?.catch?.(() => {});
    } catch { /* needs a user gesture on most TVs */ }
  }
}

let hintTimer = null;
function flashHint(text, ms = 2500) {
  hint.textContent = text;
  hint.classList.add('show');
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => hint.classList.remove('show'), ms);
}

function interact() {
  goFullscreen();
  ensureWakeLock();
  document.getElementById('wakevideo').play().catch(() => {});
  hint.classList.remove('show');
}
document.addEventListener('click', interact);
document.addEventListener('touchend', interact);

// hide cursor when idle
let cursorTimer = null;
document.addEventListener('mousemove', () => {
  document.body.classList.remove('hide-cursor');
  clearTimeout(cursorTimer);
  cursorTimer = setTimeout(() => document.body.classList.add('hide-cursor'), 3000);
});
document.body.classList.add('hide-cursor');

// ------------------------------------------------------------------ scaling

function fit() {
  stage.style.setProperty('--fit-scale', Math.min(innerWidth / 1920, innerHeight / 1080));
}
addEventListener('resize', fit);
fit();

// ------------------------------------------------------------------- events

function connectSSE() {
  const es = new EventSource(`/api/tv/${tvId}/events`);
  es.addEventListener('config', (e) => {
    const { config, data } = JSON.parse(e.data);
    applyState(config, data);
  });
  es.addEventListener('data', (e) => {
    const { plugin, payload } = JSON.parse(e.data);
    state.data[plugin] = payload;
    if (state.view === plugin) render();
  });
  es.onopen = () => {
    // After a reconnect, resync everything we may have missed.
    if (state.connected) refresh();
    state.connected = true;
  };
  es.onerror = () => { /* EventSource reconnects automatically */ };
}

function applyState(config, data) {
  const firstLoad = !state.config;
  state.config = config;
  if (data) state.data = data;
  document.title = config.name || tvId;
  if (firstLoad) {
    // ?view=weather overrides the configured power-up view (handy for deep links)
    const qv = new URLSearchParams(location.search).get('view');
    if (qv && (config.views.includes(qv) || qv === 'config')) state.view = qv;
    else state.view = config.views.includes(config.defaultView) ? config.defaultView : (config.views[0] || 'config');
  } else if (state.view !== 'config' && !config.views.includes(state.view)) {
    state.view = config.views[0] || 'config';
  }
  applyVars();
  restartCycle();
  render();
}

async function refresh() {
  const [meta, data] = await Promise.all([
    fetch(`/api/tv/${tvId}`).then((r) => r.json()),
    fetch(`/api/tv/${tvId}/data`).then((r) => r.json()),
  ]);
  state.manifest = meta.manifest;
  await loadRenderers(meta.manifest);
  applyState(meta.config, data);
}

async function loadRenderers(manifest) {
  await Promise.all(manifest.map(async (p) => {
    if (state.renderers.has(p.id)) return;
    try {
      const mod = await import(`/plugins/${p.id}/client.js`);
      if (mod.default?.render) state.renderers.set(p.id, mod.default);
    } catch (err) {
      console.warn(`no client renderer for plugin "${p.id}"`, err);
    }
  }));
}

// --------------------------------------------------------------------- boot

(async function boot() {
  startWakeVideo();
  ensureWakeLock();
  await refresh();
  connectSSE();
  setInterval(updateClock, 1000);
  // re-render at midnight so date-derived values (calendar grid) flip over
  let lastDay = new Date().getDate();
  setInterval(() => {
    if (new Date().getDate() !== lastDay) {
      lastDay = new Date().getDate();
      render();
    }
  }, 30_000);
  flashHint('1–9 views · 0 config · C style cycle — press any button for fullscreen', 8000);
})();

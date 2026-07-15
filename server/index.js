// OLED TV Dashboard server — zero dependencies (Node >= 18).
// Serves any number of TVs at /:tvId (e.g. /tv1, /tv2), each with its own
// persisted config, live-synced over SSE to the TV and any open config pages.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store, deepMerge } from './store.js';
import { SSEHub } from './sse.js';
import { loadPlugins } from './plugins.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';

const store = new Store(path.join(ROOT, 'data'));
const hub = new SSEHub();

const { plugins, apiRoutes } = await loadPlugins(path.join(__dirname, 'plugins'), {
  store,
  hub,
  broadcastData,
});

// ---------------------------------------------------------------- TV config

const RESERVED = new Set(['api', 'core', 'assets', 'plugins', 'favicon.ico', 'index.html']);
const TV_ID_RE = /^[a-zA-Z0-9_-]{1,32}$/;

function defaultTVConfig(id) {
  const pluginCfg = {};
  for (const p of plugins.values()) pluginCfg[p.id] = structuredClone(p.defaultConfig || {});
  return {
    name: id.toUpperCase(),
    // Order = number keys: views[0] is key 1, views[1] key 2, ... Key 0 = config screen.
    views: ['weather', 'todo', 'note', 'time', 'calendar', 'f1'].filter((v) => plugins.has(v)),
    defaultView: 'time',
    clock: { format24: true, dateFormat: 'long' }, // long | medium | iso
    brightness: { secondary: 0.55, tertiary: 0.3 },
    motion: 6, // 0..10 anti-burn-in drift amplitude
    styles: {
      enabled: ['a', 'b', 'c'],
      perView: { time: 'a', weather: 'b', todo: 'b', note: 'b', calendar: 'a', f1: 'c' },
    },
    cycle: { on: false, seconds: 15 },
    plugins: pluginCfg,
  };
}

function getTVConfig(id, { create = false } = {}) {
  let cfg = store.getTV(id);
  if (!cfg) {
    if (!create) return null;
    cfg = defaultTVConfig(id);
    store.setTV(id, cfg);
  }
  // Merge in defaults so new plugin options appear on existing TVs.
  return deepMerge(defaultTVConfig(id), cfg);
}

function manifest() {
  return [...plugins.values()].map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description || '',
    hasPage: !!p.hasPage,
    configSchema: p.configSchema || [],
  }));
}

// ------------------------------------------------------------ data payloads

async function tvData(tvConfig) {
  const data = {};
  for (const p of plugins.values()) {
    if (typeof p.getData !== 'function') continue;
    try {
      data[p.id] = await p.getData(tvConfig.plugins[p.id] || {}, { store, tv: tvConfig });
    } catch (err) {
      console.error(`[${p.id}] getData failed:`, err.message);
      data[p.id] = { error: err.message };
    }
  }
  return data;
}

const payloadCache = new Map(); // `${tvId}:${pluginId}` -> JSON string

async function broadcastData(pluginId) {
  const plugin = plugins.get(pluginId);
  if (!plugin || typeof plugin.getData !== 'function') return;
  for (const tvId of hub.connectedTvIds()) {
    const cfg = getTVConfig(tvId, { create: true });
    try {
      const payload = await plugin.getData(cfg.plugins[pluginId] || {}, { store, tv: cfg });
      payloadCache.set(`${tvId}:${pluginId}`, JSON.stringify(payload));
      hub.send(tvId, 'data', { plugin: pluginId, payload });
    } catch (err) {
      console.error(`[${pluginId}] broadcast failed:`, err.message);
    }
  }
}

async function broadcastConfig(tvId) {
  const cfg = getTVConfig(tvId, { create: true });
  const data = await tvData(cfg);
  for (const [pid, payload] of Object.entries(data)) {
    payloadCache.set(`${tvId}:${pid}`, JSON.stringify(payload));
  }
  hub.send(tvId, 'config', { config: cfg, data });
}

// Periodic refresh: countdown rollovers, mock weather progression, date flips.
setInterval(async () => {
  for (const tvId of hub.connectedTvIds()) {
    const cfg = getTVConfig(tvId, { create: true });
    for (const p of plugins.values()) {
      if (typeof p.getData !== 'function') continue;
      try {
        const payload = await p.getData(cfg.plugins[p.id] || {}, { store, tv: cfg });
        const key = `${tvId}:${p.id}`;
        const json = JSON.stringify(payload);
        if (payloadCache.get(key) !== json) {
          payloadCache.set(key, json);
          hub.send(tvId, 'data', { plugin: p.id, payload });
        }
      } catch { /* logged by tvData path */ }
    }
  }
}, 60_000).unref?.();

// ----------------------------------------------------------------- routing

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function sendJSON(res, obj, status = 200) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function sendFile(res, file, status = 200) {
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(status, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(buf);
  });
}

function readBody(req, limit = 1_000_000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve(null);
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

// Match '/api/plugins/todo/items/:id' style patterns against a path.
function matchPattern(pattern, pathname) {
  const p = pattern.split('/').filter(Boolean);
  const s = pathname.split('/').filter(Boolean);
  if (p.length !== s.length) return null;
  const params = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(s[i]);
    else if (p[i] !== s[i]) return null;
  }
  return params;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  try {
    // ---- API ----
    if (pathname.startsWith('/api/')) {
      // Plugin-provided routes first (most specific namespace).
      for (const route of apiRoutes) {
        if (req.method !== route.method) continue;
        const params = matchPattern(route.pattern, pathname);
        if (!params) continue;
        const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readBody(req) : null;
        await route.handler(req, res, { params, body, query: url.searchParams, json: sendJSON });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/tvs') {
        const connected = new Set(hub.connectedTvIds());
        return sendJSON(res, store.tvIds().map((id) => ({
          id,
          name: getTVConfig(id).name,
          connected: connected.has(id),
        })));
      }

      let m;
      if ((m = matchPattern('/api/tv/:id', pathname)) && req.method === 'GET') {
        const cfg = getTVConfig(m.id, { create: true });
        return sendJSON(res, { id: m.id, config: cfg, manifest: manifest() });
      }
      if ((m = matchPattern('/api/tv/:id/config', pathname)) && req.method === 'PATCH') {
        const patch = await readBody(req);
        if (!patch || typeof patch !== 'object') return sendJSON(res, { error: 'JSON object body required' }, 400);
        const merged = deepMerge(getTVConfig(m.id, { create: true }), patch);
        store.setTV(m.id, merged);
        await broadcastConfig(m.id);
        return sendJSON(res, { ok: true, config: merged });
      }
      if ((m = matchPattern('/api/tv/:id/data', pathname)) && req.method === 'GET') {
        const cfg = getTVConfig(m.id, { create: true });
        return sendJSON(res, await tvData(cfg));
      }
      if ((m = matchPattern('/api/tv/:id/events', pathname)) && req.method === 'GET') {
        hub.add(m.id, res);
        return;
      }
      return sendJSON(res, { error: 'Not found' }, 404);
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return sendJSON(res, { error: 'Method not allowed' }, 405);
    }

    // ---- Static ----
    if (pathname === '/' ) return sendFile(res, path.join(PUBLIC, 'index.html'));
    if (pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }
    if (pathname.startsWith('/core/') || pathname.startsWith('/assets/')) {
      const file = path.normalize(path.join(PUBLIC, pathname));
      if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
      return sendFile(res, file);
    }

    // ---- Plugin client scripts ----
    let m;
    if ((m = matchPattern('/plugins/:pid/client.js', pathname))) {
      const p = plugins.get(m.pid);
      if (!p) return sendJSON(res, { error: 'Unknown plugin' }, 404);
      return sendFile(res, p.clientFile);
    }

    // ---- TV pages ----
    const seg = pathname.split('/').filter(Boolean);
    if (seg.length >= 1 && TV_ID_RE.test(seg[0]) && !RESERVED.has(seg[0])) {
      const tvId = seg[0];
      if (seg.length === 1) {
        getTVConfig(tvId, { create: true }); // visiting a TV url creates it
        return sendFile(res, path.join(PUBLIC, 'tv.html'));
      }
      if (seg.length === 2 && seg[1] === 'config') {
        getTVConfig(tvId, { create: true });
        return sendFile(res, path.join(PUBLIC, 'config.html'));
      }
      if (seg.length === 3 && seg[1] === 'plugins') {
        const p = plugins.get(seg[2]);
        if (p && p.hasPage) return sendFile(res, path.join(p.dir, 'page.html'));
      }
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  } catch (err) {
    console.error('request error:', err);
    if (!res.headersSent) sendJSON(res, { error: err.message }, 500);
    else res.end();
  }
});

server.listen(PORT, HOST, () => {
  console.log(`OLED TV Dashboard`);
  console.log(`  TV:      http://127.0.0.1:${PORT}/tv1  (any /<id> creates a TV)`);
  console.log(`  Config:  http://127.0.0.1:${PORT}/tv1/config`);
  console.log(`  Plugins: ${[...plugins.keys()].join(', ')}`);
});

// Plugin loader. A plugin is a directory under server/plugins/<id>/ containing:
//   index.js   (required) — server module, default export:
//     {
//       id, name, description,
//       defaultConfig: {...},          // per-TV plugin config defaults
//       configSchema: [...],           // fields rendered on the common config page
//       hasPage: true|false,           // serves page.html at /:tv/plugins/<id>
//       getData(cfg, ctx) -> payload,  // data pushed to TVs (cfg = per-TV plugin config)
//       api(register, ctx),            // optional REST endpoints under /api/plugins/<id>/
//       init(ctx),                     // optional one-time setup (seed data, timers)
//     }
//   client.js  (required) — browser renderer, served at /plugins/<id>/client.js
//   page.html  (optional) — dedicated management page
//
// Drop a new directory in and restart — nothing else to wire up.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function loadPlugins(dir, ctx) {
  const plugins = new Map();
  const apiRoutes = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const pdir = path.join(dir, entry.name);
    const indexFile = path.join(pdir, 'index.js');
    if (!fs.existsSync(indexFile)) continue;

    const mod = (await import(pathToFileURL(indexFile).href)).default;
    if (!mod || !mod.id) {
      console.warn(`[plugins] skipping ${entry.name}: no default export with id`);
      continue;
    }
    mod.dir = pdir;
    mod.hasPage = fs.existsSync(path.join(pdir, 'page.html'));
    mod.clientFile = path.join(pdir, 'client.js');

    const pluginCtx = {
      ...ctx,
      // push fresh data for this plugin to every connected TV
      broadcast: () => ctx.broadcastData(mod.id),
    };
    if (typeof mod.api === 'function') {
      mod.api((method, subpath, handler) => {
        apiRoutes.push({
          method: method.toUpperCase(),
          pattern: `/api/plugins/${mod.id}${subpath}`,
          handler: (req, res, helpers) => handler(req, res, { ...helpers, ctx: pluginCtx }),
        });
      }, pluginCtx);
    }
    if (typeof mod.init === 'function') await mod.init(pluginCtx);
    plugins.set(mod.id, mod);
    console.log(`[plugins] loaded: ${mod.id} (${mod.name})`);
  }

  return { plugins, apiRoutes };
}

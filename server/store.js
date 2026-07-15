// JSON-file persistence. One file per TV config, one file per plugin's shared data.
import fs from 'node:fs';
import path from 'node:path';

export class Store {
  constructor(dir) {
    this.dir = dir;
    this.tvDir = path.join(dir, 'tvs');
    this.pluginDir = path.join(dir, 'plugins');
    fs.mkdirSync(this.tvDir, { recursive: true });
    fs.mkdirSync(this.pluginDir, { recursive: true });
  }

  _read(file, fallback) {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return fallback;
    }
  }

  _write(file, obj) {
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
    fs.renameSync(tmp, file);
  }

  tvIds() {
    return fs.readdirSync(this.tvDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.slice(0, -5))
      .sort();
  }

  getTV(id) {
    return this._read(path.join(this.tvDir, id + '.json'), null);
  }

  setTV(id, config) {
    this._write(path.join(this.tvDir, id + '.json'), config);
  }

  getPluginData(pluginId, fallback) {
    return this._read(path.join(this.pluginDir, pluginId + '.json'), fallback);
  }

  setPluginData(pluginId, data) {
    this._write(path.join(this.pluginDir, pluginId + '.json'), data);
  }
}

// Objects merge recursively; arrays and scalars replace.
export function deepMerge(base, patch) {
  if (Array.isArray(patch) || typeof patch !== 'object' || patch === null) return patch;
  if (typeof base !== 'object' || base === null || Array.isArray(base)) base = {};
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) out[k] = deepMerge(base[k], v);
  return out;
}

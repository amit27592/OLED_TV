// Featured Note view + editor page (/:tv/plugins/note).
// The note content is shared; showing the author line is per-TV config.

const DEFAULT_NOTE = {
  kicker: 'Featured Note',
  title: 'Make the wall disappear.',
  body: 'If someone glances up from the couch and just feels a little calmer, it worked. Nothing to click, nothing to read — only the room, quieter.',
  author: '— Amit Gupta',
  dateLabel: 'Jul 2026',
};

function load(store) {
  return store.getPluginData('note', { ...DEFAULT_NOTE });
}

export default {
  id: 'note',
  name: 'Note',
  description: 'A single featured note or quote, with optional author line.',
  defaultConfig: { showAuthor: true },
  configSchema: [
    { key: 'showAuthor', label: 'Author line', type: 'toggle' },
  ],

  getData(cfg, { store }) {
    return { note: load(store), showAuthor: !!cfg.showAuthor };
  },

  api(register) {
    register('GET', '/content', (req, res, { json, ctx }) => {
      json(res, load(ctx.store));
    });
    register('PUT', '/content', (req, res, { body, json, ctx }) => {
      if (!body || typeof body !== 'object') return json(res, { error: 'JSON body required' }, 400);
      const note = load(ctx.store);
      for (const k of ['kicker', 'title', 'body', 'author', 'dateLabel']) {
        if (typeof body[k] === 'string') note[k] = body[k].slice(0, k === 'body' ? 600 : 160);
      }
      ctx.store.setPluginData('note', note);
      ctx.broadcast();
      json(res, note);
    });
  },
};

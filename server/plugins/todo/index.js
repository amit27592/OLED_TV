// To-Do view + task manager page (/:tv/plugins/todo).
// Tasks are shared across all TVs; grouping treatment is per-TV config.
import crypto from 'node:crypto';

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayDiff(dueStr) {
  const [y, m, d] = dueStr.split('-').map(Number);
  const due = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((due - today) / 86400000);
}

function decorate(item) {
  let when = 'today';
  let meta = 'Anytime';
  if (item.done) {
    meta = 'Done';
    when = item.due ? whenFor(item.due) : 'today';
  } else if (item.due) {
    when = whenFor(item.due);
    const diff = dayDiff(item.due);
    if (diff < 0) meta = diff === -1 ? 'Yesterday' : `${-diff} days ago`;
    else if (diff === 0) meta = 'Today';
    else if (diff === 1) meta = 'Tomorrow';
    else if (diff < 7) meta = WD[new Date(item.due + 'T12:00').getDay()];
    else {
      const d = new Date(item.due + 'T12:00');
      meta = `${WD[d.getDay()]} ${d.getDate()} ${MO[d.getMonth()]}`;
    }
  }
  return { ...item, when, meta };
}

function whenFor(dueStr) {
  const diff = dayDiff(dueStr);
  return diff < 0 ? 'overdue' : diff === 0 ? 'today' : 'upcoming';
}

function load(store) {
  return store.getPluginData('todo', { items: [] });
}

function save(store, data) {
  store.setPluginData('todo', data);
}

export default {
  id: 'todo',
  name: 'To-Do',
  description: 'Task list with Overdue/Today/Upcoming, priority and progress treatments.',
  defaultConfig: {
    variant: 'grouped', // flat | grouped | priority | progress
    maxItems: 7,
  },
  configSchema: [
    {
      key: 'variant', label: 'Treatment', type: 'select',
      options: [['flat', 'Today only'], ['grouped', 'Overdue / Today / Upcoming'], ['priority', 'By priority'], ['progress', 'Progress']],
    },
    { key: 'maxItems', label: 'Max items on screen', type: 'number', min: 3, max: 14 },
  ],

  init({ store }) {
    // Seed sample tasks on first run.
    const data = load(store);
    if (data.items.length || data.seeded) return;
    const day = (offset) => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      return localDateStr(d);
    };
    data.items = [
      { text: 'Renew car registration', due: day(-2), priority: 'high', done: false },
      { text: 'Reply to Priya re: the lease', due: day(0), priority: 'high', done: false },
      { text: 'Ship OLED dashboard v1', due: day(0), priority: 'med', done: false },
      { text: 'Groceries — oat milk, eggs, greens', due: day(0), priority: 'low', done: false },
      { text: 'Standup notes for Q3 sync', due: day(0), priority: 'med', done: true },
      { text: 'Book dentist appointment', due: day(2), priority: 'med', done: false },
      { text: 'Read TRMNL device API docs', due: day(3), priority: 'low', done: false },
    ].map((t) => ({ id: crypto.randomUUID(), createdAt: Date.now(), ...t }));
    data.seeded = true;
    save(store, data);
  },

  getData(cfg, { store }) {
    return { items: load(store).items.map(decorate) };
  },

  api(register) {
    register('GET', '/items', (req, res, { json, ctx }) => {
      json(res, load(ctx.store).items.map(decorate));
    });

    register('POST', '/items', (req, res, { body, json, ctx }) => {
      if (!body?.text?.trim()) return json(res, { error: 'text required' }, 400);
      const data = load(ctx.store);
      const item = {
        id: crypto.randomUUID(),
        text: String(body.text).trim().slice(0, 200),
        due: body.due || null,
        priority: ['high', 'med', 'low'].includes(body.priority) ? body.priority : 'med',
        done: false,
        createdAt: Date.now(),
      };
      data.items.push(item);
      save(ctx.store, data);
      ctx.broadcast();
      json(res, decorate(item), 201);
    });

    register('PATCH', '/items/:id', (req, res, { params, body, json, ctx }) => {
      const data = load(ctx.store);
      const item = data.items.find((i) => i.id === params.id);
      if (!item) return json(res, { error: 'not found' }, 404);
      if (typeof body?.text === 'string') item.text = body.text.trim().slice(0, 200);
      if ('due' in (body || {})) item.due = body.due || null;
      if (['high', 'med', 'low'].includes(body?.priority)) item.priority = body.priority;
      if (typeof body?.done === 'boolean') item.done = body.done;
      save(ctx.store, data);
      ctx.broadcast();
      json(res, decorate(item));
    });

    register('DELETE', '/items/:id', (req, res, { params, json, ctx }) => {
      const data = load(ctx.store);
      const before = data.items.length;
      data.items = data.items.filter((i) => i.id !== params.id);
      if (data.items.length === before) return json(res, { error: 'not found' }, 404);
      save(ctx.store, data);
      ctx.broadcast();
      json(res, { ok: true });
    });
  },
};

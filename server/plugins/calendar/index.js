// Calendar view + event manager page (/:tv/plugins/calendar).
// Events are shared across TVs. To wire a real calendar (CalDAV/ICS/Google),
// replace load() with your feed and keep the {date, time, name} shape.
import crypto from 'node:crypto';

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function load(store) {
  return store.getPluginData('calendar', { events: [] });
}

function save(store, data) {
  store.setPluginData('calendar', data);
}

export default {
  id: 'calendar',
  name: 'Calendar',
  description: 'Big date with today’s agenda (upcoming events fill in when today is empty).',
  defaultConfig: { maxAgenda: 4 },
  configSchema: [
    { key: 'maxAgenda', label: 'Agenda items on screen', type: 'number', min: 0, max: 8 },
  ],

  init({ store }) {
    const data = load(store);
    if (data.events.length || data.seeded) return;
    const day = (offset) => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      return localDateStr(d);
    };
    data.events = [
      { date: day(0), time: '09:30', name: 'Standup' },
      { date: day(0), time: '13:00', name: 'Lunch with Sam' },
      { date: day(0), time: '16:00', name: 'Design review' },
      { date: day(0), time: '19:30', name: 'Yoga' },
      { date: day(1), time: '11:00', name: 'Dentist' },
      { date: day(4), time: '18:00', name: 'Dinner — Nari' },
    ].map((e) => ({ id: crypto.randomUUID(), ...e }));
    data.seeded = true;
    save(store, data);
  },

  getData(cfg, { store }) {
    const today = localDateStr();
    const events = [...load(store).events].sort((a, b) =>
      (a.date + a.time).localeCompare(b.date + b.time));
    const max = Math.max(0, Number(cfg.maxAgenda ?? 4));
    let agenda = events.filter((e) => e.date === today);
    let agendaLabel = 'today';
    if (!agenda.length) {
      agenda = events.filter((e) => e.date > today);
      agendaLabel = 'upcoming';
    }
    return {
      agenda: agenda.slice(0, max).map((e) => ({ t: e.time, name: e.name, date: e.date })),
      agendaLabel,
    };
  },

  api(register) {
    register('GET', '/events', (req, res, { json, ctx }) => {
      const events = [...load(ctx.store).events].sort((a, b) =>
        (a.date + a.time).localeCompare(b.date + b.time));
      json(res, events);
    });
    register('POST', '/events', (req, res, { body, json, ctx }) => {
      if (!body?.name?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(body?.date || '')) {
        return json(res, { error: 'name and date (YYYY-MM-DD) required' }, 400);
      }
      const data = load(ctx.store);
      const event = {
        id: crypto.randomUUID(),
        date: body.date,
        time: /^\d{2}:\d{2}$/.test(body.time || '') ? body.time : '09:00',
        name: String(body.name).trim().slice(0, 120),
      };
      data.events.push(event);
      save(ctx.store, data);
      ctx.broadcast();
      json(res, event, 201);
    });
    register('DELETE', '/events/:id', (req, res, { params, json, ctx }) => {
      const data = load(ctx.store);
      const before = data.events.length;
      data.events = data.events.filter((e) => e.id !== params.id);
      if (data.events.length === before) return json(res, { error: 'not found' }, 404);
      save(ctx.store, data);
      ctx.broadcast();
      json(res, { ok: true });
    });
  },
};

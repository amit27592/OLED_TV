// To-Do view renderers — styles: a Meridian, b Centered, c Baseline.
// Treatments (per-TV config): flat | grouped | priority | progress.

function build(items, cfg) {
  const max = Math.max(3, Number(cfg.maxItems ?? 7));
  const open = items.filter((t) => !t.done);
  const variant = cfg.variant || 'grouped';
  let groups;
  let showProgress = false;

  if (variant === 'flat') {
    groups = [{ label: '', items: open.filter((t) => t.when === 'today' || t.when === 'overdue') }];
  } else if (variant === 'priority') {
    groups = [
      { label: 'High priority', items: open.filter((t) => t.priority === 'high') },
      { label: 'Medium', items: open.filter((t) => t.priority === 'med') },
      { label: 'Low', items: open.filter((t) => t.priority === 'low') },
    ];
  } else if (variant === 'progress') {
    showProgress = true;
    groups = [{ label: '', items: [...items] }];
  } else {
    groups = [
      { label: 'Overdue', items: open.filter((t) => t.when === 'overdue') },
      { label: 'Today', items: open.filter((t) => t.when === 'today') },
      { label: 'Upcoming', items: open.filter((t) => t.when === 'upcoming') },
    ];
  }
  groups = groups.filter((gr) => gr.items.length);

  // enforce the on-screen budget across groups
  let budget = max;
  for (const gr of groups) {
    gr.items = gr.items.slice(0, Math.max(0, budget));
    budget -= gr.items.length;
  }
  groups = groups.filter((gr) => gr.items.length);

  const doneN = items.filter((t) => t.done).length;
  const pct = items.length ? Math.round((doneN / items.length) * 100) : 0;
  const overdueN = open.filter((t) => t.when === 'overdue').length;
  const todayN = open.filter((t) => t.when === 'today').length;
  return {
    groups,
    showProgress,
    stats: { doneLabel: `${doneN} of ${items.length} done`, pct },
    headRight: overdueN ? `${overdueN} overdue · ${todayN} today` : `${todayN} open today`,
  };
}

function itemRow(t, g, { fontSize, metaSize, mono = false }) {
  const dot = `width:22px;height:22px;border-radius:50%;display:inline-block;flex:none;border:2px solid ${g.T};background:${t.done ? 'rgba(255,255,255,.55)' : 'transparent'}`;
  const txt = t.done ? `text-decoration:line-through;color:${g.T}` : 'color:#fff';
  const metaFont = mono ? `font-family:'Space Mono',monospace;` : 'letter-spacing:.12em;text-transform:uppercase;';
  return `<div style="display:flex;align-items:center;gap:26px;font-size:${fontSize}px">
    <span style="${dot}"></span><span style="${txt}">${g.esc(t.text)}</span>
    <span style="margin-left:auto;${metaFont}font-size:${metaSize}px;color:${g.T}">${g.esc(t.meta)}</span>
  </div>`;
}

function groupBlock(gr, g, opts) {
  const label = gr.label
    ? `<div style="${opts.mono ? "font-family:'Space Mono',monospace;" : ''}font-size:21px;letter-spacing:.2em;text-transform:uppercase;color:${g.T}">${g.esc(gr.label)} · ${gr.items.length}</div>` : '';
  return `<div style="display:flex;flex-direction:column;gap:16px">${label}${gr.items.map((t) => itemRow(t, g, opts)).join('')}</div>`;
}

function progressBar(stats, g, { mono = false } = {}) {
  return `<div style="display:flex;flex-direction:column;gap:14px">
    <div style="display:flex;justify-content:space-between;${mono ? "font-family:'Space Mono',monospace;" : ''}font-size:25px;color:${g.S}"><span>${g.esc(stats.doneLabel)}</span><span>${stats.pct}%</span></div>
    <div style="height:11px;background:rgba(255,255,255,.12);border-radius:7px;overflow:hidden"><div style="width:${stats.pct}%;height:100%;background:rgba(255,255,255,.85)"></div></div>
  </div>`;
}

export default {
  id: 'todo',
  render: {
    a({ data, cfg, g }) {
      const m = build(data.items, cfg);
      return `
      <div style="position:absolute;inset:0;padding:120px;display:flex;flex-direction:column;gap:40px;animation:drift 90s ease-in-out infinite alternate">
        <div style="display:flex;justify-content:space-between;font-size:22px;letter-spacing:.36em;text-transform:uppercase"><span style="color:${g.S}">To-Do</span><span style="color:${g.T}">${g.esc(m.headRight)}</span></div>
        ${m.showProgress ? progressBar(m.stats, g) : ''}
        <div style="display:flex;flex-direction:column;gap:26px">
          ${m.groups.map((gr) => groupBlock(gr, g, { fontSize: 36, metaSize: 19 })).join('')}
        </div>
      </div>`;
    },

    b({ data, cfg, g }) {
      const m = build(data.items, cfg);
      return `
      <div style="position:absolute;inset:0;padding:100px;display:flex;align-items:center;justify-content:center;font-family:'Space Grotesk',sans-serif;animation:drift 90s ease-in-out infinite alternate">
        <div style="animation:breathe 7s ease-in-out infinite alternate;width:100%;max-width:1180px">
          <div style="text-align:center;font-family:'Space Mono',monospace;font-size:24px;letter-spacing:.42em;text-transform:uppercase;color:${g.S}">To-Do · ${g.esc(m.headRight)}</div>
          ${m.showProgress ? `<div style="margin:38px auto 0;max-width:900px">${progressBar(m.stats, g, { mono: true })}</div>` : ''}
          <div style="margin-top:46px;display:flex;flex-direction:column;gap:28px;text-align:left">
            ${m.groups.map((gr) => groupBlock(gr, g, { fontSize: 40, metaSize: 20, mono: true })).join('')}
          </div>
        </div>
      </div>`;
    },

    c({ data, cfg, g }) {
      const m = build(data.items, cfg);
      return `
      <div style="position:absolute;inset:0;padding:110px;display:flex;flex-direction:column;justify-content:flex-end;gap:30px;animation:driftC 80s ease-in-out infinite alternate">
        <div style="font-size:24px;letter-spacing:.3em;text-transform:uppercase;color:${g.T}">To-Do · ${g.esc(m.headRight)}</div>
        ${m.showProgress ? `<div style="max-width:1000px">${progressBar(m.stats, g)}</div>` : ''}
        <div style="display:flex;flex-direction:column;gap:22px">
          ${m.groups.map((gr) => groupBlock(gr, g, { fontSize: 34, metaSize: 18 })).join('')}
        </div>
      </div>`;
    },
  },
};

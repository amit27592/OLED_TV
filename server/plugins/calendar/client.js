// Calendar renderers — styles: a Meridian, b Centered, c Baseline.
// Date/grid values come from the client clock (g.cal); agenda comes from data.

function agendaRows(data, g, { time = 130, font = 32 } = {}) {
  return data.agenda.map((a) =>
    `<div style="display:flex;gap:44px;font-size:${font}px"><span style="width:${time}px;color:${g.T};font-variant-numeric:tabular-nums">${g.esc(a.t)}</span><span>${g.esc(a.name)}</span></div>`
  ).join('');
}

export default {
  id: 'calendar',
  render: {
    a({ data, g }) {
      const cal = g.cal;
      const label = data.agendaLabel === 'upcoming' && data.agenda.length
        ? `<div style="font-size:22px;letter-spacing:.2em;text-transform:uppercase;color:${g.T};margin-bottom:6px">Upcoming</div>` : '';
      return `
      <div style="position:absolute;inset:0;padding:120px;display:flex;flex-direction:column;justify-content:space-between;animation:drift 90s ease-in-out infinite alternate">
        <div style="display:flex;justify-content:space-between;font-size:22px;letter-spacing:.36em;text-transform:uppercase"><span style="color:${g.S}">Calendar</span><span style="color:${g.T}">${cal.month} ${cal.year}</span></div>
        <div>
          <div style="display:flex;align-items:flex-end;gap:46px"><div style="font-size:296px;line-height:.72;font-weight:600;font-variant-numeric:tabular-nums">${cal.day}</div><div style="padding-bottom:26px"><div style="font-size:46px;color:${g.S}">${cal.weekday}</div><div style="font-size:28px;color:${g.T}">Week ${cal.weekNo}</div></div></div>
          <div style="margin-top:54px;display:flex;flex-direction:column;gap:22px;max-width:1150px">${label}${agendaRows(data, g)}</div>
        </div>
      </div>`;
    },

    b({ data, g }) {
      const cal = g.cal;
      const days = cal.weekDays7.map((w) => w.today
        ? `<div style="width:108px;height:108px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#fff;color:#000;font-size:44px;font-weight:500;font-variant-numeric:tabular-nums">${w.n}</div>`
        : `<div style="width:108px;height:108px;display:flex;align-items:center;justify-content:center;font-size:44px;color:${g.T};font-variant-numeric:tabular-nums">${w.n}</div>`
      ).join('');
      return `
      <div style="position:absolute;inset:0;padding:110px;display:flex;align-items:center;justify-content:center;text-align:center;font-family:'Space Grotesk',sans-serif;animation:drift 90s ease-in-out infinite alternate">
        <div style="animation:breathe 7s ease-in-out infinite alternate">
          <div style="font-family:'Space Mono',monospace;font-size:24px;letter-spacing:.42em;text-transform:uppercase;color:${g.S}">${cal.month} ${cal.year}</div>
          <div style="font-size:264px;line-height:.85;font-weight:500;font-variant-numeric:tabular-nums;margin:26px 0 14px">${cal.day}</div>
          <div style="font-family:'Space Mono',monospace;font-size:34px;color:${g.S}">${cal.weekday}</div>
          <div style="margin-top:52px;display:flex;gap:20px;justify-content:center">${days}</div>
        </div>
      </div>`;
    },

    c({ data, g }) {
      const cal = g.cal;
      return `
      <div style="position:absolute;inset:0;padding:110px;display:flex;flex-direction:column;justify-content:flex-end;gap:44px;animation:driftC 80s ease-in-out infinite alternate">
        <div style="display:flex;flex-direction:column;gap:18px;max-width:1200px">
          ${data.agenda.map((a) => `<div style="display:flex;gap:40px;font-size:30px"><span style="width:120px;color:${g.T};font-variant-numeric:tabular-nums">${g.esc(a.t)}</span><span style="color:${g.S}">${g.esc(a.name)}</span></div>`).join('')}
        </div>
        <div style="display:flex;align-items:flex-end;gap:40px"><div style="font-size:300px;line-height:.72;font-weight:600;font-variant-numeric:tabular-nums">${cal.day}</div><div style="padding-bottom:24px"><div style="font-size:44px;color:${g.S}">${cal.weekday}</div><div style="font-size:26px;color:${g.T}">${cal.month} ${cal.year} · Week ${cal.weekNo}</div></div></div>
      </div>`;
    },
  },
};

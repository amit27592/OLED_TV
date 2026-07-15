// Weather view renderers — styles: a Meridian, b Centered, c Baseline.
// Which fields show is resolved server-side into data.fields.

function chips(data, g, { prefix = true } = {}) {
  const f = data.fields;
  const parts = [];
  if (f.feels) parts.push(`${prefix ? 'Feels like' : 'Feels'} ${g.esc(data.feelsT)}`);
  if (f.precip) parts.push(`Rain ${g.esc(data.precipP)}`);
  if (f.wind) parts.push(`Wind ${g.esc(data.windV)}`);
  if (f.humidity) parts.push(`Humidity ${g.esc(data.humidityV)}`);
  return parts;
}

export default {
  id: 'weather',
  render: {
    a({ data, g }) {
      const f = data.fields;
      const detail = chips(data, g).map((c) => `<span>${c}</span>`).join('');
      const hourly = f.hourly ? `
        <div style="display:flex;justify-content:space-between;border-top:1px solid rgba(255,255,255,.14);padding-top:26px">
          ${data.hourly.map((h) => `<div style="text-align:center;flex:1"><div style="font-size:22px;color:${g.T};letter-spacing:.06em">${g.esc(h.h)}</div><div style="margin-top:12px;font-size:40px">${g.esc(h.t)}</div><div style="margin-top:8px;font-size:20px;color:${g.T}">${g.esc(h.p)}</div></div>`).join('')}
        </div>` : '';
      return `
      <div style="position:absolute;inset:0;padding:120px;display:flex;flex-direction:column;justify-content:space-between;animation:drift 90s ease-in-out infinite alternate">
        <div style="display:flex;justify-content:space-between;font-size:22px;letter-spacing:.36em;text-transform:uppercase"><span style="color:${g.S}">Weather</span><span style="color:${g.T}">${g.esc(data.city)}</span></div>
        <div style="display:flex;flex-direction:column;gap:34px">
          <div style="display:flex;align-items:flex-end;gap:60px">
            <div style="font-size:280px;line-height:.9;font-weight:600;letter-spacing:-.03em">${g.esc(data.temp)}<span style="color:${g.T}">${g.esc(data.unit)}</span></div>
            <div style="padding-bottom:30px"><div style="font-size:44px;color:${g.S}">${g.esc(data.cond)}</div><div style="margin-top:12px;font-size:34px;color:${g.T}">H ${g.esc(data.hi)} &nbsp; L ${g.esc(data.lo)}</div></div>
          </div>
          ${detail ? `<div style="display:flex;gap:52px;flex-wrap:wrap;font-size:30px;color:${g.T}">${detail}</div>` : ''}
          ${f.rainNote ? `<div style="font-size:30px;color:${g.S}">${g.esc(data.rainLine)}</div>` : ''}
          ${hourly}
          ${f.tomorrow ? `<div style="font-size:28px;color:${g.T}">Tomorrow · ${g.esc(data.tomorrow.cond)} · H ${g.esc(data.tomorrow.hi)} L ${g.esc(data.tomorrow.lo)} · Rain ${g.esc(data.tomorrow.precip)}</div>` : ''}
        </div>
      </div>`;
    },

    b({ data, g }) {
      const f = data.fields;
      const detail = chips(data, g, { prefix: false }).map((c) => `<span>${c}</span>`).join('');
      const hourly = f.hourly ? `
        <div style="margin-top:44px;display:flex;gap:56px;justify-content:center">
          ${data.hourly.map((h) => `<div style="text-align:center"><div style="font-family:'Space Mono',monospace;font-size:20px;color:${g.T}">${g.esc(h.h)}</div><div style="margin-top:10px;font-size:38px;font-weight:500">${g.esc(h.t)}</div></div>`).join('')}
        </div>` : '';
      return `
      <div style="position:absolute;inset:0;padding:100px;display:flex;align-items:center;justify-content:center;text-align:center;font-family:'Space Grotesk',sans-serif;animation:drift 90s ease-in-out infinite alternate">
        <div style="animation:breathe 7s ease-in-out infinite alternate">
          <div style="font-family:'Space Mono',monospace;font-size:24px;letter-spacing:.42em;text-transform:uppercase;color:${g.S}">${g.esc(data.city)}</div>
          <div style="font-size:290px;line-height:.9;font-weight:500;letter-spacing:-.02em;margin:26px 0 18px">${g.esc(data.temp)}<span style="color:${g.T}">${g.esc(data.unit)}</span></div>
          <div style="font-family:'Space Mono',monospace;font-size:34px;color:${g.S}">${g.esc(data.cond)} · H ${g.esc(data.hi)} · L ${g.esc(data.lo)}</div>
          ${detail ? `<div style="margin-top:22px;font-family:'Space Mono',monospace;font-size:26px;color:${g.T};display:flex;gap:34px;justify-content:center;flex-wrap:wrap">${detail}</div>` : ''}
          ${hourly}
          ${f.tomorrow ? `<div style="margin-top:34px;font-family:'Space Mono',monospace;font-size:24px;color:${g.T}">Tomorrow · ${g.esc(data.tomorrow.cond)} · ${g.esc(data.tomorrow.hi)} / ${g.esc(data.tomorrow.lo)} · Rain ${g.esc(data.tomorrow.precip)}</div>` : ''}
        </div>
      </div>`;
    },

    c({ data, g }) {
      const f = data.fields;
      const detail = chips(data, g, { prefix: false });
      if (f.tomorrow) detail.push(`Tomorrow ${g.esc(data.tomorrow.hi)}/${g.esc(data.tomorrow.lo)}`);
      const hourly = f.hourly ? `
        <div style="display:flex;justify-content:space-between;max-width:1400px">
          ${data.hourly.map((h) => `<div style="flex:1"><div style="font-size:20px;color:${g.T}">${g.esc(h.h)}</div><div style="margin-top:8px;font-size:34px">${g.esc(h.t)}</div></div>`).join('')}
        </div>` : '';
      return `
      <div style="position:absolute;inset:0;padding:110px;display:flex;flex-direction:column;justify-content:flex-end;gap:30px;animation:driftC 80s ease-in-out infinite alternate">
        ${hourly}
        ${detail.length ? `<div style="display:flex;gap:44px;flex-wrap:wrap;font-size:28px;color:${g.T}">${detail.map((c) => `<span>${c}</span>`).join('')}</div>` : ''}
        <div style="font-size:34px;color:${g.S}">${g.esc(data.cond)} · ${g.esc(data.city)} · H ${g.esc(data.hi)} L ${g.esc(data.lo)}</div>
        <div style="font-size:280px;line-height:.74;font-weight:600;letter-spacing:-.03em">${g.esc(data.temp)}<span style="color:${g.T}">${g.esc(data.unit)}</span></div>
      </div>`;
    },
  },
};

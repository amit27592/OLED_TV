// F1 renderers — styles: a Meridian, b Centered, c Baseline.
export default {
  id: 'f1',
  render: {
    a({ data, g }) {
      if (data.none) return noRace(data, g);
      return `
      <div style="position:absolute;inset:0;padding:120px;display:flex;flex-direction:column;justify-content:space-between;animation:drift 90s ease-in-out infinite alternate">
        <div style="display:flex;justify-content:space-between;font-size:22px;letter-spacing:.36em;text-transform:uppercase"><span style="color:${g.S}">Formula 1</span><span style="color:${g.T}">${g.esc(data.round)}</span></div>
        <div>
          <div style="font-size:146px;line-height:.9;font-weight:600;letter-spacing:-.02em">${g.esc(data.name)}</div>
          <div style="margin-top:26px;font-size:38px;color:${g.S}">${g.esc(data.circuit)}</div>
          <div style="margin-top:56px;display:flex;gap:90px;align-items:flex-end">
            <div><div style="font-size:120px;font-weight:600;line-height:.9;font-variant-numeric:tabular-nums">${g.esc(data.days)}</div><div style="margin-top:12px;font-size:22px;letter-spacing:.2em;text-transform:uppercase;color:${g.T}">days to lights out</div></div>
            <div style="font-size:32px;padding-bottom:8px;color:${g.S}">Race · ${g.esc(data.dateLabel)} · ${g.esc(data.time)}</div>
          </div>
        </div>
      </div>`;
    },

    b({ data, g }) {
      if (data.none) return noRace(data, g);
      return `
      <div style="position:absolute;inset:0;padding:110px;display:flex;align-items:center;justify-content:center;text-align:center;font-family:'Space Grotesk',sans-serif;animation:drift 90s ease-in-out infinite alternate">
        <div style="animation:breathe 7s ease-in-out infinite alternate">
          <div style="font-family:'Space Mono',monospace;font-size:24px;letter-spacing:.42em;text-transform:uppercase;color:${g.S}">Formula 1 · ${g.esc(data.round)}</div>
          <div style="font-size:132px;line-height:.98;font-weight:500;letter-spacing:-.02em;margin:34px 0 22px;text-wrap:pretty">${g.esc(data.name)}</div>
          <div style="font-family:'Space Mono',monospace;font-size:34px;color:${g.S}">${g.esc(data.circuit)}</div>
          <div style="margin-top:46px;font-family:'Space Mono',monospace;font-size:30px;color:${g.T}">Lights out in <span style="color:#fff;font-size:40px">${g.esc(data.days)}</span> days · ${g.esc(data.dateLabel)}</div>
        </div>
      </div>`;
    },

    c({ data, g }) {
      if (data.none) return noRace(data, g);
      return `
      <div style="position:absolute;inset:0;padding:110px;display:flex;flex-direction:column;justify-content:flex-end;gap:30px;animation:driftC 80s ease-in-out infinite alternate">
        <div style="font-size:24px;letter-spacing:.3em;text-transform:uppercase;color:${g.T}">Formula 1 · ${g.esc(data.round)} · ${g.esc(data.dateLabel)}</div>
        <div style="font-size:34px;color:${g.S}">${g.esc(data.circuit)}</div>
        <div style="display:flex;align-items:flex-end;gap:40px"><div style="font-size:150px;line-height:.85;font-weight:600;font-variant-numeric:tabular-nums">${g.esc(data.days)}</div><div style="padding-bottom:16px;font-size:24px;letter-spacing:.18em;text-transform:uppercase;color:${g.T}">days to<br>lights out</div></div>
        <div style="font-size:96px;line-height:.95;font-weight:600;letter-spacing:-.02em;text-wrap:pretty">${g.esc(data.name)}</div>
      </div>`;
    },
  },
};

function noRace(data, g) {
  return `
  <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;animation:breathe 7s ease-in-out infinite alternate">
    <div style="font-family:'Space Mono',monospace;font-size:28px;letter-spacing:.2em;text-transform:uppercase;color:${g.T}">${g.esc(data.season || 'No upcoming race')}</div>
  </div>`;
}

// Featured Note renderers — styles: a Meridian, b Centered, c Baseline.
export default {
  id: 'note',
  render: {
    a({ data, g }) {
      const n = data.note;
      const author = data.showAuthor
        ? `<div style="margin-top:40px;font-size:30px;color:${g.T}">${g.esc(n.author)} · ${g.esc(n.dateLabel)}</div>` : '';
      return `
      <div style="position:absolute;inset:0;padding:120px;display:flex;flex-direction:column;justify-content:space-between;animation:drift 90s ease-in-out infinite alternate">
        <div style="display:flex;justify-content:space-between;font-size:22px;letter-spacing:.36em;text-transform:uppercase"><span style="color:${g.S}">${g.esc(n.kicker)}</span><span style="color:${g.T}">Pinned</span></div>
        <div style="max-width:1400px">
          <div style="font-size:116px;line-height:1.02;font-weight:600;letter-spacing:-.02em;text-wrap:pretty">${g.esc(n.title)}</div>
          <div style="margin-top:42px;font-size:38px;line-height:1.42;color:${g.S};text-wrap:pretty">${g.esc(n.body)}</div>
          ${author}
        </div>
      </div>`;
    },

    b({ data, g }) {
      const n = data.note;
      const author = data.showAuthor
        ? `<div style="margin-top:40px;font-family:'Space Mono',monospace;font-size:26px;color:${g.T}">${g.esc(n.author)} · ${g.esc(n.dateLabel)}</div>` : '';
      return `
      <div style="position:absolute;inset:0;padding:110px;display:flex;align-items:center;justify-content:center;text-align:center;font-family:'Space Grotesk',sans-serif;animation:drift 90s ease-in-out infinite alternate">
        <div style="max-width:1320px;animation:breathe 7s ease-in-out infinite alternate">
          <div style="font-family:'Space Mono',monospace;font-size:24px;letter-spacing:.42em;text-transform:uppercase;color:${g.T}">${g.esc(n.kicker)}</div>
          <div style="font-size:104px;line-height:1.04;font-weight:500;letter-spacing:-.02em;margin:40px 0;text-wrap:pretty">${g.esc(n.title)}</div>
          <div style="font-family:'Space Mono',monospace;font-size:32px;line-height:1.5;color:${g.S};text-wrap:pretty">${g.esc(n.body)}</div>
          ${author}
        </div>
      </div>`;
    },

    c({ data, g }) {
      const n = data.note;
      const author = data.showAuthor
        ? `<div style="margin-top:36px;font-size:28px;color:${g.T}">${g.esc(n.author)} · ${g.esc(n.dateLabel)}</div>` : '';
      return `
      <div style="position:absolute;inset:0;padding:110px;display:flex;flex-direction:column;justify-content:flex-end;animation:driftC 80s ease-in-out infinite alternate">
        <div style="font-size:24px;letter-spacing:.3em;text-transform:uppercase;color:${g.T}">${g.esc(n.kicker)}</div>
        <div style="margin-top:34px;font-size:108px;line-height:1.02;font-weight:600;letter-spacing:-.02em;max-width:1500px;text-wrap:pretty">${g.esc(n.title)}</div>
        <div style="margin-top:36px;font-size:36px;line-height:1.42;color:${g.S};max-width:1400px;text-wrap:pretty">${g.esc(n.body)}</div>
        ${author}
      </div>`;
    },
  },
};

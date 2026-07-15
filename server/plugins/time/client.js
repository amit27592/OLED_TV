// Time view renderers — styles: a Meridian, b Centered, c Baseline.

// Inline style for an absolutely-positioned corner badge (anchored to #stage,
// which already does the slow anti-burn-in pixelshift, so it drifts too).
function cornerPos(pos) {
  return ({
    tl: 'top:96px;left:120px;align-items:flex-start;text-align:left',
    tr: 'top:96px;right:120px;align-items:flex-end;text-align:right',
    bl: 'bottom:96px;left:120px;align-items:flex-start;text-align:left',
    br: 'bottom:96px;right:120px;align-items:flex-end;text-align:right',
  })[pos] || 'top:96px;right:120px;align-items:flex-end;text-align:right';
}

// Optional current-conditions badge (data.weather is filled server-side only
// when the plugin's showWeather toggle is on).
function weatherBadge({ cfg, data, g }) {
  if (!cfg.showWeather || !data.weather) return '';
  return `
    <div style="position:absolute;${cornerPos(cfg.weatherCorner)};display:flex;flex-direction:column;gap:8px;z-index:2">
      <div style="font-size:56px;font-weight:500;line-height:1;font-variant-numeric:tabular-nums">${g.esc(data.weather.temp)}<span style="color:${g.T}">°</span></div>
      <div style="font-size:22px;letter-spacing:.24em;text-transform:uppercase;color:${g.S}">${g.esc(data.weather.cond)}</div>
    </div>`;
}

export default {
  id: 'time',
  render: {
    a({ cfg, data, tv, g }) {
      const city = data.city || tv.plugins?.weather?.city || tv.name || '';
      const secs = cfg.showSeconds !== false
        ? `<span style="color:${g.T}">:${g.clk('ss')}</span>` : '';
      const sun = cfg.showSun !== false
        ? `<span style="color:${g.T}">Sunrise ${g.esc(data.sunrise)} · Sunset ${g.esc(data.sunset)}</span>` : '';
      return `
      <div style="position:absolute;inset:0;padding:120px;display:flex;flex-direction:column;justify-content:space-between;animation:drift 90s ease-in-out infinite alternate">
        <div style="display:flex;justify-content:space-between;font-size:22px;letter-spacing:.36em;text-transform:uppercase"><span style="color:${g.S}"></span><span style="color:${g.T}">${g.esc(city)}</span></div>
        <div>
          <div style="font-size:352px;line-height:.9;font-weight:600;letter-spacing:-.035em;font-variant-numeric:tabular-nums">${g.clk('hh')}:${g.clk('mm')}${secs}</div>
          <div style="margin-top:60px;display:flex;gap:56px;font-size:38px;color:${g.S}"><span>${g.clk('dateLong')}</span>${sun}</div>
        </div>
      </div>${weatherBadge({ cfg, data, g })}`;
    },

    b({ cfg, data, tv, g }) {
      const city = data.city || tv.plugins?.weather?.city || tv.name || '';
      const secs = cfg.showSeconds !== false
        ? `<span style="color:${g.T}">:${g.clk('ss')}</span>` : '';
      return `
      <div style="position:absolute;inset:0;padding:110px;display:flex;align-items:center;justify-content:center;text-align:center;font-family:'Space Grotesk',sans-serif;animation:drift 90s ease-in-out infinite alternate">
        <div style="animation:breathe 7s ease-in-out infinite alternate">
          <div style="font-family:'Space Mono',monospace;font-size:24px;letter-spacing:.42em;text-transform:uppercase;color:${g.S}"> · ${g.esc(city)}</div>
          <div style="font-size:288px;line-height:.9;font-weight:500;letter-spacing:-.02em;font-variant-numeric:tabular-nums;margin:56px 0">${g.clk('hh')}:${g.clk('mm')}${secs}</div>
          <div style="font-family:'Space Mono',monospace;font-size:32px;color:${g.S}">${g.clk('dateLong')}</div>
        </div>
      </div>${weatherBadge({ cfg, data, g })}`;
    },

    c({ cfg, data, tv, g }) {
      const city = data.city || tv.plugins?.weather?.city || tv.name || '';
      const secs = cfg.showSeconds !== false
        ? `<span style="color:${g.T};font-size:150px">:${g.clk('ss')}</span>` : '';
      return `
      <div style="position:absolute;inset:0;padding:110px;display:flex;flex-direction:column;justify-content:flex-end;animation:driftC 80s ease-in-out infinite alternate">
        <div style="font-size:24px;letter-spacing:.3em;text-transform:uppercase;color:${g.T}">${g.esc(city)} · ${g.clk('dateLong')}</div>
        <div style="margin-top:44px;font-size:340px;line-height:.92;font-weight:600;letter-spacing:-.035em;font-variant-numeric:tabular-nums">${g.clk('hh')}:${g.clk('mm')}${secs}</div>
      </div>${weatherBadge({ cfg, data, g })}`;
    },
  },
};

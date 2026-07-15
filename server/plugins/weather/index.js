// Weather view. MOCK DATA — deterministic per city + hour so it looks alive.
// To wire a real feed: replace mockWeather() with a fetch to your provider
// (e.g. Open-Meteo: https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..)
// and keep the returned shape identical.

const PRESETS = {
  minimal:  { feels: false, precip: false, wind: false, humidity: false, hourly: false, tomorrow: false, rainNote: false },
  standard: { feels: true,  precip: true,  wind: true,  humidity: true,  hourly: true,  tomorrow: false, rainNote: false },
  rich:     { feels: true,  precip: true,  wind: true,  humidity: true,  hourly: true,  tomorrow: true,  rainNote: true },
};

const CONDS = ['Clear', 'Mostly sunny', 'Partly cloudy', 'Cloudy', 'Light rain', 'Rain', 'Fog'];
const WINDS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

function hash(str) {
  let h = 0;
  for (const c of str) h = ((h << 5) - h + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function hourLabel(d) {
  const h = d.getHours();
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function mockWeather(city, units) {
  const now = new Date();
  const seed = hash(city.toLowerCase() || 'city');
  const day = Math.floor(now.getTime() / 86400000);
  const baseC = 8 + (seed % 14) + ((hash(String(day + seed)) % 7) - 3);
  const curve = (h) => baseC + 6 * Math.sin(((h - 14) / 24) * 2 * Math.PI + Math.PI / 2);
  const toU = (c) => (units === 'F' ? Math.round(c * 9 / 5 + 32) : Math.round(c));
  const h = now.getHours();

  const condIdx = hash(city + day) % CONDS.length;
  const rainy = condIdx >= 4;
  const precipBase = rainy ? 45 : 10;
  const tempNow = curve(h);
  const hi = curve(14) + 1;
  const lo = curve(4);

  const hourly = [];
  for (let i = 0; i < 6; i++) {
    const t = new Date(now.getTime() + i * 3600000);
    hourly.push({
      h: i === 0 ? 'Now' : hourLabel(t),
      t: `${toU(curve(t.getHours()))}°`,
      p: `${Math.min(90, precipBase + ((hash(city + day + i) % 5) * 10))}%`,
    });
  }

  const tomIdx = hash(city + (day + 1)) % CONDS.length;
  return {
    city,
    temp: String(toU(tempNow)),
    unit: '°',
    cond: CONDS[condIdx],
    hi: `${toU(hi)}°`,
    lo: `${toU(lo)}°`,
    feelsT: `${toU(tempNow - (rainy ? 2 : 1))}°`,
    precipP: `${precipBase + 10}%`,
    windV: `${5 + (seed % 12)} mph ${WINDS[hash(city + day) % 8]}`,
    humidityV: `${55 + (seed % 30)}%`,
    rainLine: rainy ? 'Light rain expected around 7 PM.' : 'No rain expected today.',
    hourly,
    tomorrow: {
      cond: CONDS[tomIdx],
      hi: `${toU(curve(14) + (tomIdx >= 4 ? -2 : 1))}°`,
      lo: `${toU(curve(4) - 1)}°`,
      precip: `${tomIdx >= 4 ? 80 : 15}%`,
    },
    mock: true,
  };
}

export default {
  id: 'weather',
  name: 'Weather',
  description: 'Current conditions, hourly strip and tomorrow — Google-weather style content.',
  defaultConfig: {
    city: 'San Francisco',
    units: 'C',
    variant: 'standard', // minimal | standard | rich | custom
    fields: { ...PRESETS.standard },
  },
  configSchema: [
    { key: 'city', label: 'City', type: 'text' },
    { key: 'units', label: 'Units', type: 'select', options: [['C', '°C'], ['F', '°F']] },
    {
      key: 'variant', label: 'Treatment', type: 'select',
      options: [['minimal', 'Minimal'], ['standard', 'Standard'], ['rich', 'Rich'], ['custom', 'Custom']],
    },
    {
      key: 'fields', label: 'Fields (Custom treatment)', type: 'toggles',
      items: [
        ['feels', 'Feels like'], ['precip', 'Rain %'], ['wind', 'Wind'], ['humidity', 'Humidity'],
        ['hourly', 'Hourly strip'], ['tomorrow', 'Tomorrow'], ['rainNote', 'Rain note'],
      ],
    },
  ],
  getData(cfg) {
    const fields = cfg.variant === 'custom' ? { ...PRESETS.standard, ...cfg.fields } : PRESETS[cfg.variant] || PRESETS.standard;
    return { ...mockWeather(cfg.city || 'San Francisco', cfg.units), fields };
  },
};

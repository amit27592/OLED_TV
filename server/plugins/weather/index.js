// Weather view. LIVE DATA via Open-Meteo (shared client in server/lib/openmeteo.js):
// the configured city is geocoded once, forecasts are cached ~10 min per location.
// mockWeather() is kept only as the fallback when the network / geocoding fails,
// so the screen never goes blank (payload then carries mock: true).
import { forecastForCity, condition, compass } from '../../lib/openmeteo.js';

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

function hourLabel(h) {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

// Label for a location-local ISO string like '2026-07-15T14:00'.
const isoHourLabel = (iso) => hourLabel(Number(iso.slice(11, 13)));

async function liveWeather(city, units) {
  const { loc, fc } = await forecastForCity(city);
  const toU = (c) => (units === 'F' ? Math.round(c * 9 / 5 + 32) : Math.round(c));
  const cur = fc.current;
  const H = fc.hourly;
  const D = fc.daily;

  // Current position in the hourly series (all times are location-local).
  let idx = H.time.indexOf(cur.time.slice(0, 13) + ':00');
  if (idx === -1) idx = 0;

  const hourly = [];
  for (let i = 0; i < 6 && idx + i < H.time.length; i++) {
    hourly.push({
      h: i === 0 ? 'Now' : isoHourLabel(H.time[idx + i]),
      t: `${toU(H.temperature_2m[idx + i])}°`,
      p: `${Math.round(H.precipitation_probability?.[idx + i] ?? 0)}%`,
    });
  }

  let rainLine = 'No rain expected today.';
  const today = cur.time.slice(0, 10);
  for (let i = idx; i < H.time.length && H.time[i].startsWith(today); i++) {
    if ((H.precipitation_probability?.[i] ?? 0) >= 50) {
      rainLine = `Rain likely around ${isoHourLabel(H.time[i])}.`;
      break;
    }
  }

  const windSpeed = units === 'F'
    ? `${Math.round(cur.wind_speed_10m * 0.621371)} mph`
    : `${Math.round(cur.wind_speed_10m)} km/h`;

  return {
    city: loc.name || city,
    temp: String(toU(cur.temperature_2m)),
    unit: '°',
    cond: condition(cur.weather_code),
    hi: `${toU(D.temperature_2m_max[0])}°`,
    lo: `${toU(D.temperature_2m_min[0])}°`,
    feelsT: `${toU(cur.apparent_temperature)}°`,
    precipP: `${Math.round(H.precipitation_probability?.[idx] ?? 0)}%`,
    windV: `${windSpeed} ${compass(cur.wind_direction_10m)}`,
    humidityV: `${Math.round(cur.relative_humidity_2m)}%`,
    rainLine,
    hourly,
    tomorrow: {
      cond: condition(D.weather_code[1]),
      hi: `${toU(D.temperature_2m_max[1])}°`,
      lo: `${toU(D.temperature_2m_min[1])}°`,
      precip: `${Math.round(D.precipitation_probability_max?.[1] ?? 0)}%`,
    },
    mock: false,
  };
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
      h: i === 0 ? 'Now' : hourLabel(t.getHours()),
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
  description: 'Live conditions, hourly strip and tomorrow via Open-Meteo — set the city below.',
  defaultConfig: {
    city: 'San Francisco',
    units: 'C',
    variant: 'standard', // minimal | standard | rich | custom
    fields: { ...PRESETS.standard },
    showTime: false, // small live clock badge in a corner
    timeCorner: 'tr', // tl | tr | bl | br
  },
  configSchema: [
    { key: 'city', label: 'City', type: 'text' },
    { key: 'units', label: 'Units', type: 'select', options: [['C', '°C'], ['F', '°F']] },
    { key: 'showTime', label: 'Show time badge', type: 'toggle' },
    {
      key: 'timeCorner', label: 'Time badge corner', type: 'select',
      options: [['tl', 'Top left'], ['tr', 'Top right'], ['bl', 'Bottom left'], ['br', 'Bottom right']],
    },
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
  async getData(cfg) {
    const fields = cfg.variant === 'custom' ? { ...PRESETS.standard, ...cfg.fields } : PRESETS[cfg.variant] || PRESETS.standard;
    const city = cfg.city || 'San Francisco';
    try {
      return { ...(await liveWeather(city, cfg.units)), fields };
    } catch (err) {
      console.warn(`[weather] live fetch failed for "${city}" (${err.message}) — showing mock data`);
      return { ...mockWeather(city, cfg.units), fields };
    }
  },
};

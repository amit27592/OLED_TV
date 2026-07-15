// Time view — the clock itself ticks client-side; this plugin resolves the
// location and fetches live sunrise/sunset from Open-Meteo (shared cached
// client in server/lib/openmeteo.js). Location defaults to the Weather city
// but can be overridden per TV.
import { forecastForCity } from '../../lib/openmeteo.js';

// '2026-07-15T05:58' -> '05:58' or '5:58 AM' depending on the TV clock format.
function fmtTime(iso, format24) {
  const h = Number(iso.slice(11, 13));
  const m = iso.slice(14, 16);
  if (format24) return `${String(h).padStart(2, '0')}:${m}`;
  return `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
}

export default {
  id: 'time',
  name: 'Time',
  description: 'Giant ticking clock with date and live sunrise / sunset.',
  defaultConfig: {
    showSeconds: true,
    showSun: true,
    city: '', // blank = follow the Weather view's city
  },
  configSchema: [
    { key: 'showSeconds', label: 'Show seconds', type: 'toggle' },
    { key: 'showSun', label: 'Show sunrise / sunset', type: 'toggle' },
    { key: 'city', label: 'Location (blank = Weather city)', type: 'text' },
  ],
  async getData(cfg, { tv }) {
    const city = (cfg.city || '').trim() || tv?.plugins?.weather?.city || 'San Francisco';
    const format24 = tv?.clock?.format24 !== false;
    try {
      const { loc, fc } = await forecastForCity(city);
      return {
        city: loc.name || city,
        sunrise: fmtTime(fc.daily.sunrise[0], format24),
        sunset: fmtTime(fc.daily.sunset[0], format24),
      };
    } catch (err) {
      console.warn(`[time] sunrise/sunset fetch failed for "${city}" (${err.message})`);
      return { city, sunrise: '—', sunset: '—' };
    }
  },
};

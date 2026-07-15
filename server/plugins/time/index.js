// Time view — the clock itself ticks client-side; this plugin only carries config.
export default {
  id: 'time',
  name: 'Time',
  description: 'Giant ticking clock with date, sunrise and sunset.',
  defaultConfig: {
    showSeconds: true,
    showSun: true,
    // Placeholder values — wire a sunrise/sunset API (e.g. sunrise-sunset.org) here later.
    sunrise: '05:58',
    sunset: '20:31',
  },
  configSchema: [
    { key: 'showSeconds', label: 'Show seconds', type: 'toggle' },
    { key: 'showSun', label: 'Show sunrise / sunset', type: 'toggle' },
    { key: 'sunrise', label: 'Sunrise', type: 'text' },
    { key: 'sunset', label: 'Sunset', type: 'text' },
  ],
  getData(cfg) {
    return { sunrise: cfg.sunrise, sunset: cfg.sunset };
  },
};

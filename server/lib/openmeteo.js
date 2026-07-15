// Shared Open-Meteo client (free, no API key) used by the weather and time
// plugins. Geocodes city names and fetches forecasts, cached per location so
// multiple TVs and the 60s refresh tick don't re-hit the API.
const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

const FORECAST_TTL = 10 * 60 * 1000;
const GEO_RETRY_TTL = 5 * 60 * 1000; // how long a failed geocode is remembered

const geoCache = new Map(); // city (lowercased) -> { at, value } | { at, error }
const forecastCache = new Map(); // "lat,lon" -> { at, data }
const inflight = new Map(); // url -> promise

async function getJSON(url) {
  if (inflight.has(url)) return inflight.get(url);
  const p = (async () => {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  })().finally(() => inflight.delete(url));
  inflight.set(url, p);
  return p;
}

export async function geocode(city) {
  const key = String(city || '').trim().toLowerCase();
  if (!key) throw new Error('no city configured');
  const hit = geoCache.get(key);
  if (hit) {
    if (hit.value) return hit.value; // cities don't move — cache for the process lifetime
    if (Date.now() - hit.at < GEO_RETRY_TTL) throw new Error(hit.error);
  }
  try {
    const j = await getJSON(`${GEO_URL}?name=${encodeURIComponent(key)}&count=1&language=en&format=json`);
    const r = j.results?.[0];
    if (!r) throw new Error(`city not found: ${city}`);
    const value = { lat: r.latitude, lon: r.longitude, name: r.name, timezone: r.timezone || '' };
    geoCache.set(key, { at: Date.now(), value });
    return value;
  } catch (err) {
    geoCache.set(key, { at: Date.now(), error: err.message });
    throw err;
  }
}

// All times in the response are location-local ISO strings (timezone=auto);
// temperatures °C, wind km/h — unit conversion happens in the plugins.
export async function forecast(lat, lon) {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  const hit = forecastCache.get(key);
  if (hit && Date.now() - hit.at < FORECAST_TTL) return hit.data;
  const qs = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m',
    hourly: 'temperature_2m,precipitation_probability,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',
    timezone: 'auto',
    forecast_days: '2',
  });
  try {
    const data = await getJSON(`${FORECAST_URL}?${qs}`);
    forecastCache.set(key, { at: Date.now(), data });
    return data;
  } catch (err) {
    if (hit) return hit.data; // stale beats broken
    throw err;
  }
}

export async function forecastForCity(city) {
  const loc = await geocode(city);
  return { loc, fc: await forecast(loc.lat, loc.lon) };
}

const WMO = new Map([
  [0, 'Clear'], [1, 'Mostly sunny'], [2, 'Partly cloudy'], [3, 'Overcast'],
  [45, 'Fog'], [48, 'Fog'],
  [51, 'Light drizzle'], [53, 'Drizzle'], [55, 'Heavy drizzle'],
  [56, 'Freezing drizzle'], [57, 'Freezing drizzle'],
  [61, 'Light rain'], [63, 'Rain'], [65, 'Heavy rain'],
  [66, 'Freezing rain'], [67, 'Freezing rain'],
  [71, 'Light snow'], [73, 'Snow'], [75, 'Heavy snow'], [77, 'Snow grains'],
  [80, 'Light showers'], [81, 'Showers'], [82, 'Heavy showers'],
  [85, 'Snow showers'], [86, 'Snow showers'],
  [95, 'Thunderstorm'], [96, 'Thunderstorm'], [99, 'Thunderstorm'],
]);

export function condition(code) {
  return WMO.get(code) ?? 'Cloudy';
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export function compass(deg) {
  return COMPASS[Math.round((deg ?? 0) / 45) % 8];
}

// F1 view — next race countdown. MOCK 2026 schedule below; to wire a real
// feed, replace SCHEDULE with e.g. the Jolpica/Ergast API (https://api.jolpi.ca/ergast/f1/current.json)
// and keep the returned shape from getData identical.

const SCHEDULE = [
  // { round, name, circuit, date (race day, YYYY-MM-DD), timeLocal }
  { round: 13, name: 'British Grand Prix', circuit: 'Silverstone Circuit', date: '2026-07-19', time: '16:00' },
  { round: 14, name: 'Hungarian Grand Prix', circuit: 'Hungaroring', date: '2026-08-02', time: '15:00' },
  { round: 15, name: 'Belgian Grand Prix', circuit: 'Circuit de Spa-Francorchamps', date: '2026-08-23', time: '15:00' },
  { round: 16, name: 'Dutch Grand Prix', circuit: 'Circuit Zandvoort', date: '2026-08-30', time: '15:00' },
  { round: 17, name: 'Italian Grand Prix', circuit: 'Autodromo Nazionale Monza', date: '2026-09-06', time: '15:00' },
  { round: 18, name: 'Madrid Grand Prix', circuit: 'Madring', date: '2026-09-13', time: '15:00' },
  { round: 19, name: 'Azerbaijan Grand Prix', circuit: 'Baku City Circuit', date: '2026-09-27', time: '13:00' },
  { round: 20, name: 'Singapore Grand Prix', circuit: 'Marina Bay Street Circuit', date: '2026-10-11', time: '20:00' },
  { round: 21, name: 'United States Grand Prix', circuit: 'Circuit of the Americas', date: '2026-10-25', time: '14:00' },
  { round: 22, name: 'Mexico City Grand Prix', circuit: 'Autódromo Hermanos Rodríguez', date: '2026-11-01', time: '14:00' },
  { round: 23, name: 'São Paulo Grand Prix', circuit: 'Autódromo José Carlos Pace', date: '2026-11-08', time: '14:00' },
  { round: 24, name: 'Las Vegas Grand Prix', circuit: 'Las Vegas Strip Circuit', date: '2026-11-21', time: '22:00' },
  { round: 25, name: 'Qatar Grand Prix', circuit: 'Lusail International Circuit', date: '2026-11-29', time: '19:00' },
  { round: 26, name: 'Abu Dhabi Grand Prix', circuit: 'Yas Marina Circuit', date: '2026-12-06', time: '17:00' },
];

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default {
  id: 'f1',
  name: 'F1',
  description: 'Next Grand Prix with a days-to-lights-out countdown.',
  defaultConfig: {
    // Displayed next to the race time — session times in the mock schedule are
    // written in this timezone's local clock.
    timezone: 'Europe/London',
  },
  configSchema: [
    { key: 'timezone', label: 'Timezone label', type: 'text' },
  ],

  getData(cfg) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const next = SCHEDULE.find((r) => {
      const [y, m, d] = r.date.split('-').map(Number);
      return new Date(y, m - 1, d) >= today;
    });
    if (!next) return { none: true, season: 'Season finished — schedule needs updating.' };
    const [y, m, d] = next.date.split('-').map(Number);
    const raceDay = new Date(y, m - 1, d);
    const days = Math.round((raceDay - today) / 86400000);
    return {
      round: `Round ${next.round}`,
      name: next.name,
      circuit: next.circuit,
      dateLabel: `${WD[raceDay.getDay()]} ${d} ${MO[m - 1]}`,
      time: next.time,
      timezone: cfg.timezone || 'Europe/London',
      days: String(days),
      mock: true,
    };
  },
};

// ============================================================
// Schedule-based train simulation for MRT Line 6.
// Bangladesh Standard Time is UTC+6, fixed (no DST).
// ============================================================
import { ORDER, SEG, COORDS, SCHEDULES, HOLIDAYS } from './data.js';

const REV_ORDER = [...ORDER].reverse();
const REV_SEG = [...SEG].reverse();

// Real-world platform dwell is ~30s off-peak, up to ~60s in rush when more
// riders are boarding/alighting. Deterministic (seeded from the absolute
// clock minute + station index) so a given trip's schedule stays stable
// across re-renders instead of jittering every tick.
function isRushMinute(absMin) {
  const m = ((Math.floor(absMin) % 1440) + 1440) % 1440;
  return (m >= 480 && m < 600) || (m >= 1020 && m < 1140); // ~8–10am, ~5–7pm
}
function hash01(a, b) {
  const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return x - Math.floor(x);
}
function dwellMinutes(absMin, stationIdx) {
  const rush = isRushMinute(absMin);
  const lo = rush ? 0.75 : 0.5;  // 45s : 30s
  const hi = rush ? 1.0 : 0.75;  // 60s : 45s
  return lo + hash01(Math.floor(absMin), stationIdx) * (hi - lo);
}

// worst-case trip length (every dwell at its max) — used only to pre-filter
// which departures are worth building a full per-trip stop table for
const TOTAL_MAX = SEG.reduce((a, b) => a + b, 0) + (ORDER.length - 2) * 1.0;

// Build elapsed-from-departure -> point events for one specific trip.
// Intermediate platforms get two events (arrival + departure) at the same
// point, with a rush-aware dwell between them — each trip gets its own
// table since dwell depends on the absolute clock time of that arrival.
export function buildTripStops(dep, order, seg) {
  const stops = [];
  let e = 0;
  const c0 = COORDS[order[0]];
  stops.push({ e, x: c0[0], y: c0[1], station: order[0] }); // depart origin (no dwell)
  for (let i = 1; i < order.length; i++) {
    e += seg[i - 1]; // arrive station i
    const c = COORDS[order[i]];
    stops.push({ e, x: c[0], y: c[1], station: order[i] });
    if (i < order.length - 1) { // dwell at intermediate platform
      e += dwellMinutes(dep + e, i);
      stops.push({ e, x: c[0], y: c[1], station: order[i] });
    }
  }
  return stops;
}

// ---- time helpers ----
export const pad = (n) => String(n).padStart(2, '0');

export function dhakaNow() {
  const d = new Date(Date.now() + 6 * 3600 * 1000); // shift to BST, read as UTC
  return {
    dow: d.getUTCDay(), h: d.getUTCHours(), m: d.getUTCMinutes(), s: d.getUTCSeconds(),
    minOfDay: d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60 + d.getUTCMilliseconds() / 60000,
    iso: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
  };
}

export function fmt12(min) {
  min = ((min % 1440) + 1440) % 1440;
  let h = Math.floor(min / 60); const m = Math.floor(min % 60);
  const ap = h < 12 ? 'AM' : 'PM'; h = h % 12 || 12;
  return `${h}:${pad(m)} ${ap}`;
}

export function resolveDayType(now, override) {
  if (override && override !== 'auto') return override;
  if (HOLIDAYS.has(now.iso)) return 'govtHoliday';
  if (now.dow === 5) return 'friday';
  if (now.dow === 6) return 'saturday';
  return 'weekday';
}

export function serviceWindow(dayType) {
  const sc = SCHEDULES[dayType];
  return {
    start: Math.min(sc.south.first, sc.north.first),
    end: Math.max(sc.south.last, sc.north.last) + TOTAL_MAX,
  };
}

// ---- departure generation (iterative headway walk) ----
const _depCache = {};
export function getDeps(dayType, dir) {
  const key = dayType + '|' + dir;
  if (_depCache[key]) return _depCache[key];
  const cfg = SCHEDULES[dayType][dir];
  const out = [];
  let t = cfg.first, guard = 0;
  while (t <= cfg.last + 1e-6 && guard < 2000) {
    out.push(t);
    const band = cfg.bands.find((bb) => t <= bb.e + 1e-6) || cfg.bands[cfg.bands.length - 1];
    t += band.h;
    guard++;
  }
  _depCache[key] = out;
  return out;
}

// ---- position interpolation ----
// heading from the nearest moving segment, so a dwelling train stays aligned
function headingAt(stops, j) {
  for (let k = j; k < stops.length - 1; k++) {
    const dx = stops[k + 1].x - stops[k].x, dy = stops[k + 1].y - stops[k].y;
    if (dx * dx + dy * dy > 1e-6) return Math.atan2(dy, dx) * 180 / Math.PI;
  }
  for (let k = j; k > 0; k--) {
    const dx = stops[k].x - stops[k - 1].x, dy = stops[k].y - stops[k - 1].y;
    if (dx * dx + dy * dy > 1e-6) return Math.atan2(dy, dx) * 180 / Math.PI;
  }
  return 0;
}

// ease-in/out so a train visibly accelerates leaving a platform and brakes
// into the next one, instead of gliding at constant speed
function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
}

export function interp(stops, e) {
  let j = stops.length - 2;
  if (e <= stops[0].e) j = 0;
  else for (let k = 0; k < stops.length - 1; k++) { if (e <= stops[k + 1].e + 1e-9) { j = k; break; } }
  const a = stops[j], b = stops[j + 1];
  const f = (b.e - a.e) > 1e-9 ? (e - a.e) / (b.e - a.e) : 0;
  const moving = a.station !== b.station;
  const fPos = moving ? easeInOutQuad(f) : f;
  return {
    x: a.x + (b.x - a.x) * fPos, y: a.y + (b.y - a.y) * fPos, angle: headingAt(stops, j),
    prev: a.station, next: b.station, frac: f, dwell: !moving,
  };
}

export function activeTrains(deps, dir, nowMin) {
  const order = dir === 'south' ? ORDER : REV_ORDER;
  const seg = dir === 'south' ? SEG : REV_SEG;
  const out = [];
  for (const d of deps) {
    const rough = nowMin - d;
    if (rough < -1 || rough > TOTAL_MAX + 1) continue;
    const stops = buildTripStops(d, order, seg);
    const total = stops[stops.length - 1].e;
    const e = nowMin - d;
    if (e >= 0 && e <= total) out.push({ dep: d, e, total, ...interp(stops, e) });
  }
  return out;
}

// The fleet has 24 six-coach sets; ~14 are in passenger service at once.
// If the timetable replay would put more than that on the line at the same
// moment, only the longest-running ones (closest to finishing their trip)
// keep a slot — newer departures wait for one to free up before they "show".
export function capFleet(southT, northT, max = 14) {
  const combined = [
    ...southT.map((t) => ({ t, dir: 'south' })),
    ...northT.map((t) => ({ t, dir: 'north' })),
  ];
  if (combined.length <= max) return { south: southT, north: northT };
  combined.sort((a, b) => a.t.dep - b.t.dep);
  const kept = new Set(combined.slice(0, max).map((c) => c.dir + '|' + c.t.dep));
  return {
    south: southT.filter((t) => kept.has('south|' + t.dep)),
    north: northT.filter((t) => kept.has('north|' + t.dep)),
  };
}

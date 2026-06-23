// ============================================================
// Schedule-based train simulation for MRT Line 6.
// Bangladesh Standard Time is UTC+6, fixed (no DST).
// ============================================================
import { ORDER, SEG, COORDS, SCHEDULES, HOLIDAYS } from './data.js';

export const DWELL = 0.5; // minutes a train holds at every intermediate platform (30s)

// Build elapsed-from-departure -> point events for one direction.
// Intermediate platforms get two events (arrival + departure) at the same
// point, so the train sits still for DWELL minutes.
export function buildStops(order, seg) {
  const stops = [];
  let e = 0;
  const c0 = COORDS[order[0]];
  stops.push({ e, x: c0[0], y: c0[1], station: order[0] }); // depart origin (no dwell)
  for (let i = 1; i < order.length; i++) {
    e += seg[i - 1]; // arrive station i
    const c = COORDS[order[i]];
    stops.push({ e, x: c[0], y: c[1], station: order[i] });
    if (i < order.length - 1) { // dwell at intermediate platform
      e += DWELL;
      stops.push({ e, x: c[0], y: c[1], station: order[i] });
    }
  }
  return stops;
}

export const southStops = buildStops(ORDER, SEG);
export const northStops = buildStops([...ORDER].reverse(), [...SEG].reverse());
export const TOTAL = southStops[southStops.length - 1].e; // 37 running + 14×0.5 dwell = 44

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
    end: Math.max(sc.south.last, sc.north.last) + TOTAL,
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

export function interp(stops, e) {
  let j = stops.length - 2;
  if (e <= stops[0].e) j = 0;
  else for (let k = 0; k < stops.length - 1; k++) { if (e <= stops[k + 1].e + 1e-9) { j = k; break; } }
  const a = stops[j], b = stops[j + 1];
  const f = (b.e - a.e) > 1e-9 ? (e - a.e) / (b.e - a.e) : 0;
  return {
    x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, angle: headingAt(stops, j),
    prev: a.station, next: b.station, frac: f, dwell: (a.station === b.station),
  };
}

export function activeTrains(deps, stops, nowMin) {
  const out = [];
  for (const d of deps) {
    const e = nowMin - d;
    if (e >= 0 && e <= TOTAL) out.push({ dep: d, e, ...interp(stops, e) });
  }
  return out;
}

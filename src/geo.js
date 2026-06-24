// ============================================================
// Projects a real-world GPS fix onto the schematic SVG map.
// The map is drawn schematically (bends/lengths don't match true
// geography), so instead of a single global transform we snap the
// rider onto the nearest point of the *real* route polyline — the
// actual surveyed viaduct alignment from OpenStreetMap, not a rough
// station-to-station chord — then carry that same arc-length fraction
// onto the matching schematic pixel segment between the two bracketing
// stations, the same interpolation the train icons already use.
// ============================================================
import { ORDER, COORDS } from './data.js';
import { REAL_TRACK, REAL_BREAK } from './realRoute.js';

const LAT0 = REAL_TRACK.reduce((s, p) => s + p[0], 0) / REAL_TRACK.length;
const COS0 = Math.cos((LAT0 * Math.PI) / 180);
const KM_PER_DEG = 111.32;
const toUV = (lat, lon) => [lon * COS0 * KM_PER_DEG, lat * KM_PER_DEG]; // local planar km

const REAL = REAL_TRACK.map(([lat, lon]) => toUV(lat, lon));
const PIX = ORDER.map((n) => COORDS[n]);
const BREAK = ORDER.map((n) => REAL_BREAK[n]); // station index -> REAL_TRACK index

// cumulative arc length (km) along the real track, for arc-length fractions
const CUM = [0];
for (let i = 1; i < REAL.length; i++) {
  CUM.push(CUM[i - 1] + Math.hypot(REAL[i][0] - REAL[i - 1][0], REAL[i][1] - REAL[i - 1][1]));
}

// average pixel-per-km scale across the line, used to size the GPS accuracy ring
const PX_PER_KM = (() => {
  let pxLen = 0;
  for (let i = 0; i < PIX.length - 1; i++) pxLen += Math.hypot(PIX[i + 1][0] - PIX[i][0], PIX[i + 1][1] - PIX[i][1]);
  return pxLen / CUM[CUM.length - 1];
})();

// closest point on segment [a,b] to point p, all in the same planar units
function closestOnSegment(p, a, b) {
  const abx = b[0] - a[0], aby = b[1] - a[1];
  const apx = p[0] - a[0], apy = p[1] - a[1];
  const lenSq = abx * abx + aby * aby;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, (apx * abx + apy * aby) / lenSq));
  const cx = a[0] + abx * t, cy = a[1] + aby * t;
  return { t, dist: Math.hypot(p[0] - cx, p[1] - cy) };
}

// Snap a GPS fix onto the schematic map by finding the nearest point on the
// real-world route polyline, then mapping that same arc-length fraction onto
// the corresponding schematic pixel segment between the bracketing stations.
export function projectToRoute(lat, lon) {
  const p = toUV(lat, lon);
  let best = null;
  for (let i = 0; i < REAL.length - 1; i++) {
    const { t, dist } = closestOnSegment(p, REAL[i], REAL[i + 1]);
    if (!best || dist < best.dist) best = { i, t, dist };
  }
  const targetKm = CUM[best.i] + best.t * (CUM[best.i + 1] - CUM[best.i]);

  let s = 0;
  while (s < BREAK.length - 2 && BREAK[s + 1] <= best.i) s++;
  const kmA = CUM[BREAK[s]], kmB = CUM[BREAK[s + 1]];
  const frac = kmB > kmA ? Math.max(0, Math.min(1, (targetKm - kmA) / (kmB - kmA))) : 0;

  const [ax, ay] = PIX[s], [bx, by] = PIX[s + 1];
  return {
    x: ax + (bx - ax) * frac,
    y: ay + (by - ay) * frac,
    offRouteKm: best.dist,
    stationA: ORDER[s],
    stationB: ORDER[s + 1],
    t: frac,
  };
}

export function metersToPx(m) {
  return (m / 1000) * PX_PER_KM;
}

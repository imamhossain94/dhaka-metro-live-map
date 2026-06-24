// ============================================================
// Places a simulated train's (prevStation, nextStation, frac) onto the
// real-world OpenStreetMap alignment, by arc-length interpolation between
// the two stations' breakpoints on REAL_TRACK — so a train visibly follows
// the actual curves/doglegs of the line instead of a straight chord.
// ============================================================
import { ORDER } from './data.js';
import { REAL_TRACK, REAL_BREAK } from './realRoute.js';

const BREAK = ORDER.map((n) => REAL_BREAK[n]);

const CUM = [0];
for (let i = 1; i < REAL_TRACK.length; i++) {
  CUM.push(CUM[i - 1] + haversineKm(REAL_TRACK[i - 1], REAL_TRACK[i]));
}

function haversineKm([lat1, lon1], [lat2, lon2]) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// compass bearing (degrees, 0=north, clockwise) of the track from p1 to p2,
// using an equirectangular approximation — fine at this scale (~20km)
function bearing([lat1, lon1], [lat2, lon2]) {
  const cosLat = Math.cos((lat1 * Math.PI) / 180);
  const deg = (Math.atan2((lon2 - lon1) * cosLat, lat2 - lat1) * 180) / Math.PI;
  return (deg + 360) % 360;
}

// frac is the train's progress from prevStation toward nextStation (0..1),
// in whichever direction the line is being travelled
export function realPositionFor(prevStation, nextStation, frac) {
  const ia = BREAK[ORDER.indexOf(prevStation)];
  const ib = BREAK[ORDER.indexOf(nextStation)];
  const lo = Math.min(ia, ib), hi = Math.max(ia, ib);
  const reverse = ia > ib;

  const kmLo = CUM[lo], kmHi = CUM[hi];
  const along = reverse ? (1 - frac) : frac;
  const targetKm = kmLo + along * (kmHi - kmLo);

  let i = lo;
  while (i < hi - 1 && CUM[i + 1] < targetKm) i++;
  const i2 = Math.min(i + 1, hi);
  const km0 = CUM[i], km1 = CUM[i2];
  const t = km1 > km0 ? (targetKm - km0) / (km1 - km0) : 0;
  const p1 = REAL_TRACK[i], p2 = REAL_TRACK[i2];
  const lat = p1[0] + (p2[0] - p1[0]) * t, lon = p1[1] + (p2[1] - p1[1]) * t;
  const heading = (bearing(p1, p2) + (reverse ? 180 : 0)) % 360;
  return { lat, lon, heading };
}

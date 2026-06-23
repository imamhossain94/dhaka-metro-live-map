// ============================================================
// Projects a real-world GPS fix onto the schematic SVG map.
// The map is drawn schematically (bends/lengths don't match true
// geography), so instead of a single global transform we snap the
// rider onto the nearest point of the *real* route polyline (built
// from each station's approximate WGS84 coordinate), then carry that
// same segment-index + fraction onto the matching schematic pixel
// segment — the same interpolation the train icons already use.
// This is an approximation for visualization, not survey-accurate.
// ============================================================
import { ORDER, COORDS } from './data.js';

// Approximate WGS84 coordinates of MRT-6 stations (public-domain estimates).
export const GEO = {
  'Uttara North': [23.8731, 90.3997],
  'Uttara Center': [23.8640, 90.3998],
  'Uttara South': [23.8554, 90.3998],
  'Pallabi': [23.8401, 90.3994],
  'Mirpur 11': [23.8298, 90.3954],
  'Mirpur 10': [23.8067, 90.3686],
  'Kazipara': [23.7972, 90.3712],
  'Shewrapara': [23.7907, 90.3712],
  'Agargaon': [23.7779, 90.3795],
  'Bijoy Sarani': [23.7651, 90.3895],
  'Farmgate': [23.7561, 90.3895],
  'Karwan Bazar': [23.7508, 90.3927],
  'Shahbagh': [23.7383, 90.3958],
  'Dhaka University': [23.7322, 90.3956],
  'Bangladesh Secretariat': [23.7280, 90.4072],
  'Motijheel': [23.7332, 90.4172],
};

// published station-to-station distances (km), Uttara North -> Motijheel
const SEG_KM = [1.21, 1.6, 2.2, 0.8, 1.2, 1.0, 1.0, 1.47, 1.4, 1.21, 1.14, 1.35, 0.87, 1.38, 1.22];

const LAT0 = ORDER.reduce((s, n) => s + GEO[n][0], 0) / ORDER.length;
const COS0 = Math.cos((LAT0 * Math.PI) / 180);
const KM_PER_DEG = 111.32;
const toUV = (lat, lon) => [lon * COS0 * KM_PER_DEG, lat * KM_PER_DEG]; // local planar km

const REAL = ORDER.map((n) => toUV(...GEO[n]));
const PIX = ORDER.map((n) => COORDS[n]);

// average pixel-per-km scale across the line, used to size the GPS accuracy ring
const PX_PER_KM = (() => {
  let pxLen = 0;
  for (let i = 0; i < PIX.length - 1; i++) pxLen += Math.hypot(PIX[i + 1][0] - PIX[i][0], PIX[i + 1][1] - PIX[i][1]);
  const kmLen = SEG_KM.reduce((a, b) => a + b, 0);
  return pxLen / kmLen;
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
// real-world route polyline, then mapping that same (segment, fraction) onto
// the corresponding schematic pixel segment.
export function projectToRoute(lat, lon) {
  const p = toUV(lat, lon);
  let best = null;
  for (let i = 0; i < REAL.length - 1; i++) {
    const { t, dist } = closestOnSegment(p, REAL[i], REAL[i + 1]);
    if (!best || dist < best.dist) best = { i, t, dist };
  }
  const [ax, ay] = PIX[best.i], [bx, by] = PIX[best.i + 1];
  return {
    x: ax + (bx - ax) * best.t,
    y: ay + (by - ay) * best.t,
    offRouteKm: best.dist,
    stationA: ORDER[best.i],
    stationB: ORDER[best.i + 1],
    t: best.t,
  };
}

export function metersToPx(m) {
  return (m / 1000) * PX_PER_KM;
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function nearestStation(lat, lon) {
  let best = null, bestD = Infinity;
  for (const n of ORDER) {
    const [slat, slon] = GEO[n];
    const d = haversineKm(lat, lon, slat, slon);
    if (d < bestD) { bestD = d; best = n; }
  }
  return { station: best, distanceKm: bestD };
}

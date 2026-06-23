import { useMemo } from 'react';
import { ORDER, COORDS, BANGLA } from '../data.js';

const VB = '160 18 760 1716';
// perpendicular offset so the two directions ride opposite sides of the line:
// southbound (Uttara North -> Motijheel) rides Platform 2 / right side,
// northbound (Motijheel -> Uttara North) rides Platform 1 / left side.
const OFF = -9;

// offset a point (x,y) perpendicular to heading `rad`, by `off` units
function sideOffset(x, y, rad, off) {
  return [x - Math.sin(rad) * off, y + Math.cos(rad) * off];
}

const LBL = (() => {
  const o = {};
  ORDER.forEach((n) => { o[n] = { dx: 18, dy: 5, anchor: 'start', two: true }; });
  o['Dhaka University'] = { dx: 0, dy: 34, anchor: 'middle', two: false };
  o['Bangladesh Secretariat'] = { dx: 0, dy: -16, anchor: 'middle', two: false };
  o['Motijheel'] = { dx: 18, dy: 5, anchor: 'start', two: true };
  return o;
})();
const KAM_LBL = { dx: 18, dy: 5, anchor: 'start', two: false };

function Label({ n, x, y, cfg }) {
  const tx = x + cfg.dx, ty = y + cfg.dy;
  return (
    <text x={tx} y={ty} textAnchor={cfg.anchor} fontFamily="'IBM Plex Sans',sans-serif" fill="#171A19">
      <tspan fontSize="15" fontWeight="700">{n}</tspan>
      {cfg.two && <tspan x={tx} dy="15" fontSize="11.5" fontWeight="500" fill="#9A7A26">{BANGLA[n]}</tspan>}
    </text>
  );
}

function Train({ t, dir }) {
  const rad = t.angle * Math.PI / 180;
  const [ox, oy] = sideOffset(t.x, t.y, rad, OFF);
  const x = ox.toFixed(1);
  const y = oy.toFixed(1);
  const col = dir === 'south' ? '#E76F2A' : '#2563EB';
  return (
    <g transform={`translate(${x},${y}) rotate(${t.angle.toFixed(1)})`}>
      <rect x={-13} y={-6.5} width={26} height={13} rx={5} fill={col} stroke="#15110c" strokeWidth={1.1} filter="url(#trainShadow)" />
      <polygon points="13,0 8.5,-4.6 8.5,4.6" fill="#ffffff" opacity={0.9} />
      <rect x={-8.5} y={-3.4} width={3} height={6.8} rx={1} fill="#fff" opacity={0.8} />
      <rect x={-3} y={-3.4} width={3} height={6.8} rx={1} fill="#fff" opacity={0.8} />
    </g>
  );
}

export default function MetroMap({ southT, northT, myMarker }) {
  const P = ORDER.map((n) => COORDS[n]);
  const path = 'M' + P.map((p) => p.join(' ')).join(' L ');
  const mj = COORDS['Motijheel'], kp = COORDS['Kamlapur'];

  const activeStations = useMemo(() => {
    const set = new Set();
    [...southT, ...northT].forEach((t) => {
      ORDER.forEach((name, i) => {
        if ((t.dwell && t.prev === name) || (t.frac < 0.1 && t.prev === name) || (t.frac > 0.9 && t.next === name)) set.add(i);
      });
    });
    return set;
  }, [southT, northT]);

  return (
    <svg viewBox={VB} role="img" aria-label="Live MRT Line 6 map" style={{ display: 'block', width: '100%', height: 'auto' }}>
      <defs>
        <filter id="trainShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1.4" stdDeviation="1.6" floodColor="#000" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Kamlapur (under construction) dashed extension */}
      <line x1={mj[0]} y1={mj[1]} x2={kp[0]} y2={kp[1]} stroke="#B9B3A4" strokeWidth={5} strokeDasharray="7 7" strokeLinecap="round" />

      {/* line casing + core */}
      <path d={path} fill="none" stroke="#FFFFFF" strokeWidth={11} strokeLinejoin="round" strokeLinecap="round" />
      <path d={path} fill="none" stroke="#00594C" strokeWidth={5.5} strokeLinejoin="round" strokeLinecap="round" />

      {/* pulses for platforms with a train sitting at them */}
      {[...activeStations].map((i) => (
        <circle key={'p' + i} className="stn-pulse" cx={P[i][0]} cy={P[i][1]} r={10} fill={(i === 0 || i === 15) ? '#C8961E' : '#00594C'} />
      ))}

      {/* Kamlapur node + label */}
      <g><title>{`Kamlapur · ${BANGLA['Kamlapur']} (under construction)`}</title>
        <circle cx={kp[0]} cy={kp[1]} r={7} fill="#FFFFFF" stroke="#8C8678" strokeWidth={2} strokeDasharray="3 2.5" />
      </g>
      <Label n="Kamlapur" x={kp[0]} y={kp[1]} cfg={KAM_LBL} />

      {/* stations */}
      {ORDER.map((n, i) => {
        const [x, y] = P[i]; const term = (i === 0 || i === 15);
        return (
          <g key={n}>
            <title>{`${n} · ${BANGLA[n]}`}</title>
            {term ? (
              <>
                <circle cx={x} cy={y} r={10} fill="#C8961E" stroke="#fff" strokeWidth={2.5} />
                <circle cx={x} cy={y} r={3.4} fill="#00594C" />
              </>
            ) : (
              <circle cx={x} cy={y} r={6.6} fill="#FFFFFF" stroke="#00594C" strokeWidth={3} />
            )}
          </g>
        );
      })}
      {ORDER.map((n, i) => <Label key={'l' + n} n={n} x={P[i][0]} y={P[i][1]} cfg={LBL[n]} />)}

      {/* platform indicator at the Uttara North terminal: 1 left, 2 right */}
      {(() => {
        const a = COORDS['Uttara North'], b = COORDS['Uttara Center'];
        const rad = Math.atan2(b[1] - a[1], b[0] - a[0]);
        const [p1x] = sideOffset(a[0], a[1], rad, -OFF);
        const [p2x] = sideOffset(a[0], a[1], rad, OFF);
        return (
          <g>
            <line x1={p1x} y1={26} x2={p1x} y2={58} stroke="#2563EB" strokeWidth={2} strokeDasharray="2 2" />
            <line x1={p2x} y1={26} x2={p2x} y2={58} stroke="#E76F2A" strokeWidth={2} strokeDasharray="2 2" />
            <text x={p1x - 4} y={22} textAnchor="end" fontSize="10" fontWeight="700" fill="#2563EB">Platform 1</text>
            <text x={p2x + 4} y={22} textAnchor="start" fontSize="10" fontWeight="700" fill="#E76F2A">Platform 2</text>
          </g>
        );
      })()}

      {/* trains */}
      <g>
        {southT.map((t) => <Train key={'s' + t.dep} t={t} dir="south" />)}
        {northT.map((t) => <Train key={'n' + t.dep} t={t} dir="north" />)}
      </g>

      {/* live rider location (approximate, schematic projection) */}
      {myMarker && (
        <g>
          <circle cx={myMarker.x} cy={myMarker.y} r={myMarker.r} className="me-accuracy" />
          <circle cx={myMarker.x} cy={myMarker.y} r={9} className="me-pulse" />
          <circle cx={myMarker.x} cy={myMarker.y} r={6} fill="#7C3AED" stroke="#fff" strokeWidth={2.2} />
        </g>
      )}
    </svg>
  );
}

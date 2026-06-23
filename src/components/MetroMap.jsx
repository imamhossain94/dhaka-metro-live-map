import { useEffect, useMemo, useRef, useState } from 'react';
import { ORDER, COORDS, BANGLA } from '../data.js';
import useMediaQuery from '../hooks/useMediaQuery.js';

const VB_X = 160, VB_Y = 18, VB_W = 760, VB_H = 1716;
const VB = `${VB_X} ${VB_Y} ${VB_W} ${VB_H}`;
// mobile: crop to a genuinely zoomed-in 4:3 window — narrower than the full
// route width, so on-screen scale is actually larger than the desktop view,
// not just a shorter slice of it. The rider drags vertically to reveal more
// stations; the window auto-follows the line horizontally (it zigzags) so a
// separate horizontal drag isn't needed.
const ZOOM_W = 420;
const ZOOM_H = ZOOM_W * (3 / 4);
const PAN_MIN = VB_Y;
const PAN_MAX = VB_Y + VB_H - ZOOM_H;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const ROUTE_PTS = ORDER.map((n) => COORDS[n]);
// linear-interpolate the route's x at a given y, to re-center the zoomed
// window horizontally whenever the vertical pan position changes.
function routeXAtY(y) {
  if (y <= ROUTE_PTS[0][1]) return ROUTE_PTS[0][0];
  for (let i = 0; i < ROUTE_PTS.length - 1; i++) {
    const [x0, y0] = ROUTE_PTS[i], [x1, y1] = ROUTE_PTS[i + 1];
    if ((y >= y0 && y <= y1) || (y >= y1 && y <= y0)) {
      const t = y1 === y0 ? 0 : (y - y0) / (y1 - y0);
      return x0 + (x1 - x0) * t;
    }
  }
  return ROUTE_PTS[ROUTE_PTS.length - 1][0];
}
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

  const isMobile = useMediaQuery('(max-width: 860px)');
  const [panY, setPanY] = useState(VB_Y);
  const dragRef = useRef(null);
  const autoCenteredRef = useRef(false);

  // first time a live location appears, center the cropped view on it
  useEffect(() => {
    if (!isMobile || !myMarker) { autoCenteredRef.current = false; return; }
    if (!autoCenteredRef.current) {
      setPanY(clamp(myMarker.y - ZOOM_H / 2, PAN_MIN, PAN_MAX));
      autoCenteredRef.current = true;
    }
  }, [isMobile, myMarker]);

  const onPointerDown = (e) => {
    if (!isMobile) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startClientY: e.clientY,
      startPan: panY,
      heightPx: e.currentTarget.getBoundingClientRect().height,
    };
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const { startClientY, startPan, heightPx } = dragRef.current;
    const scale = ZOOM_H / heightPx;
    const next = startPan - (e.clientY - startClientY) * scale;
    setPanY(clamp(next, PAN_MIN, PAN_MAX));
  };
  const endDrag = () => { dragRef.current = null; };

  const panX = useMemo(() => {
    if (!isMobile) return VB_X;
    const cx = routeXAtY(panY + ZOOM_H / 2);
    return clamp(cx - ZOOM_W / 2, VB_X, VB_X + VB_W - ZOOM_W);
  }, [isMobile, panY]);

  const viewBox = isMobile ? `${panX} ${panY} ${ZOOM_W} ${ZOOM_H}` : VB;
  const scrollPct = PAN_MAX > PAN_MIN ? (panY - PAN_MIN) / (PAN_MAX - PAN_MIN) : 0;
  const thumbPct = ZOOM_H / VB_H;

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
    <div className={'map-viewport' + (isMobile ? ' cropped' : '')}>
    <svg
      viewBox={viewBox} role="img" aria-label="Live MRT Line 6 map"
      style={{ display: 'block', width: '100%', height: isMobile ? '100%' : 'auto', touchAction: isMobile ? 'none' : 'auto' }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={endDrag} onPointerCancel={endDrag} onPointerLeave={endDrag}
    >
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

    {isMobile && (
      <>
        <div className="map-scrollbar">
          <div className="thumb" style={{ height: `${thumbPct * 100}%`, top: `${scrollPct * (1 - thumbPct) * 100}%` }} />
        </div>
        <div className="map-hint">↕ Drag the map to see other stations</div>
      </>
    )}
    </div>
  );
}

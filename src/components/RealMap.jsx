import L from 'leaflet';
import { MapContainer, TileLayer, Polyline, CircleMarker, Circle, Marker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { BANGLA } from '../data.js';
import { REAL_TRACK, REAL_STATIONS } from '../realRoute.js';
import { realPositionFor } from '../realGeo.js';

const CENTER = [23.80, 90.385];

// a small train-shaped glyph (body + front + windows), drawn nose-up
// (north) by default so that rotate(heading) — heading is a compass
// bearing, 0=north — points it the right way along the real track
function trainIcon(color, heading) {
  const html = `<svg width="24" height="24" viewBox="-12 -12 24 24" style="transform:rotate(${heading.toFixed(1)}deg)">
    <rect x="-5" y="-8.5" width="10" height="17" rx="4" fill="${color}" stroke="#15110c" stroke-width="1.1"/>
    <polygon points="0,-8.5 -4.5,-4.5 4.5,-4.5" fill="#fff" opacity="0.9"/>
    <rect x="-2.4" y="-5.5" width="4.8" height="2.2" rx="0.8" fill="#fff" opacity="0.8"/>
    <rect x="-2.4" y="-2.2" width="4.8" height="2.2" rx="0.8" fill="#fff" opacity="0.8"/>
  </svg>`;
  return L.divIcon({ html, className: 'train-marker', iconSize: [24, 24], iconAnchor: [12, 12] });
}

function TrainDot({ t, dir }) {
  const { lat, lon, heading } = realPositionFor(t.prev, t.next, t.easedFrac);
  const col = dir === 'south' ? '#E76F2A' : '#2563EB';
  const dest = dir === 'south' ? 'Motijheel' : 'Uttara North';
  return (
    <Marker position={[lat, lon]} icon={trainIcon(col, heading)}>
      <Tooltip>→ {dest}{t.dwell ? ` · stopped at ${t.prev}` : ''}</Tooltip>
    </Marker>
  );
}

export default function RealMap({ southT, northT, myPos }) {
  return (
    <div className="real-map-wrap">
      <MapContainer center={CENTER} zoom={12} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline positions={REAL_TRACK} pathOptions={{ color: '#00594C', weight: 4, opacity: 0.9 }} />

        {REAL_STATIONS.map((s) => (
          <CircleMarker
            key={s.name} center={[s.lat, s.lon]} radius={5}
            pathOptions={{ color: '#00594C', weight: 2, fillColor: '#fff', fillOpacity: 1 }}
          >
            <Tooltip>{s.name} · {BANGLA[s.name] || ''}</Tooltip>
          </CircleMarker>
        ))}

        {southT.map((t) => <TrainDot key={'s' + t.dep} t={t} dir="south" />)}
        {northT.map((t) => <TrainDot key={'n' + t.dep} t={t} dir="north" />)}

        {myPos && (
          <>
            <Circle center={[myPos.lat, myPos.lon]} radius={Math.max(20, myPos.accuracy || 30)} pathOptions={{ color: '#7C3AED', weight: 1, fillOpacity: 0.12 }} />
            <CircleMarker center={[myPos.lat, myPos.lon]} radius={7} pathOptions={{ color: '#fff', weight: 2, fillColor: '#7C3AED', fillOpacity: 1 }}>
              <Tooltip>You are here (live GPS)</Tooltip>
            </CircleMarker>
          </>
        )}
      </MapContainer>
    </div>
  );
}

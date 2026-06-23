import { useState, useEffect, useMemo } from 'react';
import {
  dhakaNow, resolveDayType, getDeps, activeTrains,
  southStops, northStops,
} from './simulation.js';
import { projectToRoute, metersToPx } from './geo.js';
import useGeolocation from './hooks/useGeolocation.js';
import StatusBar from './components/StatusBar.jsx';
import MetroMap from './components/MetroMap.jsx';
import Controls from './components/Controls.jsx';
import TrainList from './components/TrainList.jsx';
import NextDepartures from './components/NextDepartures.jsx';
import Legend from './components/Legend.jsx';

export default function App() {
  const [live, setLive] = useState(true);
  const [dayOverride, setDayOverride] = useState('auto');
  const [scrub, setScrub] = useState(480);
  const [now, setNow] = useState(() => dhakaNow());
  const [locate, setLocate] = useState(false);
  const { position: myPos, error: geoError } = useGeolocation(locate);

  // tick the clock 4×/sec
  useEffect(() => {
    const id = setInterval(() => setNow(dhakaNow()), 250);
    return () => clearInterval(id);
  }, []);

  // when live, keep the scrubber synced to real time
  useEffect(() => { if (live) setScrub(Math.round(now.minOfDay)); }, [now, live]);

  const nowMin = live ? now.minOfDay : scrub;

  const dayType = useMemo(() => resolveDayType(now, dayOverride), [now.iso, now.dow, dayOverride]);
  const depSouth = useMemo(() => getDeps(dayType, 'south'), [dayType]);
  const depNorth = useMemo(() => getDeps(dayType, 'north'), [dayType]);
  const southT = useMemo(() => activeTrains(depSouth, southStops, nowMin), [depSouth, nowMin]);
  const northT = useMemo(() => activeTrains(depNorth, northStops, nowMin), [depNorth, nowMin]);

  const onScrub = (v) => { setLive(false); setScrub(v); };

  const myMarker = useMemo(() => {
    if (!myPos) return null;
    const proj = projectToRoute(myPos.lat, myPos.lon);
    const r = Math.max(7, Math.min(60, metersToPx(myPos.accuracy || 0)));
    return { ...proj, r };
  }, [myPos]);

  return (
    <>
      <header>
        <div className="header-inner">
          <div>
            <span className="line-badge"><span className="dot" />MRT Line 6 · Live</span>
            <h1>Dhaka Metro — Live Map</h1>
            <p className="subtitle">Real-time train positions on Bangladesh Standard Time · Uttara North ⇄ Motijheel</p>
          </div>
          <a className="top-link" href="/mrt6_fare_chart.html">Fare &amp; Route Chart →</a>
        </div>
      </header>

      <StatusBar
        live={live} now={now} nowMin={nowMin} dayType={dayType} dayOverride={dayOverride}
        south={southT.length} north={northT.length}
      />

      <div className="wrap">
        <div className="grid">
          <div className="card map-card">
            <MetroMap southT={southT} northT={northT} myMarker={myMarker} />
          </div>

          <div className="side">
            <div className="card panel">
              <Controls
                dayOverride={dayOverride} setDayOverride={setDayOverride}
                nowMin={nowMin} live={live} setLive={setLive} onScrub={onScrub}
                locate={locate} setLocate={setLocate} geoError={geoError} myMarker={myMarker}
              />
            </div>

            <div className="card panel">
              <h3>Trains Running Now ({southT.length + northT.length})</h3>
              <TrainList southT={southT} northT={northT} />
            </div>

            <div className="card panel">
              <h3>Next Departures</h3>
              <NextDepartures depSouth={depSouth} depNorth={depNorth} nowMin={nowMin} />
            </div>

            <div className="card panel">
              <h3>Legend</h3>
              <Legend />
            </div>
          </div>
        </div>

        <footer>
          <p><b>How positions are estimated:</b> trains are simulated from the official MRT-6 timetable (first/last train + headway bands) and the published station-to-station running times. Each train glides between stations in proportion to its scheduled segment time and pauses 30&nbsp;seconds at every platform (~44&nbsp;min end-to-end). This is a schedule-based estimate, not live GPS.</p>
          <p>Time source: your device clock converted to <b>Bangladesh Standard Time (UTC+6, no DST)</b>. Use the controls to preview any time of day or another day&rsquo;s schedule. Govt-holiday auto-detection uses fixed-date national holidays only — add Eid/lunar dates in the <code>HOLIDAYS</code> set in <code>src/data.js</code>.</p>
        </footer>
      </div>
    </>
  );
}

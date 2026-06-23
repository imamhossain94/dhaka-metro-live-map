import { fmt12 } from '../simulation.js';

const PRESETS = [[510, '8:30'], [780, '1:00 PM'], [1080, '6:00 PM'], [1305, '9:45 PM']];

export default function Controls({ dayOverride, setDayOverride, nowMin, live, setLive, onScrub }) {
  return (
    <>
      <h3>View Controls</h3>
      <div className="ctrl-row">
        <label htmlFor="daySel">Schedule day</label>
        <select id="daySel" value={dayOverride} onChange={(e) => setDayOverride(e.target.value)}>
          <option value="auto">Auto-detect (today)</option>
          <option value="weekday">Sunday–Thursday</option>
          <option value="friday">Friday</option>
          <option value="saturday">Saturday</option>
          <option value="govtHoliday">Govt. Holiday</option>
        </select>
      </div>
      <div className="ctrl-row">
        <div className="scrub-head">
          <label htmlFor="scrub">Time of day</label>
          <span className="scrub-val">{fmt12(nowMin)}</span>
        </div>
        <input
          type="range" id="scrub" min={0} max={1439} step={1}
          value={Math.round(nowMin)}
          onChange={(e) => onScrub(Number(e.target.value))}
        />
        <div className="btn-row">
          <button className={'btn live' + (live ? '' : ' off')} onClick={() => setLive(!live)}>
            {live ? '● LIVE' : '○ Go Live'}
          </button>
          {PRESETS.map(([v, l]) => (
            <button key={v} className="btn" onClick={() => onScrub(v)}>{l}</button>
          ))}
        </div>
      </div>
    </>
  );
}

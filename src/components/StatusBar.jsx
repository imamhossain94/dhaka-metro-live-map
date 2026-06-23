import { SCHEDULES } from '../data.js';
import { fmt12, pad, serviceWindow } from '../simulation.js';

export default function StatusBar({ live, now, nowMin, dayType, dayOverride, south, north }) {
  const sc = SCHEDULES[dayType];
  const { start, end } = serviceWindow(dayType);

  let closed = false, sLabel = 'In service';
  if (nowMin < start) { closed = true; sLabel = 'Opens ' + fmt12(start); }
  else if (nowMin > end) { closed = true; sLabel = 'Closed for the day'; }

  const h = live ? now.h : Math.floor(nowMin / 60);
  const clock = live
    ? `${pad(now.h)}:${pad(now.m)}:${pad(now.s)}`
    : `${pad(Math.floor(nowMin / 60))}:${pad(Math.floor(nowMin % 60))}`;
  const mer = h < 12 ? 'AM' : 'PM';
  const zone = live ? 'Asia/Dhaka · BST (UTC+6) · LIVE' : 'PREVIEW (simulated time)';
  const dayLbl = sc.label + (dayOverride === 'auto' && dayType === 'govtHoliday' ? ' (detected)' : '');

  return (
    <div className="statusbar">
      <div className="statusbar-inner">
        <div className="clock">
          <div>
            <span className="t">{clock}</span>
            <span className="mer">{mer}</span>
            <span className="zone">{zone}</span>
          </div>
        </div>
        <div className="pill"><span className="k">Schedule</span><span>{dayLbl}</span></div>
        <div className={'pill' + (closed ? ' closed' : '')}><span className="sv-dot" /><span>{sLabel}</span></div>
        <div className="count-grp">
          <div className="count south"><span className="sq" /><span className="n">{south}</span>→ Motijheel</div>
          <div className="count north"><span className="sq" /><span className="n">{north}</span>→ Uttara</div>
        </div>
      </div>
    </div>
  );
}

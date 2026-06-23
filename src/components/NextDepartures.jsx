import { fmt12 } from '../simulation.js';

function Group({ deps, dir, title, nowMin }) {
  const next = deps.filter((d) => d >= nowMin - 0.001).slice(0, 4);
  return (
    <div className={'dep-grp ' + dir}>
      <div className="lab"><span className="sq" />{title}</div>
      <div className="dep-times">
        {next.length ? next.map((d, idx) => {
          const mins = Math.round(d - nowMin);
          const soon = idx === 0 && mins <= 2;
          return (
            <span key={d} className={soon ? 'soon' : ''}>
              {fmt12(d)}<span style={{ opacity: 0.55 }}> · {mins <= 0 ? 'now' : mins + 'm'}</span>
            </span>
          );
        }) : (
          <span style={{ border: 'none', background: 'none', color: 'var(--ink-soft)' }}>— none left today —</span>
        )}
      </div>
    </div>
  );
}

export default function NextDepartures({ depSouth, depNorth, nowMin }) {
  return (
    <>
      <Group deps={depSouth} dir="south" title="From Uttara North → Motijheel" nowMin={nowMin} />
      <Group deps={depNorth} dir="north" title="From Motijheel → Uttara North" nowMin={nowMin} />
    </>
  );
}

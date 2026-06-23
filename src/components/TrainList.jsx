import { TOTAL, fmt12 } from '../simulation.js';

function statusText(t, dirSouth) {
  const dest = dirSouth ? 'Motijheel' : 'Uttara North';
  let sb;
  if (t.e < 0.2) sb = 'Departing ' + t.prev;
  else if (t.e > TOTAL - 0.2) sb = 'Arriving ' + dest;
  else if (t.dwell) sb = 'Stopped at ' + t.prev;
  else if (t.frac > 0.9) sb = 'Approaching ' + t.next;
  else sb = t.prev + ' → ' + t.next;
  return { hd: '→ ' + dest, sb: sb + '  ·  dep ' + fmt12(t.dep) };
}

export default function TrainList({ southT, northT }) {
  const all = [
    ...southT.map((t) => ({ t, s: true })),
    ...northT.map((t) => ({ t, s: false })),
  ].sort((a, b) => a.t.dep - b.t.dep);

  if (!all.length) return <div className="empty">No trains on the line right now.</div>;

  return (
    <div className="train-list">
      {all.map((o) => {
        const i = statusText(o.t, o.s);
        return (
          <div key={(o.s ? 's' : 'n') + o.t.dep} className={'train-item ' + (o.s ? 'south' : 'north')}>
            <div className="ico" />
            <div className="tx">
              <div className="hd">{i.hd}</div>
              <div className="sb">{i.sb}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

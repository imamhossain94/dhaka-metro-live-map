const ROWS = [
  { cls: 'active', label: 'Active operations', n: 14, note: 'running Uttara North ⇄ Motijheel' },
  { cls: 'standby', label: 'Standby', n: 3, note: 'for special requirements' },
  { cls: 'signal', label: 'Signal check', n: 1, note: 'empty run, every morning' },
  { cls: 'reserve', label: 'Reserve', n: 6, note: 'held out of service' },
];

export default function FleetInfo() {
  return (
    <div className="fleet">
      <div className="fleet-total">
        <span className="fleet-n">24</span>
        <span className="fleet-lbl">train sets · 6 coaches each</span>
      </div>
      <div className="fleet-rows">
        {ROWS.map((r) => (
          <div className="fleet-row" key={r.cls}>
            <span className={'fleet-dot ' + r.cls} />
            <span className="fleet-row-lbl">{r.label}<span className="fleet-row-note">{r.note}</span></span>
            <span className="fleet-row-n">{r.n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

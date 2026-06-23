export default function Legend() {
  return (
    <div className="legend">
      <div className="row"><span className="lg-line" /> MRT-6 line</div>
      <div className="row"><span className="lg-term" /> Terminal (Uttara North / Motijheel)</div>
      <div className="row"><span className="lg-stn" /> Station</div>
      <div className="row"><span className="lg-up" /> Kamlapur (under construction)</div>
      <div className="row"><span className="lg-s" /> Train → Motijheel (southbound)</div>
      <div className="row"><span className="lg-n" /> Train → Uttara North (northbound)</div>
    </div>
  );
}

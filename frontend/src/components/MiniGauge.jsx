// A small track showing where this year sits compared with normal.
export default function MiniGauge({ min, max, value, normal, worse, minLabel, maxLabel }) {
  const pos = (v) => `${Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100))}%`;
  const lo = Math.min(value, normal);
  const hi = Math.max(value, normal);
  return (
    <div className="gauge" aria-hidden="true">
      <div className="gauge-track">
        <div
          className={`gauge-gap${worse ? " is-worse" : ""}`}
          style={{ left: pos(lo), width: `calc(${pos(hi)} - ${pos(lo)})` }}
        />
        <div className="gauge-normal" style={{ left: pos(normal) }} />
        <div className={`gauge-dot${worse ? " is-worse" : ""}`} style={{ left: pos(value) }} />
      </div>
      <div className="gauge-labels">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

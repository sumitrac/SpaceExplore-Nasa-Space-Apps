import { VERDICTS, fmtValue } from "../lib/trends.js";

// Yearly values (dots) plus the Sen's slope line. Takes { label, units, series, trend } from the pipeline JSON.
export default function TrendChart({ doc, height = 180 }) {
  const { series, trend, units } = doc;
  const W = 520, H = height, pad = { l: 56, r: 12, t: 12, b: 26 };
  const ys = series.map((s) => s.value);
  const x0 = series[0].year, x1 = series[series.length - 1].year;
  const perYear = trend.slope_per_decade / 10;
  const sen = (yr) => trend.intercept + perYear * (yr - trend.first_year);
  let lo = Math.min(...ys, sen(x0), sen(x1));
  let hi = Math.max(...ys, sen(x0), sen(x1));
  if (units !== "deg C" && lo >= 0) lo = 0;
  if (hi === lo) hi = lo + 1;
  const sx = (yr) => pad.l + ((yr - x0) / Math.max(1, x1 - x0)) * (W - pad.l - pad.r);
  const sy = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const ticks = [lo, (lo + hi) / 2, hi];
  const yearTicks = [x0, Math.round((x0 + x1) / 2), x1];
  const line = series.map((s, i) => `${i ? "L" : "M"}${sx(s.year).toFixed(1)},${sy(s.value).toFixed(1)}`).join("");

  return (
    <svg className="trend-chart" viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={`${doc.label} each water year ${x0} to ${x1}, with the Sen's slope trend line`}>
      {ticks.map((v) => (
        <g key={v}>
          <line className="tc-grid" x1={pad.l} x2={W - pad.r} y1={sy(v)} y2={sy(v)} />
          <text className="tc-axis" x={pad.l - 6} y={sy(v) + 4} textAnchor="end">{fmtValue(v, units)}</text>
        </g>
      ))}
      {yearTicks.map((yr, i) => (
        <text key={yr} className="tc-axis" x={sx(yr)} y={H - 6}
          textAnchor={i === 0 ? "start" : i === yearTicks.length - 1 ? "end" : "middle"}>{yr}</text>
      ))}
      <path className="tc-line" d={line} />
      {series.map((s) => (
        <circle key={s.year} className="tc-dot" cx={sx(s.year)} cy={sy(s.value)} r="2.6">
          <title>{`Water year ${s.year}: ${fmtValue(s.value, units)}`}</title>
        </circle>
      ))}
      <line className={`tc-sen ${VERDICTS[trend.verdict]?.cls ?? ""}`} x1={sx(x0)} y1={sy(sen(x0))} x2={sx(x1)} y2={sy(sen(x1))} />
    </svg>
  );
}

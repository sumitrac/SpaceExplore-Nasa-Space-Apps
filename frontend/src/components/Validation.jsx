import TrendChart from "./TrendChart.jsx";
import { eq, fmtSlope, validationSentence } from "../lib/trends.js";

const METRIC_LABEL = { peak_swe: "Peak snowpack", summer_runoff: "Summer runoff", winter_runoff: "Winter runoff" };

function Comparison({ v }) {
  const label = METRIC_LABEL[v.metric] ?? v.metric;
  const g = v.ground.trend, m = v.model.trend;
  // Agree = both show no clear trend, or both show a significant trend in the same direction.
  const gSig = g.p_value < 0.05, mSig = m.p_value < 0.05;
  const agree = gSig === mSig && (!gSig || v.same_direction);
  return (
    <article className="trend-card" id={`val-${v.metric}-${v.ground_label.split(" ")[0]}`}>
      <header className="trend-card-head">
        <h3>{label}: {v.ground_label.replace(/ \(USGS.*\)/, "")}</h3>
        <span className={`verdict ${agree ? "is-real" : "is-none"}`}>
          {agree ? "Model agrees" : "Model disagrees"}
        </span>
      </header>
      <p className="trend-sentence">{validationSentence(v)}</p>
      <div className="val-charts">
        <div>
          <p className="val-label">Measured on the ground</p>
          <TrendChart doc={{ label: `${label} measured`, units: v.units, series: v.ground.series, trend: g }} height={140} />
        </div>
        <div>
          <p className="val-label">NASA model (NLDAS-2, Upper Cedar box)</p>
          <TrendChart doc={{ label: `${label} model`, units: v.units, series: v.model.series, trend: m }} height={140} />
        </div>
      </div>
      <dl className="trend-stats">
        <div><dt>Years</dt><dd>{v.n_years} ({v.first_year}–{v.last_year})</dd></div>
        <div><dt>Year-to-year match (r)</dt><dd>{v.correlation.toFixed(2)}</dd></div>
        <div><dt>Model ÷ measured</dt><dd>{v.model_to_ground_ratio.toFixed(2)}</dd></div>
        <div><dt>Slopes / decade</dt><dd>{fmtSlope(g.slope_per_decade, v.units)} vs {fmtSlope(m.slope_per_decade, v.units)}</dd></div>
      </dl>
      <p className="trend-source">
        p-values here are not FDR-adjusted ({eq("p", g.p_value)} measured, {eq("p", m.p_value)} model).
      </p>
    </article>
  );
}

export default function Validation({ items }) {
  if (!items?.length) return null;
  const order = { summer_runoff: 0, winter_runoff: 1, peak_swe: 2 };
  const sorted = [...items].sort((a, b) => order[a.metric] - order[b.metric]);
  return (
    <div className="validation" id="validation">
      <h3 className="opposite-title">Does the model match the real world?</h3>
      <p className="pair-intro">
        NASA’s NLDAS-2 is a computer model, so we checked it against real measurements: snow stations (NRCS SNOTEL)
        and river gauges upstream of Chester Morse Lake, where the dam does not change the flow (USGS).
        Each value is computed the same way as above.
      </p>
      <div className="trend-grid">
        {sorted.map((v) => <Comparison key={`${v.metric}-${v.ground_label}`} v={v} />)}
      </div>
    </div>
  );
}

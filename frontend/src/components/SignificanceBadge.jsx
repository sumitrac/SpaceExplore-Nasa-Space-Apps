import { formatSlope, trendVerb, VARIABLES } from "../lib/series.js";

function chanceText(p) {
  if (p < 0.01) return "fewer than 1 time in 100";
  const n = Math.round(p * 100);
  return `about ${n} time${n === 1 ? "" : "s"} in 100`;
}

/** Plain-language trend verdict with the math one click away. */
export default function SignificanceBadge({ varId, label, trend, baseline, range }) {
  if (trend.tooFew) {
    return (
      <div className="badge badge-neutral" role="status">
        <p className="badge-verdict">Not enough years</p>
        <p>Choose at least 8 years to test for a trend.</p>
      </div>
    );
  }

  const v = VARIABLES[varId];
  const worse = v.worseWhen && trend.direction === v.worseWhen;
  const relative =
    baseline > 0 && (v.unit === "mm" || v.unit === "cfs")
      ? ` (${Math.abs(Math.round((trend.slope * 1000) / baseline))}% of normal per decade)`
      : "";

  return (
    <div className={`badge ${trend.significant ? "badge-real" : "badge-chance"}${worse && trend.significant ? " is-worse" : ""}`} role="status">
      <p className="badge-verdict">{trend.significant ? "Real trend" : "Could be chance"}</p>
      <p className="badge-headline">
        {label} {trendVerb(varId, trend.direction)}: {formatSlope(varId, trend.slope)}
        {relative}.
      </p>
      <p>
        If nothing were really changing, a pattern this strong would show up by chance {chanceText(trend.p)}.
        {trend.significant ? " That’s rare enough to call it a trend." : " That’s too often to call it a trend."}
      </p>
      <details>
        <summary>Show the math</summary>
        <dl className="math">
          <div><dt>Test</dt><dd>Mann-Kendall, two-sided</dd></div>
          <div><dt>Years</dt><dd>{range[0]}–{range[1]} (n = {trend.n})</dd></div>
          <div><dt>Kendall’s S</dt><dd>{trend.S}</dd></div>
          <div><dt>Kendall’s τ</dt><dd>{trend.tau.toFixed(3)}</dd></div>
          <div><dt>z</dt><dd>{trend.z.toFixed(2)}</dd></div>
          <div><dt>p-value</dt><dd>{trend.p < 0.001 ? "< 0.001" : trend.p.toFixed(3)}</dd></div>
          <div><dt>Sen’s slope</dt><dd>{trend.slope.toFixed(3)} {v.unit || "days"} per year</dd></div>
          <div><dt>Threshold</dt><dd>p &lt; 0.05</dd></div>
        </dl>
        <p className="math-note">
          The test assumes each year is independent. Strong year-to-year memory in the data can make a
          trend look more certain than it is.
        </p>
      </details>
    </div>
  );
}

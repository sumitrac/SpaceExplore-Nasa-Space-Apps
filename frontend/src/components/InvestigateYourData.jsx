import { useState } from "react";
import { parseGiovanniCsv, seasonalSeries, analyzeTrend } from "../lib/trendStats.js";

const SEASONS = {
  "Summer (Jul to Sep)": [7, 8, 9],
  "Winter (Nov to Mar)": [11, 12, 1, 2, 3],
  "Spring (Apr to Jun)": [4, 5, 6],
  "Whole year": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
};

const VERDICTS = {
  real_trend: { label: "Real trend", color: "#1f7a3a" },
  borderline: { label: "Borderline", color: "#8a6d00" },
  cant_tell_yet: { label: "Can't tell yet", color: "#b26a00" },
  no_trend: { label: "No trend", color: "#6b7280" },
};

const fmt = (v, d = 1) => (v === null || v === undefined || !isFinite(v) ? "n/a" : (v > 0 ? "+" : "") + v.toFixed(d));

function Chart({ series, line }) {
  const W = 640, H = 240, P = 40;
  const xs = series.map((d) => d.year);
  const ys = [...series.map((d) => d.value), ...line.map((d) => d.value)];
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = Math.min(...ys), y1 = Math.max(...ys);
  const sx = (v) => P + ((v - x0) / (x1 - x0 || 1)) * (W - 2 * P);
  const sy = (v) => H - P - ((v - y0) / (y1 - y0 || 1)) * (H - 2 * P);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", color: "inherit" }} role="img"
         aria-label="Yearly values with trend line">
      <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="currentColor" opacity="0.3" />
      <line x1={P} y1={P} x2={P} y2={H - P} stroke="currentColor" opacity="0.3" />
      {series.map((d) => (
        <circle key={d.year} cx={sx(d.year)} cy={sy(d.value)} r="3.5" fill="currentColor" opacity="0.55" />
      ))}
      <polyline fill="none" stroke="#d1495b" strokeWidth="2.5"
                points={line.map((d) => `${sx(d.year)},${sy(d.value)}`).join(" ")} />
      <text x={P} y={H - 14} fontSize="12" fill="currentColor">{x0}</text>
      <text x={W - P} y={H - 14} fontSize="12" fill="currentColor" textAnchor="end">{x1}</text>
      <text x={P - 6} y={P + 4} fontSize="12" fill="currentColor" textAnchor="end">{y1.toFixed(0)}</text>
      <text x={P - 6} y={H - P} fontSize="12" fill="currentColor" textAnchor="end">{y0.toFixed(0)}</text>
    </svg>
  );
}

export default function InvestigateYourData() {
  const [file, setFile] = useState(null);
  const [season, setSeason] = useState("Summer (Jul to Sep)");
  const [how, setHow] = useState("sum");
  const [series, setSeries] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function run(f, s, h) {
    if (!f) return;
    try {
      setError("");
      const rows = parseGiovanniCsv(await f.text());
      const ser = seasonalSeries(rows, SEASONS[s], h);
      setSeries(ser);
      setResult(analyzeTrend(ser));
    } catch (e) {
      setSeries([]);
      setResult(null);
      setError(e.message);
    }
  }

  const verdict = result ? VERDICTS[result.verdict] : null;

  return (
    <section id="investigate" className="investigate" style={{ maxWidth: 760, margin: "3rem auto", padding: "0 1rem" }}>
      <h2>Investigate your own data</h2>
      <p>
        Download any area averaged time series from NASA Giovanni (any place, any variable), drop the CSV here,
        choose a season, and get an honest answer: is it changing, how fast, and is it real?
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", margin: "1rem 0" }}>
        <input type="file" accept=".csv,.txt"
               onChange={(e) => { const f = e.target.files[0]; setFile(f); run(f, season, how); }} />
        <select value={season} onChange={(e) => { setSeason(e.target.value); run(file, e.target.value, how); }}>
          {Object.keys(SEASONS).map((k) => <option key={k}>{k}</option>)}
        </select>
        <select value={how} onChange={(e) => { setHow(e.target.value); run(file, season, e.target.value); }}>
          <option value="sum">Total (rain, snowfall, runoff)</option>
          <option value="mean">Average (temperature, snowpack)</option>
        </select>
      </div>

      {error && <p style={{ color: "#d1495b" }}>⚠️ {error}</p>}

      {result && (
        <div style={{ border: "1px solid currentColor", borderRadius: 12, padding: "1rem 1.25rem", opacity: 0.95 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <strong>{season}, {result.firstYear} to {result.lastYear} ({result.n} years)</strong>
            <span style={{ background: verdict.color, color: "#fff", borderRadius: 999, padding: "0.2rem 0.75rem",
                           fontWeight: 600 }}>{verdict.label}</span>
          </div>
          <Chart series={series} line={result.trendLine} />
          <p style={{ margin: "0.5rem 0" }}>
            Change: <strong>{fmt(result.slopePerDecade, 2)} per decade</strong>
            {result.percentPerDecade !== null && <> ({fmt(result.percentPerDecade)}% of the average)</>}
            <br />
            95% range: {fmt(result.ciLow, 2)} to {fmt(result.ciHigh, 2)} per decade · p = {result.pValue.toFixed(3)}
            {result.verdict === "cant_tell_yet" && result.yearsToDetect !== null && (
              <><br />At this rate, about <strong>{result.yearsToDetect} more years</strong> of data would confirm it.</>
            )}
          </p>
          <small style={{ opacity: 0.7 }}>
            Quick check: Mann Kendall test with Sen's slope. "Real trend" requires p &lt; 0.05 and a 95% range that
            excludes zero. Our full analysis also corrects for autocorrelation and multiple testing.
          </small>
        </div>
      )}
    </section>
  );
}

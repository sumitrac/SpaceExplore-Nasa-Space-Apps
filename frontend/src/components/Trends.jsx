import { useEffect, useMemo, useState } from "react";

// Everything in this section is read from the pipeline output (data/processed -> public/data).
// Nothing here is hard-coded: if a region or variable is missing from index.json it is not shown.

const DATA_URL = `${import.meta.env.BASE_URL}data/`;

const REGIONS = {
  cedar: { name: "Cedar River", note: "Whole watershed box (upper + lower, 8 grid cells)" },
  cedarupper: { name: "Upper Cedar", note: "High, snowy zone east of Chester Morse Lake (6 grid cells)" },
  cedarlower: { name: "Lower Cedar", note: "Lower, rainier zone toward Landsburg (2 grid cells)" },
  tolt: { name: "South Fork Tolt", note: "Only 2 grid cells: treat as a rough signal" },
  seattle: { name: "Seattle city", note: "City box, for a city vs mountains contrast (4 grid cells)" },
};
const REGION_ORDER = ["cedar", "cedarupper", "cedarlower", "tolt", "seattle"];
const VAR_ORDER = ["peak_swe", "rain_fraction", "winter_temp", "total_precip", "winter_runoff",
  "summer_runoff", "snow_cover_days", "max_1day_rain", "heavy_rain_days"];

const VERDICTS = {
  real_trend: { badge: "Real trend", cls: "is-real" },
  borderline: { badge: "Borderline", cls: "is-borderline" },
  cant_tell_yet: { badge: "Can’t tell yet", cls: "is-cant-tell" },
  no_trend: { badge: "No clear trend", cls: "is-none" },
};

const regionName = (r) => REGIONS[r]?.name ?? r;
const sign = (x) => (x > 0 ? "+" : x < 0 ? "−" : "±");

// Shares (0-1) are shown as percent; slopes of shares as percentage points.
function fmtValue(v, units) {
  if (units === "share") return `${(v * 100).toFixed(0)}%`;
  const digits = Math.abs(v) < 10 ? 1 : 0;
  return `${v.toFixed(digits)} ${units === "deg C" ? "°C" : units}`;
}
function fmtSlope(v, units) {
  if (units === "share") return `${sign(v)}${Math.abs(v * 100).toFixed(1)} percentage points`;
  const u = units === "deg C" ? "°C" : ` ${units}`;
  const digits = Math.abs(v) < 1 ? 2 : Math.abs(v) < 10 ? 1 : 0;
  return `${sign(v)}${Math.abs(v).toFixed(digits)}${u}`;
}
const fmtP = (p) => (p < 0.001 ? "< 0.001" : p.toFixed(3));

function sentence(d) {
  const t = d.trend;
  const what = `${d.label} changed by ${fmtSlope(t.slope_per_decade, d.units)} per decade`;
  const pct = t.pct_of_mean_per_decade != null && d.units !== "share"
    ? ` (${sign(t.pct_of_mean_per_decade)}${Math.abs(t.pct_of_mean_per_decade).toFixed(0)}% of its average)`
    : "";
  switch (t.verdict) {
    case "real_trend":
      return `${what}${pct}, ${t.first_year}–${t.last_year}. That is statistically significant (q = ${fmtP(t.q_value)}).`;
    case "borderline":
      return `${what}${pct}. It is on the edge: the change looks big enough to detect, but after correcting for testing many things at once it does not pass (q = ${fmtP(t.q_value)}).`;
    case "cant_tell_yet":
      return `${what}${pct}, but that is not significant yet (q = ${fmtP(t.q_value)}). If it keeps going at this rate, roughly ${Math.ceil(t.years_to_detect)} more years of data would settle it.`;
    default:
      return `${what}${pct}. That is small next to the normal year-to-year swings, so the data shows no clear trend (q = ${fmtP(t.q_value)}).`;
  }
}

function TrendChart({ doc, height = 180 }) {
  const { series, trend, units } = doc;
  const W = 520, H = height, pad = { l: 52, r: 12, t: 12, b: 26 };
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
        <circle key={s.year} className="tc-dot" cx={sx(s.year)} cy={sy(s.value)} r="3">
          <title>{`Water year ${s.year}: ${fmtValue(s.value, units)}`}</title>
        </circle>
      ))}
      <line className={`tc-sen ${VERDICTS[trend.verdict]?.cls ?? ""}`} x1={sx(x0)} y1={sy(sen(x0))} x2={sx(x1)} y2={sy(sen(x1))} />
    </svg>
  );
}

function Badge({ verdict, years }) {
  const v = VERDICTS[verdict] ?? { badge: verdict, cls: "" };
  return (
    <span className={`verdict ${v.cls}`}>
      {v.badge}
      {verdict === "cant_tell_yet" && years != null ? ` · ~${Math.ceil(years)} more yrs` : ""}
    </span>
  );
}

function TrendCard({ doc, compact = false }) {
  const t = doc.trend;
  return (
    <article className="trend-card">
      <header className="trend-card-head">
        <h3>{doc.label}</h3>
        <Badge verdict={t.verdict} years={t.years_to_detect} />
      </header>
      <p className="trend-sentence">{sentence(doc)}</p>
      <TrendChart doc={doc} height={compact ? 150 : 180} />
      {!compact && <p className="trend-def">{doc.definition}</p>}
      <dl className="trend-stats">
        <div><dt>Sen’s slope / decade</dt><dd>{fmtSlope(t.slope_per_decade, doc.units)}</dd></div>
        <div><dt>95% range</dt><dd>{fmtSlope(t.ci_low, doc.units)} to {fmtSlope(t.ci_high, doc.units)}</dd></div>
        <div><dt>p / q</dt><dd>{fmtP(t.p_value)} / {fmtP(t.q_value)}</dd></div>
        <div><dt>Years</dt><dd>{t.n_years} ({t.first_year}–{t.last_year})</dd></div>
      </dl>
      <p className="trend-source">Source: {doc.source}. Dots: one value per water year (Oct–Sep). Line: Sen’s slope.</p>
    </article>
  );
}

function Pair({ title, intro, a, b }) {
  if (!a || !b) return null;
  return (
    <div className="pair">
      <h3>{title}</h3>
      <p className="pair-intro">{intro}</p>
      <div className="pair-grid">
        <TrendCard doc={a} compact />
        <TrendCard doc={b} compact />
      </div>
    </div>
  );
}

export default function Trends() {
  const [index, setIndex] = useState(null);
  const [docs, setDocs] = useState({});
  const [error, setError] = useState(null);
  const [region, setRegion] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch(`${DATA_URL}index.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`index.json: HTTP ${r.status}`))))
      .then(async (idx) => {
        const entries = await Promise.all(idx.map(async (row) => {
          const r = await fetch(`${DATA_URL}${row.region}_${row.variable}.json`);
          if (!r.ok) throw new Error(`${row.region}_${row.variable}.json: HTTP ${r.status}`);
          return [`${row.region}/${row.variable}`, await r.json()];
        }));
        if (!alive) return;
        setIndex(idx);
        setDocs(Object.fromEntries(entries));
      })
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, []);

  const regions = useMemo(() => {
    if (!index) return [];
    const present = [...new Set(index.map((r) => r.region))];
    const rank = (r) => (REGION_ORDER.includes(r) ? REGION_ORDER.indexOf(r) : 99);
    return present.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  }, [index]);
  const active = region ?? regions[0];
  const regionDocs = Object.values(docs)
    .filter((d) => d.region === active)
    .sort((a, b) => VAR_ORDER.indexOf(a.variable) - VAR_ORDER.indexOf(b.variable));
  const get = (v) => docs[`${active}/${v}`];
  const first = regionDocs[0]?.trend;

  return (
    <section id="trends" className="section" aria-labelledby="trends-title">
      <h2 id="trends-title">What the NASA data shows</h2>
      <p className="section-intro">
        Our own analysis of NASA model data, one value per water year. Pick a place, then read each
        variable’s verdict. A trend only counts as real if it passes a significance test.
      </p>

      {error && <p className="callout" role="alert">Could not load the analysis results ({error}).</p>}
      {!index && !error && <p className="trend-loading">Loading results…</p>}

      {index && (
        <>
          <div className="region-picker" role="tablist" aria-label="Region">
            {regions.map((r) => (
              <button key={r} role="tab" aria-selected={r === active} onClick={() => setRegion(r)}>
                {regionName(r)}
              </button>
            ))}
          </div>
          {REGIONS[active] && <p className="region-note">{REGIONS[active].note}</p>}

          <div className="trend-grid">
            {regionDocs.map((d) => <TrendCard key={d.variable} doc={d} />)}
          </div>

          {(get("winter_runoff") && get("summer_runoff")) || (get("rain_fraction") && get("peak_swe")) ? (
            <div className="opposite">
              <h3 className="opposite-title">Opposite trends? · {regionName(active)}</h3>
              <p className="pair-intro">
                Our hypothesis: warmer winters push winter numbers up and summer numbers down. Here is
                what the data says, side by side. Only the badge tells you whether a change is real.
              </p>
              <Pair title="Winter runoff vs summer runoff"
                intro="More water running off in Dec–Feb and less in Jul–Sep would mean the mountains are storing less for summer."
                a={get("winter_runoff")} b={get("summer_runoff")} />
              <Pair title="Rain fraction vs peak snowpack"
                intro="If more winter precipitation falls as rain, less piles up as snow."
                a={get("rain_fraction")} b={get("peak_swe")} />
            </div>
          ) : null}

          <aside className="methods" aria-labelledby="methods-title">
            <h3 id="methods-title">Data &amp; methods</h3>
            <ul>
              <li>
                <strong>Data.</strong> NASA NLDAS-2 monthly (Noah land model and forcing, 0.125° grid), area-averaged
                with NASA Giovanni{first ? `, water years ${first.first_year}–${first.last_year}` : ""}. The
                pipeline also supports GPM IMERG daily rain and MODIS MOD10A2 snow cover; those appear here only
                once the files are downloaded.
              </li>
              <li>
                <strong>Seasons removed.</strong> Each variable becomes one number per water year (Oct–Sep), for example
                the highest monthly snowpack or the Dec–Feb runoff total.
              </li>
              <li>
                <strong>Trend test.</strong> Mann-Kendall test with the Hamed-Rao correction for year-to-year
                autocorrelation; Sen’s slope for the rate of change, with a 95% range. p-values are adjusted for
                testing many series at once (Benjamini-Hochberg false discovery rate → q). “Real trend” means q &lt; 0.05.
              </li>
              <li>
                <strong>“More years needed”</strong> is a rough estimate: it assumes the trend continues in a straight
                line and the noise stays the same.
              </li>
              <li>
                <strong>Caveats.</strong> Region boxes are approximate rectangles, not official watershed outlines.
                NLDAS grid cells are about 12 km wide: the Tolt and Lower Cedar boxes are only 2 cells each, and model
                cells average over big elevation ranges, so snowpack is lower than at snow stations. These are model
                values, not direct measurements. A short record (about 25 years) makes real trends hard to detect.
              </li>
            </ul>
          </aside>
        </>
      )}
    </section>
  );
}

import DiscoveryPanel from "./DiscoveryPanel.jsx";
import { useEffect, useMemo, useState } from "react";
import TrendChart from "./TrendChart.jsx";
import ZoneMap from "./ZoneMap.jsx";
import Validation from "./Validation.jsx";
import { TOURS, TourPanel, buildSteps } from "./Tours.jsx";
import {
  DATA_URL,
  REGIONS,
  REGION_ORDER,
  TOPICS,
  VAR_ORDER,
  VERDICTS,
  fmtP,
  fmtSlope,
  regionName,
  sentence,
} from "../lib/trends.js";

// Everything in this section is read from the pipeline output (data/processed -> public/data).
// Nothing here is hard-coded: if a region or variable is missing from index.json it is not shown.

function Badge({ verdict, years }) {
  const v = VERDICTS[verdict] ?? { badge: verdict, cls: "" };
  return (
    <span className={`verdict ${v.cls}`}>
      {v.badge}
      {verdict === "cant_tell_yet" && years != null
        ? ` · ~${Math.ceil(years)} more yrs`
        : ""}
    </span>
  );
}

function TrendCard({ doc, compact = false }) {
  const t = doc.trend;
  return (
    <article
      className="trend-card"
      id={compact ? undefined : `card-${doc.variable}`}
    >
      <header className="trend-card-head">
        <h3>{doc.label}</h3>
        <Badge verdict={t.verdict} years={t.years_to_detect} />
      </header>
      <p className="trend-sentence">{sentence(doc)}</p>
      <TrendChart doc={doc} height={compact ? 150 : 180} />
      {!compact && <p className="trend-def">{doc.definition}</p>}
      <dl className="trend-stats">
        <div>
          <dt>Sen’s slope / decade</dt>
          <dd>{fmtSlope(t.slope_per_decade, doc.units)}</dd>
        </div>
        <div>
          <dt>95% range</dt>
          <dd>
            {fmtSlope(t.ci_low, doc.units)} to {fmtSlope(t.ci_high, doc.units)}
          </dd>
        </div>
        <div>
          <dt>p / q</dt>
          <dd>
            {fmtP(t.p_value)} / {fmtP(t.q_value)}
          </dd>
        </div>
        <div>
          <dt>Years</dt>
          <dd>
            {t.n_years} ({t.first_year}–{t.last_year})
          </dd>
        </div>
      </dl>
      <p className="trend-source">
        Source: {doc.source}. Dots: one value per water year (Oct–Sep). Line:
        Sen’s slope.
      </p>
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

async function getJson(name, optional = false) {
  const r = await fetch(`${DATA_URL}${name}`);
  if (!r.ok) {
    if (optional) return null;
    throw new Error(`${name}: HTTP ${r.status}`);
  }
  return r.json();
}

export default function Trends() {
  const [index, setIndex] = useState(null);
  const [docs, setDocs] = useState({});
  const [validation, setValidation] = useState([]);
  const [error, setError] = useState(null);
  const [region, setRegion] = useState(null);
  const [topic, setTopic] = useState(null);
  const [tour, setTour] = useState(null); // { id, step }

  useEffect(() => {
    let alive = true;
    (async () => {
      const idx = await getJson("index.json");
      const entries = await Promise.all(
        idx.map(async (row) => [
          `${row.region}/${row.variable}`,
          await getJson(`${row.region}_${row.variable}.json`),
        ]),
      );
      const val = await getJson("validation.json", true);
      if (!alive) return;
      setIndex(idx);
      setDocs(Object.fromEntries(entries));
      setValidation(val ?? []);
    })().catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  const regions = useMemo(() => {
    if (!index) return [];
    const rank = (r) =>
      REGION_ORDER.includes(r) ? REGION_ORDER.indexOf(r) : 99;
    return [...new Set(index.map((r) => r.region))].sort(
      (a, b) => rank(a) - rank(b) || a.localeCompare(b),
    );
  }, [index]);

  const tourDef = TOURS.find((t) => t.id === tour?.id);
  const steps = useMemo(
    () => (tourDef ? buildSteps(tourDef, docs, validation) : []),
    [tourDef, docs, validation],
  );
  const step = steps[tour?.step];
  const active = step?.region ?? region ?? regions[0];
  const activeTopic = TOPICS.find(
    (t) => t.id === (step?.topic ?? topic ?? "all"),
  );

  const regionDocs = Object.values(docs)
    .filter((d) => d.region === active)
    .filter((d) => !activeTopic.vars || activeTopic.vars.includes(d.variable))
    .sort(
      (a, b) => VAR_ORDER.indexOf(a.variable) - VAR_ORDER.indexOf(b.variable),
    );
  const get = (v) => docs[`${active}/${v}`];
  const first = Object.values(docs)[0]?.trend;
  const showValidation =
    Boolean(active?.startsWith("cedar")) &&
    activeTopic.id !== "temp" &&
    activeTopic.id !== "rain";

  const pick = (fn) => (v) => {
    setTour(null);
    fn(v);
  };

  return (
    <section id="trends" className="section" aria-labelledby="trends-title">
      <h2 id="trends-title">What the NASA data shows</h2>
      <p className="section-intro">
        Our own analysis of NASA model data, one value per water year. Pick a
        place, then read each variable’s verdict. A trend only counts as real if
        it passes a significance test.
      </p>

      {error && (
        <p className="callout" role="alert">
          Could not load the analysis results ({error}).
        </p>
      )}
      {!index && !error && <p className="trend-loading">Loading results…</p>}

      {index && (
        <>
          <div className="tour-start">
            <span>Take a guided tour:</span>
            {TOURS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTour({ id: t.id, step: 0 })}
                aria-pressed={tour?.id === t.id}
              >
                {t.title}
              </button>
            ))}
          </div>

          {tourDef && steps.length > 0 && (
            <TourPanel
              tour={tourDef}
              steps={steps}
              index={tour.step}
              onStep={(i) => setTour({ ...tour, step: i })}
              onClose={() => setTour(null)}
            />
          )}

          <div className="trends-explore">
            <div>
              <h3 className="explore-q">What do you want to investigate?</h3>
              <div className="region-picker" role="group" aria-label="Topic">
                {TOPICS.map((t) => (
                  <button
                    key={t.id}
                    aria-pressed={t.id === activeTopic.id}
                    onClick={() => pick(setTopic)(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <h3 className="explore-q">Where?</h3>
              <div className="region-picker" role="group" aria-label="Region">
                {regions.map((r) => (
                  <button
                    key={r}
                    aria-pressed={r === active}
                    onClick={() => pick(setRegion)(r)}
                  >
                    {regionName(r)}
                  </button>
                ))}
              </div>
              {REGIONS[active] && (
                <p className="region-note">{REGIONS[active].note}</p>
              )}
            </div>
            <ZoneMap
              regions={regions}
              active={active}
              onSelect={pick(setRegion)}
            />
          </div>

          <DiscoveryPanel region={active} get={get} />

          {regionDocs.length ? (
            <div className="trend-grid">
              {regionDocs.map((d) => (
                <TrendCard key={d.variable} doc={d} />
              ))}
            </div>
          ) : (
            <p className="region-note">
              No {activeTopic.label.toLowerCase()} variables for{" "}
              {regionName(active)} yet. Try another place or topic.
            </p>
          )}

          {(get("winter_runoff") && get("summer_runoff")) ||
          (get("rain_fraction") && get("peak_swe")) ? (
            <div className="opposite">
              <h3 className="opposite-title">
                Opposite trends? · {regionName(active)}
              </h3>
              <p className="pair-intro">
                Our hypothesis: warmer winters push winter numbers up and summer
                numbers down. Here is what the data says, side by side. Only the
                badge tells you whether a change is real.
              </p>
              <Pair
                title="Winter runoff vs summer runoff"
                intro="More water running off in Dec–Feb and less in Jul–Sep would mean the mountains are storing less for summer."
                a={get("winter_runoff")}
                b={get("summer_runoff")}
              />
              <Pair
                title="Rain fraction vs peak snowpack"
                intro="If more winter precipitation falls as rain, less piles up as snow."
                a={get("rain_fraction")}
                b={get("peak_swe")}
              />
            </div>
          ) : null}

          {showValidation && <Validation items={validation} />}

          <aside className="methods" aria-labelledby="methods-title">
            <h3 id="methods-title">Data &amp; methods</h3>
            <ul>
              <li>
                <strong>Data.</strong> NASA NLDAS-2 monthly (Noah land model and
                forcing, 0.125° grid), area-averaged with NASA Giovanni
                {first
                  ? `, water years ${first.first_year}–${first.last_year} (${first.n_years} years)`
                  : ""}
                . The pipeline also supports GPM IMERG daily rain and MODIS
                MOD10A2 snow cover; those appear here only once the files are
                downloaded.
              </li>
              <li>
                <strong>Ground checks.</strong> NRCS SNOTEL snow stations
                (Olallie Meadows, Rex River, Stampede Pass) and USGS river
                gauges 12115000 (Cedar River) and 12115500 (Rex River), both
                above Chester Morse Lake.
              </li>
              <li>
                <strong>Seasons removed.</strong> Each variable becomes one
                number per water year (Oct–Sep), for example the highest monthly
                snowpack or the Jul–Sep runoff total.
              </li>
              <li>
                <strong>Trend test.</strong> Mann-Kendall test with the
                Hamed-Rao correction for year-to-year autocorrelation; Sen’s
                slope for the rate of change, with a 95% range. p-values are
                adjusted for testing many series at once (Benjamini-Hochberg
                false discovery rate → q). “Real trend” means q &lt; 0.05.
              </li>
              <li>
                <strong>“More years needed”</strong> is a rough estimate: it
                assumes the trend continues in a straight line and the noise
                stays the same.
              </li>
              <li>
                <strong>Caveats.</strong> Region boxes are approximate
                rectangles, not official watershed outlines. NLDAS grid cells
                are about 12 km wide: the Tolt and Lower Cedar boxes are only 2
                cells each, and model cells average over big elevation ranges,
                so the model shows far less snow than the snow stations measure.
                These are model values; the ground checks show where the model
                agrees with measurements and where it does not.
              </li>
            </ul>
          </aside>
        </>
      )}
    </section>
  );
}

import { useMemo, useState } from "react";
import { useAppState } from "../state/AppState.jsx";
import { median } from "../lib/stats.js";
import { baselineValue, seasonalSeries } from "../lib/series.js";
import { GALLONS_PER_CCF, WATER_BILL_FACTS } from "../data/facts.js";
import WaterBillCard from "./WaterBillCard.jsx";

const LOW_SNOW = 0.7; // a "low-snow year" peaks below 70% of normal
const CUTS = [5, 10, 15, 20];

function useLowSnowEffect(data) {
  return useMemo(() => {
    const peak = seasonalSeries(data, "swe", "wy");
    const peakNormal = baselineValue(peak, "normal");
    const flowVar = data.monthly.streamflow ? "streamflow" : "runoff";
    const flow = seasonalSeries(data, flowVar, "summer");
    const flowNormal = baselineValue(flow, "normal");
    const flowPct = new Map(flow.map((p) => [p.year, (100 * p.value) / flowNormal]));

    const lowYears = peak.filter((p) => p.value < LOW_SNOW * peakNormal).map((p) => p.year);
    const otherYears = peak.filter((p) => p.value >= LOW_SNOW * peakNormal).map((p) => p.year);
    // Medians, to match how "normal" is defined everywhere else.
    const lowAvg = median(lowYears.map((y) => flowPct.get(y)));
    const otherAvg = median(otherYears.map((y) => flowPct.get(y)));

    const lastTen = peak.slice(-10);
    const recentLow = lastTen.filter((p) => p.value < LOW_SNOW * peakNormal).length;

    return { flowVar, lowYears, lowAvg, otherAvg, recentLow, lastTen: lastTen.map((p) => p.year) };
  }, [data]);
}

export default function Impact() {
  const { data, openInExplore } = useAppState();
  const e = useLowSnowEffect(data);
  const [lowCount, setLowCount] = useState(3);
  const [ccf, setCcf] = useState(6);
  const [cut, setCut] = useState(10);

  const flowWord = e.flowVar === "streamflow" ? "river flow" : "runoff";
  const shortfall = Math.max(0, Math.round(100 - e.lowAvg));
  const gallons = ccf * GALLONS_PER_CCF;
  const savedExact = (gallons * cut) / 100;
  const saved = Math.round(savedExact);
  const savedSeason = Math.round(savedExact * 4);

  return (
    <section id="impact" className="section impact" aria-labelledby="impact-title">
      <h2 id="impact-title">What it means downstream</h2>
      <p className="section-intro">
        Snow that melts in spring keeps rivers running through summer, when Seattle uses the most water
        and salmon need cold, steady flow.
      </p>

      <div className="impact-block">
        <h3>After a low-snow winter, late summer runs low</h3>
        <p>
          In the {data.name} record, {e.lowYears.length} winters peaked below {Math.round(LOW_SNOW * 100)}%
          of normal snowpack. Here’s the typical July–September {flowWord} that followed.
        </p>

        <div className="compare-bars" role="img" aria-label={`After low-snow winters, late-summer ${flowWord} averaged ${Math.round(e.lowAvg)}% of normal, compared with ${Math.round(e.otherAvg)}% after other winters.`}>
          {[
            ["After low-snow winters", e.lowAvg, true],
            ["After other winters", e.otherAvg, false],
          ].map(([label, val, low]) => (
            <div key={label} className="compare-bar">
              <span className="compare-bar-label">{label}</span>
              <span className="compare-bar-track">
                <span className={`compare-bar-fill${low ? " is-worse" : ""}`} style={{ width: `${Math.min(100, val / 1.5)}%` }} />
                <span className="compare-bar-normal" style={{ left: `${100 / 1.5}%` }} />
              </span>
              <span className="compare-bar-value">{Math.round(val)}% of normal</span>
            </div>
          ))}
        </div>

        <p className="year-chips-label">Low-snow years. Pick one to see its snowpack month by month:</p>
        <ul className="year-chips">
          {e.lowYears.map((y) => (
            <li key={y}>
              <button type="button" onClick={() => openInExplore("swe", "wy", { compareYear: y })}>
                {y}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="impact-block">
        <h3>What if the next decade has more of them?</h3>
        <label className="slider">
          <span className="slider-label">
            Low-snow winters in the next 10 years <strong>{lowCount}</strong>
          </span>
          <input
            type="range"
            min="0"
            max="10"
            step="1"
            value={lowCount}
            onChange={(ev) => setLowCount(Number(ev.target.value))}
            aria-valuetext={`${lowCount} of 10 winters`}
          />
        </label>
        <p className="decade-context">
          In the last 10 years of this record, {e.recentLow} of 10 winters were low-snow.
        </p>

        <ol className="decade" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => (
            <li key={i} className={i < lowCount ? "is-low" : undefined}>
              <span>Year {i + 1}</span>
            </li>
          ))}
        </ol>

        <p className="scenario-result" aria-live="polite">
          {lowCount === 0
            ? "With no low-snow winters, summers would start from a normal snowpack."
            : `${lowCount} of the next 10 summers would likely start with about ${shortfall}% less ${flowWord} than normal, based on what happened after past low-snow winters.`}
        </p>
        <ul className="pressures">
          <li>Reservoirs have to capture more winter rain early, which leaves less room to hold back floods.</li>
          <li>Utilities are more likely to ask customers to cut back in summer.</li>
          <li>Less cold water is left in the river for salmon in August and September.</li>
        </ul>
        <p className="footnote">A what-if built from this record, not a forecast.</p>
      </div>

      <div className="impact-block">
        <h3>How it reaches your water bill</h3>
        <ul className="bill-facts">
          {WATER_BILL_FACTS.map((f) => (
            <li key={f.title}>
              <strong>{f.title}</strong>
              <span>{f.body}</span>
            </li>
          ))}
        </ul>

        <div className="household">
          <h4>Your household in a dry summer</h4>
          <label className="slider">
            <span className="slider-label">
              Your summer use per month <strong>{ccf} CCF</strong>
            </span>
            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={ccf}
              onChange={(ev) => setCcf(Number(ev.target.value))}
              aria-valuetext={`${ccf} CCF, ${gallons.toLocaleString()} gallons`}
            />
          </label>
          <p className="control-help">Your bill lists use in CCF. One CCF is 748 gallons.</p>

          <fieldset className="segmented">
            <legend>If the city asks everyone to cut back by</legend>
            <div>
              {CUTS.map((c) => (
                <label key={c} className={c === cut ? "is-on" : undefined}>
                  <input type="radio" name="cut" checked={c === cut} onChange={() => setCut(c)} />
                  {c}%
                </label>
              ))}
            </div>
          </fieldset>

          <p className="household-result" aria-live="polite">
            You use about <strong>{gallons.toLocaleString()} gallons</strong> a month. A {cut}% cut saves{" "}
            <strong>{saved.toLocaleString()} gallons a month</strong>, or{" "}
            {savedSeason.toLocaleString()} gallons over the four-month peak season.
          </p>
        </div>

        <WaterBillCard />
      </div>
    </section>
  );
}

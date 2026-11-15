import { useMemo } from "react";
import { useAppState } from "../state/AppState.jsx";
import { baselineValue, dayToDate, latestYear, seasonalSeries } from "../lib/series.js";
import MiniGauge from "./MiniGauge.jsx";

function valueFor(series, year) {
  return series.find((p) => p.year === year)?.value ?? null;
}

export default function Glance() {
  const { data, openInExplore } = useAppState();
  const wy = latestYear(data);

  const cards = useMemo(() => {
    const out = [];

    const peak = seasonalSeries(data, "swe", "wy");
    const peakNow = valueFor(peak, wy);
    const peakNormal = baselineValue(peak, "normal");
    if (peakNow !== null) {
      const pct = (100 * peakNow) / peakNormal;
      out.push({
        id: "snow",
        label: "Peak snowpack",
        big: `${Math.round(pct)}% of normal`,
        detail: `${Math.round(peakNow)} mm of water vs. ${Math.round(peakNormal)} mm in a normal year`,
        gauge: { min: 0, max: 200, value: pct, normal: 100, worse: pct < 90, minLabel: "0%", maxLabel: "200%" },
        varId: "swe",
        season: "wy",
      });
    }

    const melt = seasonalSeries(data, "meltOut", "wy");
    const meltNow = valueFor(melt, wy);
    const meltNormal = baselineValue(melt, "normal");
    if (meltNow !== null) {
      const diff = Math.round(meltNow - meltNormal);
      out.push({
        id: "melt",
        label: "Snow melted out",
        big: diff === 0 ? "Right on time" : `${Math.abs(diff)} days ${diff < 0 ? "early" : "late"}`,
        detail: `${dayToDate(meltNow)} vs. ${dayToDate(meltNormal)} in a normal year`,
        gauge: { min: 60, max: 213, value: meltNow, normal: meltNormal, worse: diff < -7, minLabel: "Mar", maxLabel: "Aug" },
        varId: "meltOut",
        season: "wy",
      });
    }

    const rain = seasonalSeries(data, "rainShare", "winter");
    const rainNow = valueFor(rain, wy);
    const rainNormal = baselineValue(rain, "normal");
    if (rainNow !== null) {
      const diff = Math.round(rainNow - rainNormal);
      out.push({
        id: "rain",
        label: "Winter falling as rain",
        big: `${Math.round(rainNow)}%`,
        detail: `${diff >= 0 ? "+" : "−"}${Math.abs(diff)} points vs. ${Math.round(rainNormal)}% in a normal winter`,
        gauge: { min: 0, max: 100, value: rainNow, normal: rainNormal, worse: diff > 5, minLabel: "All snow", maxLabel: "All rain" },
        varId: "rainShare",
        season: "winter",
      });
    }

    const flowVar = data.monthly.streamflow ? "streamflow" : "runoff";
    const flow = seasonalSeries(data, flowVar, "summer");
    const flowNow = valueFor(flow, wy);
    const flowNormal = baselineValue(flow, "normal");
    if (flowNow !== null) {
      const pct = (100 * flowNow) / flowNormal;
      out.push({
        id: "flow",
        label: flowVar === "streamflow" ? "Late-summer river flow" : "Late-summer runoff",
        big: `${Math.round(pct)}% of normal`,
        detail: flowVar === "streamflow" ? `${Math.round(flowNow)} cfs on average, July–September` : "July–September",
        gauge: { min: 0, max: 200, value: pct, normal: 100, worse: pct < 90, minLabel: "0%", maxLabel: "200%" },
        varId: flowVar,
        season: "summer",
      });
    }
    return out;
  }, [data, wy]);

  return (
    <section id="glance" className="section glance" aria-labelledby="glance-title">
      <h2 id="glance-title">
        {data.name}, water year {wy}
      </h2>
      <p className="section-intro">
        October {wy - 1} to September {wy}, compared with a normal year (1991–2020). Pick a card to
        see every year.
      </p>

      <ul className="glance-grid">
        {cards.map((c) => (
          <li key={c.id}>
            <button type="button" className="glance-card" onClick={() => openInExplore(c.varId, c.season)}>
              <span className="glance-label">{c.label}</span>
              <span className={`glance-big${c.gauge.worse ? " is-worse" : ""}`}>{c.big}</span>
              <MiniGauge {...c.gauge} />
              <span className="glance-detail">{c.detail}</span>
              <span className="glance-link">See all years</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

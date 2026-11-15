import { fmtSlope, regionName } from "../lib/trends.js";

function isSignificant(doc) {
  return doc?.trend?.q_value < 0.05 && doc?.trend?.verdict === "real_trend";
}

export default function DiscoveryPanel({ region, get }) {
  const summer = get("summer_runoff");
  const winter = get("winter_runoff");
  const precip = get("total_precip");

  if (!summer) return null;

  const s = summer.trend;
  const w = winter?.trend;
  const p = precip?.trend;

  const summerDecline = isSignificant(summer) && s.slope_per_decade < 0;

  const winterIncrease = isSignificant(winter) && w.slope_per_decade > 0;

  const seasonalShift = summerDecline && winterIncrease;

  let headline;
  let explanation;

  if (seasonalShift) {
    headline = "Evidence of a seasonal runoff shift";
    explanation =
      "Winter runoff is increasing while summer runoff " +
      "is decreasing. Both trends pass the adjusted " +
      "significance threshold.";
  } else if (summerDecline) {
    headline = "Summer runoff is declining";
    explanation =
      "The model shows a statistically significant " +
      "summer decline. However, the data does not " +
      "establish a corresponding winter increase.";
  } else {
    headline = "The summer trend remains uncertain";
    explanation =
      "The available results do not establish a " +
      "statistically significant summer runoff decline.";
  }

  return (
    <section className="discovery-panel" aria-labelledby="discovery-title">
      <div className="discovery-eyebrow">
        CASCADEWATCH · SCIENTIFIC DISCOVERY
      </div>

      <h3 id="discovery-title">{headline}</h3>

      <p className="discovery-location">{regionName(region)} · 1980–2025</p>

      <p className="discovery-explanation">{explanation}</p>

      <div className="discovery-metrics">
        <div>
          <span>Summer runoff trend</span>
          <strong>
            {fmtSlope(s.slope_per_decade, summer.units)}
            <small> / decade</small>
          </strong>
        </div>

        <div>
          <span>Adjusted q-value</span>
          <strong>{s.q_value.toFixed(4)}</strong>
        </div>

        <div>
          <span>95% slope interval</span>
          <strong className="discovery-ci">
            {fmtSlope(s.ci_low, summer.units)}
            {" to "}
            {fmtSlope(s.ci_high, summer.units)}
          </strong>
        </div>
      </div>

      <div className="discovery-evidence">
        <h4>What else did we investigate?</h4>

        {w && (
          <p>
            <strong>Winter runoff:</strong>{" "}
            {isSignificant(winter)
              ? "Significant trend detected."
              : "No statistically significant trend detected."}
          </p>
        )}

        {p && (
          <p>
            <strong>Annual precipitation:</strong>{" "}
            {isSignificant(precip)
              ? "Significant trend detected."
              : "No statistically significant trend detected."}
          </p>
        )}

        <p>
          <strong>Seasonal redistribution:</strong>{" "}
          {seasonalShift
            ? "Both directional trend tests support the hypothesis."
            : "Not established by these trend tests."}
        </p>
      </div>

      <p className="discovery-caveat">
        Source: NASA NLDAS-2 Noah model. Trends use autocorrelation-aware
        Mann–Kendall testing and Benjamini–Hochberg adjusted q-values. Model
        runoff is not observed river discharge. Statistical association does not
        establish causation.
      </p>
    </section>
  );
}

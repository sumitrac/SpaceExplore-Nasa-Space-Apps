import { useMemo, useState } from "react";
import MountainScene, { elevationAt, WIDTH } from "./MountainScene.jsx";
import { SNOWLINE_MODEL } from "../data/facts.js";

const { todayM, metersPerDegreeC, snowpackLossPerDegreeC } = SNOWLINE_MODEL;

function shareBelow(snowlineM) {
  let below = 0;
  let total = 0;
  for (let x = 0; x <= WIDTH; x += 5) {
    total += 1;
    if (elevationAt(x) < snowlineM) below += 1;
  }
  return below / total;
}

export default function Hero() {
  const [warming, setWarming] = useState(0);
  const snowlineM = todayM + warming * metersPerDegreeC;
  const snowLoss = Math.min(1, warming * snowpackLossPerDegreeC);
  const rainShare = useMemo(() => shareBelow(snowlineM), [snowlineM]);

  const warmingLabel = warming === 0 ? "Today’s winters" : `${warming.toFixed(1)} °C warmer`;

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <h1 id="hero-title">Seattle’s water starts as snow.</h1>
        <p className="lede">
          Most of the city’s tap water falls on the Cedar River Watershed as winter snow. Warm the
          winter below and watch where rain takes its place.
        </p>
      </div>

      <MountainScene snowlineM={snowlineM} />

      <div className="hero-controls">
        <label className="slider">
          <span className="slider-label">
            Warm the winter <strong>{warmingLabel}</strong>
          </span>
          <input
            type="range"
            min="0"
            max="3"
            step="0.5"
            value={warming}
            onChange={(e) => setWarming(Number(e.target.value))}
            aria-valuetext={warmingLabel}
          />
        </label>

        <dl className="readouts">
          <div>
            <dt>Snow line</dt>
            <dd>{Math.round(snowlineM)} m</dd>
          </div>
          <div>
            <dt>April snowpack</dt>
            <dd className={snowLoss > 0 ? "is-loss" : undefined}>
              {snowLoss === 0 ? "Today" : `−${Math.round(snowLoss * 100)}%`}
            </dd>
          </div>
          <div>
            <dt>Slope getting rain</dt>
            <dd>{Math.round(rainShare * 100)}%</dd>
          </div>
        </dl>
      </div>

      <p className="footnote">
        Illustrative model: the snow line rises about 150 m for each 1 °C of warming, and April 1
        snowpack drops roughly 20% per 1 °C (University of Washington, 2009). Not a forecast.
      </p>
    </section>
  );
}

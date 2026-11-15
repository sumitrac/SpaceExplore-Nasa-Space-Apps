import { useEffect, useMemo, useRef, useState } from "react";
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
  const [playing, setPlaying] = useState(false);
  const direction = useRef(1);

  // "Play" walks the slider up to +3 °C and back down, one step at a time.
  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(() => {
      setWarming((w) => {
        if (w >= 3) direction.current = -1;
        if (w <= 0) direction.current = 1;
        return w + direction.current * 0.5;
      });
    }, 1100);
    return () => clearInterval(id);
  }, [playing]);
  const snowlineM = todayM + warming * metersPerDegreeC;
  const snowLoss = Math.min(1, warming * snowpackLossPerDegreeC);
  const rainShare = useMemo(() => shareBelow(snowlineM), [snowlineM]);

  const warmingLabel = warming === 0 ? "Today’s winters" : `${warming.toFixed(1)} °C warmer`;

  return (
    <section id="top" className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <h1 id="hero-title">Seattle’s water starts as snow.</h1>
        <p className="lede">
          Most of the city’s tap water falls on the Cedar River Watershed as winter snow. Warm the
          winter below and watch where rain takes its place.
        </p>
      </div>

      <MountainScene snowlineM={snowlineM} warmth={warming / 3} snowLoss={snowLoss} rainShare={rainShare} />

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
            onChange={(e) => {
              setPlaying(false);
              setWarming(Number(e.target.value));
            }}
            aria-valuetext={warmingLabel}
          />
        </label>

        <button
          type="button"
          className="play-btn"
          aria-pressed={playing}
          onClick={() => setPlaying((p) => !p)}
        >
          <span aria-hidden="true">{playing ? "❚❚" : "▶"}</span>
          {playing ? "Pause" : "Play the warming"}
        </button>

        <dl className="readouts">
          <div>
            <dt>Snow line</dt>
            <dd key={snowlineM}>{Math.round(snowlineM)} m</dd>
          </div>
          <div>
            <dt>April snowpack</dt>
            <dd key={snowLoss} className={snowLoss > 0 ? "is-loss" : undefined}>
              {snowLoss === 0 ? "Today" : `−${Math.round(snowLoss * 100)}%`}
            </dd>
          </div>
          <div>
            <dt>Slope getting rain</dt>
            <dd key={rainShare}>{Math.round(rainShare * 100)}%</dd>
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

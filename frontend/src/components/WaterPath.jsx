import { useState } from "react";
import { PATH_STEPS } from "../data/facts.js";

export default function WaterPath() {
  const [active, setActive] = useState(0);
  const step = PATH_STEPS[active];

  return (
    <section id="path" className="section" aria-labelledby="path-title">
      <h2 id="path-title">From snowflake to tap</h2>
      <p className="section-intro">Follow one winter’s snow through the system.</p>

      <ol className="path" role="tablist" aria-label="Steps from snow to tap">
        {PATH_STEPS.map((s, i) => (
          <li key={s.title} className={i <= active ? "path-step is-reached" : "path-step"}>
            <button
              type="button"
              role="tab"
              id={`path-tab-${i}`}
              aria-selected={i === active}
              aria-controls="path-panel"
              onClick={() => setActive(i)}
            >
              <span className="path-num">{i + 1}</span>
              <span className="path-name">{s.title}</span>
            </button>
          </li>
        ))}
      </ol>

      <div id="path-panel" role="tabpanel" aria-labelledby={`path-tab-${active}`} className="path-panel">
        <h3>{step.title}</h3>
        <p>{step.body}</p>
        <div className="path-nav">
          <button type="button" onClick={() => setActive(active - 1)} disabled={active === 0}>
            Previous step
          </button>
          <button
            type="button"
            onClick={() => setActive(active + 1)}
            disabled={active === PATH_STEPS.length - 1}
          >
            Next step
          </button>
        </div>
      </div>
    </section>
  );
}

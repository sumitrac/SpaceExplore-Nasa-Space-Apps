import { WINTER_2026 } from "../data/facts.js";

export default function WinterTimeline() {
  return (
    <section id="winter" className="section" aria-labelledby="winter-title">
      <h2 id="winter-title">One winter, a flood and a drought</h2>
      <p className="section-intro">
        The 2025–26 winter wasn’t dry. It was warm, so the water arrived as rain and left early.
      </p>

      <ol className="timeline">
        {WINTER_2026.map((e) => (
          <li key={e.date}>
            <time>{e.date}</time>
            <div>
              <h3>{e.title}</h3>
              <p>{e.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="callout">
        Seattle’s supply held. Operators stored winter rain in Chester Morse Lake, which sat 7.8 ft
        above its long-term average in April. Every low-snow year makes that balancing act between
        flood space and summer storage harder.
      </p>
    </section>
  );
}

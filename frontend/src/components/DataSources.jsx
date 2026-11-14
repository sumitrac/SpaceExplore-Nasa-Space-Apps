import { NASA_DATA, SOURCES } from "../data/facts.js";

export default function DataSources() {
  return (
    <section id="data" className="section" aria-labelledby="data-title">
      <h2 id="data-title">The data behind it</h2>

      <div className="data-grid">
        <div>
          <h3>NASA datasets we use</h3>
          <ul className="plain-list">
            {NASA_DATA.map((d) => (
              <li key={d.name}>
                <strong>{d.name}</strong>
                <span>{d.measures}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Sources for the facts on this page</h3>
          <ul className="plain-list">
            {SOURCES.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

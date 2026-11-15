import { useAppState } from "../state/AppState.jsx";
import { METHODS, NASA_DATA, NASA_DATA_INTRO, SOURCES } from "../data/facts.js";

export default function DataSources() {
  const { data } = useAppState();
  return (
    <section id="data" className="section" aria-labelledby="data-title">
      <h2 id="data-title">The data and how we tested it</h2>
      <p className="section-intro">
        {NASA_DATA_INTRO}{" "}
        {data.status === "sample"
          ? "The charts currently show sample data in the same format."
          : `Data last updated ${data.updated}.`}
      </p>

      <div className="data-grid">
        <div>
          <h3>Datasets</h3>
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
          <h3>Methods</h3>
          <ul className="plain-list">
            {METHODS.map((m) => (
              <li key={m.title}>
                <strong>{m.title}</strong>
                <span>{m.body}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <h3 className="sources-title">Sources for the facts on this page</h3>
      <ul className="plain-list sources">
        {SOURCES.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noreferrer">
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

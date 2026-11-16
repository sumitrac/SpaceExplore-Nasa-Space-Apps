import { useEffect, useRef } from "react";
import { useAppState, WATERSHEDS } from "../state/AppState.jsx";

const LINKS = [
  ["#mountain3d", "3D"],
  ["#glance", "This year"],
  ["#story", "What’s changing"],
  ["#explore", "Explore"],
  ["#trends", "Trends"],
  ["#impact", "Downstream"],
];

export default function Header() {
  const { watershedId, setWatershedId, data } = useAppState();
  const isSample = data.status === "sample";
  const ref = useRef(null);

  // Publish the header's height so pinned charts and scroll targets sit just below it.
  useEffect(() => {
    const el = ref.current;
    const set = () => document.documentElement.style.setProperty("--header-h", `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <header className="site-header" ref={ref}>
      <div className="header-inner">
        <a href="#top" className="brand">
          CascadeWatch
        </a>

        <fieldset className="watershed-switch">
          <legend>Watershed</legend>
          {Object.values(WATERSHEDS).map((w) => (
            <label key={w.id} className={w.id === watershedId ? "is-on" : undefined}>
              <input
                type="radio"
                name="watershed"
                value={w.id}
                checked={w.id === watershedId}
                onChange={() => setWatershedId(w.id)}
              />
              {w.name.replace(" River", "")}
            </label>
          ))}
        </fieldset>

        <nav aria-label="Sections">
          {LINKS.map(([href, label]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>
      </div>
      {isSample && (
        <p className="sample-banner" role="note">
          <span className="banner-long">
            Charts are showing sample data shaped like our NASA results. They switch to real NASA
            numbers when the team’s analysis is loaded.
          </span>
          <span className="banner-short">Showing sample data until NASA results are loaded.</span>
        </p>
      )}
    </header>
  );
}

import { regionName } from "../lib/trends.js";

// Schematic map of the analysis boxes (lon/lat from HANDOFF.md section 3, the same boxes sent to Giovanni)
// and the ground stations used for validation. Geometry only: no results are drawn here.
const BOXES = {
  cedarupper: [-121.72, 47.25, -121.33, 47.44],
  cedarlower: [-121.97, 47.32, -121.72, 47.46],
  tolt: [-121.70, 47.66, -121.53, 47.75],
  seattle: [-122.44, 47.49, -122.24, 47.74],
};
const POINTS = [
  { name: "Chester Morse Lake", lon: -121.70, lat: 47.387, kind: "lake" },
  { name: "Tolt Dam", lon: -121.69, lat: 47.693, kind: "lake" },
  { name: "Olallie Meadows SNOTEL", lon: -121.442, lat: 47.374, kind: "snotel" },
  { name: "Rex River SNOTEL", lon: -121.605, lat: 47.302, kind: "snotel" },
  { name: "Stampede Pass SNOTEL", lon: -121.342, lat: 47.274, kind: "snotel" },
  { name: "USGS 12115000 Cedar River gauge", lon: -121.625, lat: 47.370, kind: "gauge" },
  { name: "USGS 12115500 Rex River gauge", lon: -121.663, lat: 47.351, kind: "gauge" },
];
const EXT = { w: -122.55, e: -121.25, s: 47.2, n: 47.8 };
const K = Math.cos((47.5 * Math.PI) / 180); // squash longitude so the map is not stretched
const W = 600;
const H = Math.round((W * (EXT.n - EXT.s)) / ((EXT.e - EXT.w) * K));
const px = (lon) => ((lon - EXT.w) / (EXT.e - EXT.w)) * W;
const py = (lat) => ((EXT.n - lat) / (EXT.n - EXT.s)) * H;

export default function ZoneMap({ regions, active, onSelect }) {
  const selectable = (r) => regions.includes(r);
  const isActive = (r) => active === r || (active === "cedar" && (r === "cedarupper" || r === "cedarlower"));
  return (
    <figure className="zone-map">
      <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Map of the study areas. Choose a box to see its trends.">
        <rect className="zm-bg" width={W} height={H} />
        {Object.entries(BOXES).map(([r, [w, s, e, n]]) => {
          const ok = selectable(r);
          return (
            <g key={r} className={`zm-box ${isActive(r) ? "is-active" : ""} ${ok ? "" : "is-disabled"}`}
              role={ok ? "button" : undefined} tabIndex={ok ? 0 : undefined}
              aria-pressed={ok ? isActive(r) : undefined} aria-label={ok ? regionName(r) : undefined}
              onClick={() => ok && onSelect(r)}
              onKeyDown={(ev) => ok && (ev.key === "Enter" || ev.key === " ") && (ev.preventDefault(), onSelect(r))}>
              <rect x={px(w)} y={py(n)} width={px(e) - px(w)} height={py(s) - py(n)} />
              <text x={(px(w) + px(e)) / 2} y={py(n) - 6} textAnchor="middle">{regionName(r)}</text>
            </g>
          );
        })}
        {POINTS.map((p) => (
          <g key={p.name} className={`zm-pt zm-${p.kind}`}>
            {p.kind === "snotel" ? (
              <path d={`M${px(p.lon)},${py(p.lat) - 5} l5,9 h-10 z`} />
            ) : p.kind === "gauge" ? (
              <rect x={px(p.lon) - 3.5} y={py(p.lat) - 3.5} width="7" height="7" />
            ) : (
              <circle cx={px(p.lon)} cy={py(p.lat)} r="4.5" />
            )}
            <title>{p.name}</title>
          </g>
        ))}
      </svg>
      <figcaption>
        <span><i className="zm-key zm-key-lake" /> Reservoir</span>
        <span>
          <svg className="zm-key-svg zm-snotel" viewBox="0 0 12 12" aria-hidden="true"><path d="M6,1 l5,9 h-10 z" /></svg>
          SNOTEL snow station
        </span>
        <span><i className="zm-key zm-key-gauge" /> USGS river gauge</span>
        <span>Boxes are approximate rectangles, not watershed outlines.</span>
      </figcaption>
    </figure>
  );
}

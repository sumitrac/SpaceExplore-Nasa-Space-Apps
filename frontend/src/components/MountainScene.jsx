import { useMemo } from "react";
import { WATERSHED } from "../data/facts.js";

// A west-to-east cross-section of the Cedar River Watershed, drawn for
// storytelling. Elevations are illustrative except Chester Morse Lake.
export const WIDTH = 1000;
export const HEIGHT = 480;
const GROUND_Y = 452; // y position of 0 m
const PX_PER_M = 0.22;
export const yOf = (m) => GROUND_Y - m * PX_PER_M;

const LAKE_M = WATERSHED.chesterMorseLakeElevationM;
export const PROFILE = [
  [0, 120], [70, 170], [150, 240], [230, 360], [300, LAKE_M], [420, LAKE_M],
  [470, 640], [530, 900], [590, 820], [650, 1150], [710, 1040], [780, 1430],
  [845, 1700], [895, 1480], [945, 1620], [1000, 1380],
];

export function elevationAt(x) {
  for (let i = 0; i < PROFILE.length - 1; i += 1) {
    const [x1, e1] = PROFILE[i];
    const [x2, e2] = PROFILE[i + 1];
    if (x >= x1 && x <= x2) return e1 + ((x - x1) / (x2 - x1)) * (e2 - e1);
  }
  return PROFILE[PROFILE.length - 1][1];
}

const groundPath =
  `M0 ${HEIGHT} ` +
  PROFILE.map(([x, e]) => `L${x} ${yOf(e).toFixed(1)}`).join(" ") +
  ` L${WIDTH} ${HEIGHT} Z`;

// The surface line on its own, used to paint forest and snow as a layer on the slope.
const surfacePath = PROFILE.map(([x, e], i) => `${i === 0 ? "M" : "L"}${x} ${yOf(e).toFixed(1)}`).join(" ");

const riverPath = PROFILE.filter(([x]) => x <= 300)
  .map(([x, e], i) => `${i === 0 ? "M" : "L"}${x} ${(yOf(e) + 3).toFixed(1)}`)
  .join(" ");

function useParticles(count) {
  return useMemo(() => {
    // Deterministic pseudo-random so the drawing is stable between renders.
    let seed = 7;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    return Array.from({ length: count }, (_, i) => {
      const x = 12 + rand() * (WIDTH - 24);
      return { id: i, x, delay: rand() * 4, jitter: rand() };
    });
  }, [count]);
}

export default function MountainScene({ snowlineM }) {
  const particles = useParticles(56);
  const snowY = yOf(snowlineM);

  return (
    <svg
      className="scene"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`Cross-section of the Cedar River Watershed. Snow covers the mountains above ${Math.round(
        snowlineM
      )} meters; rain falls below that.`}
    >
      <defs>
        <clipPath id="mountain-clip">
          <path d={groundPath} />
        </clipPath>
        <mask id="above-snowline" maskUnits="userSpaceOnUse" x="0" y="0" width={WIDTH} height={HEIGHT}>
          <rect
            x="0"
            y={-HEIGHT}
            width={WIDTH}
            height={HEIGHT}
            fill="white"
            className="scene-snowmask"
            style={{ transform: `translateY(${snowY}px)` }}
          />
        </mask>
      </defs>

      <rect width={WIDTH} height={HEIGHT} className="scene-sky" />

      {/* elevation guide */}
      {[500, 1000, 1500].map((m) => (
        <g key={m} className="scene-grid">
          <line x1="0" x2={WIDTH} y1={yOf(m)} y2={yOf(m)} />
          <text x="8" y={yOf(m) - 6}>{m.toLocaleString()} m</text>
        </g>
      ))}

      {/* precipitation: what lands at each spot depends on its elevation */}
      <g aria-hidden="true">
        {particles.map((p) => {
          const landY = yOf(elevationAt(p.x));
          const isSnow = elevationAt(p.x) >= snowlineM;
          const style = {
            "--fall": `${landY - 24}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: isSnow ? `${3.6 + p.jitter * 1.6}s` : `${1.1 + p.jitter * 0.5}s`,
          };
          return isSnow ? (
            <circle key={p.id} className="particle snowflake" cx={p.x} cy="20" r="3" style={style} />
          ) : (
            <line key={p.id} className="particle raindrop" x1={p.x} x2={p.x - 2} y1="14" y2="26" style={style} />
          );
        })}
      </g>

      <path d={groundPath} className="scene-earth" />
      <g clipPath="url(#mountain-clip)">
        <path d={surfacePath} className="scene-band scene-forest" />
        <path d={surfacePath} className="scene-band scene-snow" mask="url(#above-snowline)" />
      </g>
      <path d={groundPath} className="scene-ridge" />

      <path d={riverPath} className="scene-river" />
      <rect
        x="300"
        y={yOf(LAKE_M) - 2}
        width="120"
        height="9"
        rx="4"
        className="scene-lake"
      />

      <g className="scene-snowline" style={{ transform: `translateY(${snowY}px)` }}>
        <line x1="0" x2={WIDTH} y1="0" y2="0" />
        <text x="150" y="-8">
          Snow line {Math.round(snowlineM)} m
        </text>
      </g>

      <text x="360" y={yOf(LAKE_M) - 14} textAnchor="middle" className="scene-label">
        Chester Morse Lake
      </text>
      <text x="16" y={yOf(170) - 16} className="scene-label">
        To Seattle
      </text>
      <text x="845" y={yOf(1700) - 12} textAnchor="middle" className="scene-label">
        Cascade crest
      </text>
    </svg>
  );
}

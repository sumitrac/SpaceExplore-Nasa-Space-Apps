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
const TREELINE_M = 1450;
const CLOUD_BASE_Y = 58; // precipitation starts falling from here

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

// Deterministic pseudo-random so the drawing is stable between renders.
function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function useParticles(count) {
  return useMemo(() => {
    const rand = seeded(7);
    return Array.from({ length: count }, (_, i) => {
      const x = 12 + rand() * (WIDTH - 24);
      return { id: i, x, delay: rand() * 4, jitter: rand() };
    });
  }, [count]);
}

const TREES = (() => {
  const rand = seeded(31);
  const trees = [];
  for (let x = 14; x < WIDTH - 8; x += 15 + rand() * 14) {
    if (x > 288 && x < 432) continue; // the lake
    const elev = elevationAt(x);
    if (elev > TREELINE_M) continue; // bare rock above treeline
    trees.push({ x, elev, h: 13 + rand() * 9 });
  }
  return trees;
})();

const CLOUDS = [
  { x: 520, y: 34, s: 1.15, dur: 70, delay: -20 },
  { x: 760, y: 48, s: 1.35, dur: 90, delay: -55 },
  { x: 260, y: 40, s: 0.9, dur: 80, delay: -5 },
];

function Cloud({ x, y, s, dur, delay }) {
  return (
    <g className="scene-cloud-drift" style={{ animationDuration: `${dur}s`, animationDelay: `${delay}s` }}>
      <g transform={`translate(${x} ${y}) scale(${s})`} className="scene-cloud">
        <ellipse cx="0" cy="10" rx="70" ry="16" />
        <circle cx="-30" cy="2" r="20" />
        <circle cx="4" cy="-8" r="27" />
        <circle cx="36" cy="2" r="19" />
      </g>
    </g>
  );
}

export default function MountainScene({ snowlineM, warmth = 0, snowLoss = 0, rainShare = 0 }) {
  const particles = useParticles(72);
  const snowY = yOf(snowlineM);

  return (
    <svg
      className="scene"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`Cross-section of the Cedar River Watershed. Snow covers the mountains above ${Math.round(
        snowlineM
      )} meters; rain falls below that and runs straight to the river.`}
    >
      <defs>
        <linearGradient id="sky-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="sky-top" />
          <stop offset="1" className="sky-bottom" />
        </linearGradient>
        <linearGradient id="warm-grad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" className="warm-stop" stopOpacity="0.55" />
          <stop offset="0.8" className="warm-stop" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="sun-glow">
          <stop offset="0.35" className="sun-stop" stopOpacity="0.55" />
          <stop offset="1" className="sun-stop" stopOpacity="0" />
        </radialGradient>
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
        <mask id="below-snowline" maskUnits="userSpaceOnUse" x="0" y="0" width={WIDTH} height={HEIGHT}>
          <rect
            x="0"
            y="0"
            width={WIDTH}
            height={HEIGHT}
            fill="white"
            className="scene-snowmask"
            style={{ transform: `translateY(${snowY}px)` }}
          />
        </mask>
      </defs>

      {/* sky: a warm glow rises from the valleys as the winter warms */}
      <rect width={WIDTH} height={HEIGHT} fill="url(#sky-grad)" />
      <rect width={WIDTH} height={HEIGHT} fill="url(#warm-grad)" className="scene-warm" style={{ opacity: warmth }} />

      <g className="scene-sun" style={{ opacity: 0.25 + warmth * 0.75 }} aria-hidden="true">
        <circle cx="120" cy="78" r="70" fill="url(#sun-glow)" className="scene-sun-glow" />
        <circle cx="120" cy="78" r="24" className="scene-sun-disc" />
      </g>

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
          const elev = elevationAt(p.x);
          const landY = yOf(elev);
          const isSnow = elev >= snowlineM;
          const duration = isSnow ? 3.6 + p.jitter * 1.6 : 1.1 + p.jitter * 0.5;
          const timing = { animationDelay: `${p.delay}s`, animationDuration: `${duration}s` };
          if (isSnow) {
            return (
              <circle
                key={p.id}
                className="particle snowflake"
                cx={p.x}
                cy={CLOUD_BASE_Y}
                r={2.4 + p.jitter * 1.4}
                style={{ ...timing, "--fall": `${landY - CLOUD_BASE_Y - 4}px` }}
              />
            );
          }
          return (
            <g key={p.id}>
              <line
                className="particle raindrop"
                x1={p.x}
                x2={p.x - 2}
                y1={CLOUD_BASE_Y - 6}
                y2={CLOUD_BASE_Y + 6}
                style={{ ...timing, "--fall": `${landY - CLOUD_BASE_Y - 6}px` }}
              />
              <ellipse className="splash" cx={p.x - 2} cy={landY - 1} rx="7" ry="2.2" style={timing} />
            </g>
          );
        })}
      </g>

      {/* forest on the slopes; trees above the snow line wear snow */}
      <g aria-hidden="true">
        {TREES.map((t) => {
          const base = yOf(t.elev) + 3;
          const w = t.h * 0.42;
          const snowy = t.elev >= snowlineM;
          return (
            <g key={t.x} className="scene-tree">
              <path
                d={`M${t.x} ${base - t.h} L${t.x + w} ${base} L${t.x - w} ${base} Z`}
                className="scene-tree-body"
              />
              <path
                d={`M${t.x} ${base - t.h} L${t.x + w * 0.5} ${base - t.h * 0.5} L${t.x - w * 0.5} ${base - t.h * 0.5} Z`}
                className={`scene-tree-cap${snowy ? " is-snowy" : ""}`}
              />
            </g>
          );
        })}
      </g>

      <path d={groundPath} className="scene-earth" />
      <g clipPath="url(#mountain-clip)">
        <path d={surfacePath} className="scene-band scene-forest" />
        <path
          d={surfacePath}
          className="scene-band scene-snow"
          mask="url(#above-snowline)"
          style={{ strokeWidth: 44 - snowLoss * 26 }}
        />
        {/* rain below the snow line doesn't wait for spring: it runs off right away */}
        <path
          d={surfacePath}
          className="scene-runoff"
          mask="url(#below-snowline)"
          transform="translate(0 5)"
          style={{ opacity: 0.35 + rainShare * 0.65 }}
        />
      </g>
      <path d={surfacePath} className="scene-ridge" pathLength="1" />

      <path d={riverPath} className="scene-river" style={{ strokeWidth: 4 + rainShare * 6 }} />
      <path d={riverPath} className="scene-river-flow" />
      <rect x="300" y={yOf(LAKE_M) - 2} width="120" height="9" rx="4" className="scene-lake" />
      <g className="scene-lake-shimmer" aria-hidden="true">
        <line x1="318" x2="340" y1={yOf(LAKE_M) + 2} y2={yOf(LAKE_M) + 2} />
        <line x1="362" x2="392" y1={yOf(LAKE_M) + 2} y2={yOf(LAKE_M) + 2} style={{ animationDelay: "-1.2s" }} />
      </g>

      {CLOUDS.map((c) => (
        <Cloud key={c.x} {...c} />
      ))}

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

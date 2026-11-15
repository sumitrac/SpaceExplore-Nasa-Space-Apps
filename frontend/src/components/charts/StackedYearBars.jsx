import { useMemo } from "react";
import useElementWidth from "../../hooks/useElementWidth.js";
import { useAppState } from "../../state/AppState.jsx";
import { linear, niceDomain, niceTicks } from "../../lib/scale.js";

const M = { top: 28, right: 14, bottom: 30, left: 56 };

/** Rain and snow stacked for each winter. */
export default function StackedYearBars({ rows, height = 320, ariaLabel, unitLabel = null }) {
  const [ref, width] = useElementWidth();
  const { hoverYear, setHoverYear } = useAppState();
  const years = rows.map((r) => r.year);
  const minY = Math.min(...years);
  const maxY = Math.max(...years);

  const { x, y, domain } = useMemo(() => {
    const hi = Math.max(...rows.map((r) => r.rain + r.snow));
    const dom = niceDomain(0, hi, 5, { zero: true });
    return {
      x: linear([minY - 0.6, maxY + 0.6], [M.left, width - M.right]),
      y: linear(dom, [height - M.bottom, M.top]),
      domain: dom,
    };
  }, [rows, width, height, minY, maxY]);

  const step = (width - M.left - M.right) / Math.max(1, maxY - minY + 1.2);
  const barW = Math.max(2, Math.min(22, step * 0.72));
  const yearStep = width < 520 ? 10 : 5;
  const hovered = rows.find((r) => r.year === hoverYear);

  function onPointerMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const yr = Math.round(x.invert(((e.clientX - rect.left) / rect.width) * width));
    if (yr >= minY && yr <= maxY) setHoverYear(yr);
  }
  function onKeyDown(e) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const i = years.indexOf(hoverYear);
    const next = i === -1 ? years.length - 1 : Math.min(years.length - 1, Math.max(0, i + (e.key === "ArrowRight" ? 1 : -1)));
    setHoverYear(years[next]);
  }

  return (
    <div className="chart" ref={ref}>
      <ul className="legend">
        <li><span className="swatch swatch-snow" /> Snow</li>
        <li><span className="swatch swatch-rain" /> Rain</li>
      </ul>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        role="img"
        aria-label={ariaLabel}
        tabIndex={0}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHoverYear(null)}
        onKeyDown={onKeyDown}
        onBlur={() => setHoverYear(null)}
      >
        {unitLabel && (
          <text className="unit-label" x={M.left - 8} y={10} textAnchor="end">
            {unitLabel}
          </text>
        )}
        {niceTicks(domain[0], domain[1], 5).map((t) => (
          <g key={t} className="axis-y">
            <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} />
            <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end">
              {t.toLocaleString("en-US")}
            </text>
          </g>
        ))}
        {years.filter((yr) => yr % yearStep === 0).map((yr) => (
          <text key={yr} className="axis-x" x={x(yr)} y={height - 8} textAnchor="middle">
            {yr}
          </text>
        ))}
        {hovered && (
          <rect className="hover-band" x={x(hovered.year) - step / 2} width={step} y={M.top - 8} height={height - M.top - M.bottom + 8} />
        )}
        {rows.map((r) => {
          const ySnowTop = y(r.snow);
          const yRainTop = y(r.snow + r.rain);
          return (
            <g key={r.year} className={r.year === hoverYear ? "is-hover" : undefined}>
              <rect className="bar-snow" x={x(r.year) - barW / 2} y={ySnowTop} width={barW} height={y(0) - ySnowTop} />
              <rect className="bar-rain" x={x(r.year) - barW / 2} y={yRainTop} width={barW} height={ySnowTop - yRainTop} />
            </g>
          );
        })}
      </svg>
      {hovered && (
        <div className="tooltip" style={{ left: Math.min(width - 150, Math.max(4, x(hovered.year) + 12)) }} role="status">
          <strong>Winter {hovered.year - 1}–{String(hovered.year).slice(2)}</strong>
          <span>Snow {Math.round(hovered.snow).toLocaleString()} mm</span>
          <span>Rain {Math.round(hovered.rain).toLocaleString()} mm</span>
          <span>{Math.round((100 * hovered.rain) / (hovered.rain + hovered.snow))}% fell as rain</span>
        </div>
      )}
    </div>
  );
}

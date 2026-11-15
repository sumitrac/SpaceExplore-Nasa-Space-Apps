import { useMemo } from "react";
import useElementWidth from "../../hooks/useElementWidth.js";
import { useAppState } from "../../state/AppState.jsx";
import { linear, niceDomain, niceTicks } from "../../lib/scale.js";

const M = { top: 28, right: 14, bottom: 30, left: 56 };

/**
 * One value per water year, drawn as bars, a line, or dots.
 * Hovering (or arrow keys when focused) highlights a year across every chart.
 */
export default function YearChart({
  series,
  mode = "bars",
  height = 320,
  baseline = null,
  baselineLabel = "Normal",
  trend = null,
  annotations = [],
  isLow = null,
  yTicks = null,
  yTickFormat = (v) => v.toLocaleString("en-US"),
  formatTooltip,
  zero = true,
  ariaLabel,
  unitLabel = null,
}) {
  const [ref, width] = useElementWidth();
  const { hoverYear, setHoverYear } = useAppState();

  const years = series.map((p) => p.year);
  const minY = Math.min(...years);
  const maxY = Math.max(...years);
  const values = series.map((p) => p.value);

  const scales = useMemo(() => {
    const extra = [baseline].filter((v) => v !== null && Number.isFinite(v));
    const lo = Math.min(...values, ...extra);
    const hi = Math.max(...values, ...extra);
    const domain = yTicks ? [yTicks[0], yTicks[yTicks.length - 1]] : niceDomain(lo, hi, 5, { zero: zero && lo >= 0 });
    const x = linear([minY - 0.6, maxY + 0.6], [M.left, width - M.right]);
    const y = linear(domain, [height - M.bottom, M.top]);
    return { x, y, domain };
  }, [values.join(","), baseline, width, height, minY, maxY, zero, yTicks]);

  const { x, y, domain } = scales;
  const ticks = yTicks || niceTicks(domain[0], domain[1], 5);
  const step = (width - M.left - M.right) / Math.max(1, maxY - minY + 1.2);
  const barW = Math.max(2, Math.min(22, step * 0.72));
  const yearStep = width < 520 ? 10 : 5;
  const xTicks = years.filter((yr) => yr % yearStep === 0);
  const zeroY = y(Math.max(domain[0], Math.min(domain[1], 0)));

  const hovered = series.find((p) => p.year === hoverYear);

  function onPointerMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    const yr = Math.round(x.invert(px));
    if (yr >= minY && yr <= maxY) setHoverYear(yr);
  }

  function onKeyDown(e) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const i = years.indexOf(hoverYear);
    const next = i === -1 ? years.length - 1 : Math.min(years.length - 1, Math.max(0, i + (e.key === "ArrowRight" ? 1 : -1)));
    setHoverYear(years[next]);
  }

  const linePath = series
    .map((p, i) => `${i ? "L" : "M"}${x(p.year).toFixed(1)} ${y(p.value).toFixed(1)}`)
    .join(" ");

  let trendPath = null;
  if (trend && !trend.tooFew && Number.isFinite(trend.slope)) {
    const ty = (yr) => y(trend.intercept + trend.slope * yr);
    trendPath = `M${x(minY)} ${ty(minY)} L${x(maxY)} ${ty(maxY)}`;
  }

  return (
    <div className="chart" ref={ref}>
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
        {ticks.map((t) => (
          <g key={t} className="axis-y">
            <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} />
            <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end">
              {yTickFormat(t)}
            </text>
          </g>
        ))}
        {xTicks.map((yr) => (
          <text key={yr} className="axis-x" x={x(yr)} y={height - 8} textAnchor="middle">
            {yr}
          </text>
        ))}

        {hovered && (
          <rect
            className="hover-band"
            x={x(hovered.year) - step / 2}
            width={step}
            y={M.top - 8}
            height={height - M.top - M.bottom + 8}
          />
        )}

        {mode === "bars" &&
          series.map((p) => {
            const y0 = zeroY;
            const y1 = y(p.value);
            return (
              <rect
                key={p.year}
                className={`bar${isLow?.(p) ? " is-low" : ""}${p.year === hoverYear ? " is-hover" : ""}`}
                x={x(p.year) - barW / 2}
                y={Math.min(y0, y1)}
                width={barW}
                height={Math.max(1, Math.abs(y1 - y0))}
                rx={Math.min(3, barW / 3)}
              />
            );
          })}

        {mode === "line" && <path className="series-line" d={linePath} />}
        {(mode === "line" || mode === "dots") &&
          series.map((p) => (
            <circle
              key={p.year}
              className={`dot${isLow?.(p) ? " is-low" : ""}${p.year === hoverYear ? " is-hover" : ""}`}
              cx={x(p.year)}
              cy={y(p.value)}
              r={p.year === hoverYear ? 6 : mode === "dots" ? 4.5 : 3.2}
            />
          ))}

        {baseline !== null && Number.isFinite(baseline) && (
          <g className="baseline">
            <line x1={M.left} x2={width - M.right} y1={y(baseline)} y2={y(baseline)} />
            <text x={width - M.right} y={y(baseline) - 6} textAnchor="end">
              {baselineLabel}
            </text>
          </g>
        )}

        {trendPath && (
          <path
            key={`${trend.slope}-${trend.intercept}`}
            className={`trend-line${trend.significant ? " is-significant" : ""}`}
            d={trendPath}
            pathLength="1"
          />
        )}

        {[...annotations]
          .sort((a, b) => a.year - b.year)
          .map((a, i) => {
            const p = series.find((s) => s.year === a.year);
            if (!p) return null;
            const ax = x(p.year);
            const ay = y(p.value);
            const ly = M.top + 2 + i * 17; // stack labels so they never collide
            const left = ax > width * 0.6;
            return (
              <g key={a.year} className="annotation">
                <line x1={ax} x2={ax} y1={ay - 6} y2={ly + 4} />
                <text x={left ? ax - 6 : ax + 6} y={ly} textAnchor={left ? "end" : "start"}>
                  {a.text}
                </text>
              </g>
            );
          })}
      </svg>

      {hovered && (
        <div
          className="tooltip"
          style={{ left: Math.min(width - 150, Math.max(4, x(hovered.year) + 12)) }}
          role="status"
        >
          <strong>Water year {hovered.year}</strong>
          {formatTooltip(hovered)}
        </div>
      )}
    </div>
  );
}

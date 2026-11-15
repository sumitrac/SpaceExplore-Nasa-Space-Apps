import { useMemo, useState } from "react";
import useElementWidth from "../../hooks/useElementWidth.js";
import { linear, niceDomain, niceTicks } from "../../lib/scale.js";
import { MONTHS } from "../../lib/series.js";

const M = { top: 24, right: 14, bottom: 30, left: 56 };

/**
 * Months October–September on the x axis, one line per series.
 * lines: [{ id, label, values: number[12], tone: "a" | "b" | "normal" }]
 */
export default function MonthChart({ lines, height = 300, shadeMonths = null, shadeLabel, format, ariaLabel, unitLabel = null }) {
  const [ref, width] = useElementWidth();
  const [hover, setHover] = useState(null);

  const { x, y, domain } = useMemo(() => {
    const all = lines.flatMap((l) => l.values).filter((v) => Number.isFinite(v));
    const lo = Math.min(...all);
    const dom = niceDomain(lo, Math.max(...all), 5, { zero: lo >= 0 });
    return {
      x: linear([-0.4, 11.4], [M.left, width - M.right]),
      y: linear(dom, [height - M.bottom, M.top]),
      domain: dom,
    };
  }, [lines, width, height]);

  function onPointerMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.round(x.invert(((e.clientX - rect.left) / rect.width) * width));
    setHover(i >= 0 && i <= 11 ? i : null);
  }
  function onKeyDown(e) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    setHover((h) => (h === null ? 0 : Math.min(11, Math.max(0, h + (e.key === "ArrowRight" ? 1 : -1)))));
  }

  const path = (vals) =>
    vals
      .map((v, i) => (Number.isFinite(v) ? `${i && Number.isFinite(vals[i - 1]) ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}` : ""))
      .join(" ");

  return (
    <div className="chart" ref={ref}>
      <ul className="legend">
        {lines.map((l) => (
          <li key={l.id}>
            <span className={`swatch swatch-${l.tone}`} /> {l.label}
          </li>
        ))}
      </ul>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        role="img"
        aria-label={ariaLabel}
        tabIndex={0}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHover(null)}
        onKeyDown={onKeyDown}
        onBlur={() => setHover(null)}
      >
        {shadeMonths && (
          <g className="shade">
            <rect
              x={x(shadeMonths[0] - 0.5)}
              width={x(shadeMonths[1] + 0.5) - x(shadeMonths[0] - 0.5)}
              y={M.top - 10}
              height={height - M.top - M.bottom + 10}
            />
            <text x={x((shadeMonths[0] + shadeMonths[1]) / 2)} y={M.top + 4} textAnchor="middle">
              {shadeLabel}
            </text>
          </g>
        )}
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
        {MONTHS.map((m, i) => (
          <text key={m} className="axis-x" x={x(i)} y={height - 8} textAnchor="middle">
            {width < 480 ? m[0] : m}
          </text>
        ))}
        {hover !== null && <line className="hover-rule" x1={x(hover)} x2={x(hover)} y1={M.top - 6} y2={height - M.bottom} />}
        {lines.map((l) => (
          <g key={l.id} className={`month-line tone-${l.tone}`}>
            <path d={path(l.values)} />
            {l.values.map((v, i) =>
              Number.isFinite(v) ? <circle key={i} cx={x(i)} cy={y(v)} r={hover === i ? 5.5 : 3} /> : null
            )}
          </g>
        ))}
      </svg>
      {hover !== null && (
        <div className="tooltip" style={{ left: Math.min(width - 170, Math.max(4, x(hover) + 12)) }} role="status">
          <strong>{MONTHS[hover]}</strong>
          {lines.map((l) => (
            <span key={l.id}>
              {l.label}: {format(l.values[hover])}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

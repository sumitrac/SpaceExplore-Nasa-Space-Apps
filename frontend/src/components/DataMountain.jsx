import { useEffect, useMemo, useRef, useState } from "react";
import { useAppState } from "../state/AppState.jsx";
import { MONTHS, monthlyProfile, waterYears, formatValue } from "../lib/series.js";
import { prefersReducedMotion } from "../hooks/useCountUp.js";
import useInView from "../hooks/useInView.js";

// What the height of the landscape can show.
const LAYERS = [
  { id: "runoff", label: "Runoff", unit: "mm", ramp: ["#7a3414", "#e2a35a", "#e8efe9", "#5cc3e6", "#1d5fa8"] },
  { id: "swe", label: "Snowpack", unit: "mm", ramp: ["#33424d", "#6e8796", "#b9d3e2", "#eef6fb", "#ffffff"] },
  { id: "precip", label: "Precipitation", unit: "mm", ramp: ["#7a3414", "#e2a35a", "#e8efe9", "#5cc3e6", "#1d5fa8"] },
  { id: "tair", label: "Temperature", unit: "°C", ramp: ["#1d5fa8", "#5cc3e6", "#e8efe9", "#f0a94b", "#c0392b"] },
];

const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function rampColor(ramp, t) {
  const x = Math.max(0, Math.min(0.9999, t)) * (ramp.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = hexToRgb(ramp[i]);
  const b = hexToRgb(ramp[i + 1]);
  return a.map((v, k) => v + (b[k] - v) * f);
}

// Rotate a point around the vertical axis (yaw), then tilt it (pitch), then project.
function project([x, y, z], yaw, pitch, w, h, zoom) {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const x1 = x * cy - z * sy;
  const z1 = x * sy + z * cy;
  // Camera looks down at the landscape: far points rise on screen, high points come closer.
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const y2 = y * cp + z1 * sp;
  const z2 = -y * sp + z1 * cp;
  const dist = 4;
  const s = (Math.min(w, h * 1.7) * 0.72 * zoom) / (dist + z2);
  return [w / 2 + x1 * s, h * 0.58 - y2 * s, z2];
}

function pointInPoly(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i += 1) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export default function DataMountain() {
  const { data, setHoverYear } = useAppState();
  const [layerId, setLayerId] = useState("runoff");
  const layer = LAYERS.find((l) => l.id === layerId);
  const [view, setView] = useState({ yaw: -0.38, pitch: 0.78, zoom: 1 });
  const [smooth, setSmooth] = useState(true);
  const [hover, setHover] = useState(null); // { yi, mi }
  const [pinYear, setPinYear] = useState(null);
  const [auto, setAuto] = useState(true);
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const quadsRef = useRef([]);
  const drag = useRef(null);
  const [sectionRef, inView] = useInView({ threshold: 0.2, once: false });
  const [size, setSize] = useState({ w: 900, h: 520 });
  const [rise, setRise] = useState(0); // 0→1 grow-in animation

  // The grid of values: one row per water year, one column per month.
  const grid = useMemo(() => {
    const years = waterYears(data);
    const raw = years
      .map((y) => ({ year: y, raw: monthlyProfile(data, layer.id, y) }))
      .filter((r) => r.raw && r.raw.every((v) => Number.isFinite(v)));
    // Optional 5-year centered average for each month, so the long-term shape shows through.
    const rows = raw.map((r, i) => {
      if (!smooth) return { ...r, vals: r.raw };
      const win = raw.slice(Math.max(0, i - 2), Math.min(raw.length, i + 3));
      return { ...r, vals: r.raw.map((_, m) => win.reduce((t, w) => t + w.raw[m], 0) / win.length) };
    });
    const all = rows.flatMap((r) => r.vals);
    const lo = Math.min(...all);
    const hi = Math.max(...all);
    // Squash extreme months a little so one storm doesn't flatten everything else.
    const sorted = [...all].sort((a, b) => a - b);
    const cap = sorted[Math.floor(sorted.length * 0.985)];
    return { rows, lo, hi: Math.max(cap, lo + 1e-6), trueHi: hi };
  }, [data, layer.id, smooth]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.round(e.contentRect.width);
      setSize({ w, h: Math.round(Math.max(340, Math.min(600, w * 0.58))) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Grow the landscape up from flat when it first appears or the layer changes.
  useEffect(() => {
    if (!inView) return undefined;
    if (prefersReducedMotion()) {
      setRise(1);
      return undefined;
    }
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 1300);
      setRise(1 - (1 - t) ** 3);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    setRise(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, layerId, data.id]);

  // Slow turntable spin until someone grabs it.
  useEffect(() => {
    if (!auto || !inView || prefersReducedMotion()) return undefined;
    let frame;
    let last = performance.now();
    let phase = 0;
    const tick = (now) => {
      const dt = now - last;
      last = now;
      phase += dt * 0.00035;
      setView((v) => ({ ...v, yaw: -0.38 + Math.sin(phase) * 0.45 }));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [auto, inView]);

  // Draw.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const { w, h } = size;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const css = getComputedStyle(document.documentElement);
    const ink = css.getPropertyValue("--ink").trim() || "#e8f1f6";
    const muted = css.getPropertyValue("--muted").trim() || "#9fb3c0";
    const amber = css.getPropertyValue("--amber").trim() || "#f0a94b";
    const glow = css.getPropertyValue("--water").trim() || "#5cc3e6";

    const { rows, lo, hi } = grid;
    const ny = rows.length;
    // Months across, years front-to-back with the most recent year nearest.
    const X = (mi) => -1.3 + (2.6 * mi) / 11;
    const Z = (yi) => 1 - (2 * yi) / Math.max(1, ny - 1);
    const H = (v) => (Math.min(v, hi) - lo) / (hi - lo);
    const Y = (v) => -0.3 + 0.8 * H(v) * rise;
    const P = (p) => project(p, view.yaw, view.pitch, w, h, view.zoom);

    // Base plate.
    const corners = [[-1.38, -0.3, -1.08], [1.38, -0.3, -1.08], [1.38, -0.3, 1.08], [-1.38, -0.3, 1.08]].map(P);
    ctx.beginPath();
    corners.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = "rgba(127,160,180,0.10)";
    ctx.fill();

    // Late-summer strip on the floor (Jul–Sep).
    const strip = [[X(8.5), -0.3, -1.08], [X(11) + 0.08, -0.3, -1.08], [X(11) + 0.08, -0.3, 1.08], [X(8.5), -0.3, 1.08]].map(P);
    ctx.beginPath();
    strip.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = amber + "33";
    ctx.fill();

    // Build and depth-sort the surface tiles (far ones first).
    const quads = [];
    for (let yi = 0; yi < ny - 1; yi += 1) {
      for (let mi = 0; mi < 11; mi += 1) {
        const v00 = rows[yi].vals[mi];
        const v10 = rows[yi].vals[mi + 1];
        const v01 = rows[yi + 1].vals[mi];
        const v11 = rows[yi + 1].vals[mi + 1];
        const pts3 = [
          [X(mi), Y(v00), Z(yi)],
          [X(mi + 1), Y(v10), Z(yi)],
          [X(mi + 1), Y(v11), Z(yi + 1)],
          [X(mi), Y(v01), Z(yi + 1)],
        ];
        const pts = pts3.map(P);
        const depth = pts.reduce((s, p) => s + p[2], 0) / 4;
        // Simple light from the upper left: steeper tiles facing away get darker.
        const slopeX = (v10 + v11 - v00 - v01) / 2;
        const slopeZ = (v01 + v11 - v00 - v10) / 2;
        const shade = 0.82 + 0.18 * Math.tanh((-slopeX - slopeZ * 0.5) / ((hi - lo) * 0.25 || 1));
        const avg = (v00 + v10 + v01 + v11) / 4;
        quads.push({ yi, mi, pts, depth, shade, avg });
      }
    }
    quads.sort((a, b) => b.depth - a.depth);
    quadsRef.current = quads;

    const highlightYearIdx = hover ? hover.yi : pinYear !== null ? rows.findIndex((r) => r.year === pinYear) : -1;

    for (const q of quads) {
      const [r, g, b] = rampColor(layer.ramp, (q.avg - lo) / (hi - lo));
      const s = q.shade;
      ctx.beginPath();
      q.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = `rgb(${Math.round(r * s)},${Math.round(g * s)},${Math.round(b * s)})`;
      ctx.fill();
      ctx.strokeStyle = "rgba(10,20,28,0.18)";
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    // A glowing ribbon along the highlighted year.
    if (highlightYearIdx >= 0) {
      const row = rows[highlightYearIdx];
      ctx.beginPath();
      row.vals.forEach((v, mi) => {
        const [x, y] = P([X(mi), Y(v) + 0.012, Z(highlightYearIdx)]);
        if (mi) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      });
      ctx.strokeStyle = glow;
      ctx.lineWidth = 3;
      ctx.shadowColor = glow;
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Hovered tile outline.
    if (hover) {
      const q = quads.find((t) => t.yi === hover.yi && t.mi === hover.mi);
      if (q) {
        ctx.beginPath();
        q.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        ctx.strokeStyle = ink;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Axis labels.
    ctx.font = "600 13px Atkinson Hyperlegible, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = muted;
    MONTHS.forEach((m, mi) => {
      const [x, y] = P([X(mi), -0.3, -1.22]);
      ctx.fillText(m, x, y);
    });
    ctx.textAlign = "left";
    rows.forEach((r, yi) => {
      if (r.year % 10 === 0 || yi === 0 || yi === ny - 1) {
        const [x, y] = P([1.46, -0.3, Z(yi)]);
        ctx.fillText(String(r.year), x, y + 4);
      }
    });
    const [lx, ly] = P([X(10), -0.3, -1.4]);
    ctx.textAlign = "center";
    ctx.fillStyle = amber;
    ctx.fillText("Late summer", lx, ly);
  }, [grid, view, size, hover, pinYear, rise, layer]);

  function eventPoint(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  }

  function onPointerDown(e) {
    setAuto(false);
    drag.current = { x: e.clientX, y: e.clientY, view };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (drag.current) {
      const dx = e.clientX - drag.current.x;
      const dy = e.clientY - drag.current.y;
      setView({
        ...drag.current.view,
        yaw: drag.current.view.yaw + dx * 0.008,
        pitch: Math.max(0.12, Math.min(1.35, drag.current.view.pitch + dy * 0.006)),
      });
      return;
    }
    const [px, py] = eventPoint(e);
    const quads = quadsRef.current;
    for (let i = quads.length - 1; i >= 0; i -= 1) {
      if (pointInPoly(px, py, quads[i].pts)) {
        const { yi, mi } = quads[i];
        setHover({ yi, mi, px, py });
        setHoverYear(grid.rows[yi].year);
        return;
      }
    }
    setHover(null);
  }

  function onPointerUp(e) {
    if (drag.current) {
      const moved = Math.abs(e.clientX - drag.current.x) + Math.abs(e.clientY - drag.current.y);
      drag.current = null;
      if (moved < 4 && hover) setPinYear(grid.rows[hover.yi].year); // a click pins a year
    }
  }

  function onKeyDown(e) {
    const step = 0.12;
    const keys = {
      ArrowLeft: { yaw: view.yaw - step },
      ArrowRight: { yaw: view.yaw + step },
      ArrowUp: { pitch: Math.min(1.35, view.pitch + step) },
      ArrowDown: { pitch: Math.max(0.12, view.pitch - step) },
      "+": { zoom: Math.min(1.6, view.zoom + 0.1) },
      "-": { zoom: Math.max(0.7, view.zoom - 0.1) },
    };
    if (keys[e.key]) {
      e.preventDefault();
      setAuto(false);
      setView((v) => ({ ...v, ...keys[e.key] }));
    }
  }

  // Oct–Dec belong to the calendar year before the water year's name.
  const hovered = hover
    ? {
        year: grid.rows[hover.yi].year,
        month: MONTHS[hover.mi],
        raw: grid.rows[hover.yi].raw[hover.mi],
        calYear: hover.mi < 3 ? grid.rows[hover.yi].year - 1 : grid.rows[hover.yi].year,
        value: grid.rows[hover.yi].vals[hover.mi],
      }
    : null;
  const years = grid.rows.map((r) => r.year);

  return (
    <section id="mountain3d" className="section mountain3d" aria-labelledby="m3d-title" ref={sectionRef}>
      <h2 id="m3d-title">The data mountain</h2>
      <p className="section-intro">
        Every month of every year in the {data.name}, as a landscape. Months run left to right, years run
        back to front, and height is the amount. Drag to turn it, point to read a month, click to pin a year.
      </p>

      <div className="m3d-controls">
        <div className="stripe-tabs" role="tablist" aria-label="What the height shows">
          {LAYERS.map((l) => (
            <button key={l.id} type="button" role="tab" aria-selected={l.id === layerId} onClick={() => setLayerId(l.id)}>
              {l.label}
            </button>
          ))}
        </div>
        <label className="select-row m3d-year">
          Highlight a year
          <select value={pinYear ?? ""} onChange={(e) => setPinYear(e.target.value ? Number(e.target.value) : null)}>
            <option value="">None</option>
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
        <fieldset className="segmented m3d-smooth">
          <legend>Show</legend>
          <div>
            {[[true, "5-year average"], [false, "Each year"]].map(([v, label]) => (
              <label key={label} className={smooth === v ? "is-on" : undefined}>
                <input type="radio" name="m3d-smooth" checked={smooth === v} onChange={() => setSmooth(v)} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="m3d-buttons">
          <button type="button" className="chip-button" onClick={() => setView((v) => ({ ...v, zoom: Math.min(1.6, v.zoom + 0.15) }))} aria-label="Zoom in">+</button>
          <button type="button" className="chip-button" onClick={() => setView((v) => ({ ...v, zoom: Math.max(0.7, v.zoom - 0.15) }))} aria-label="Zoom out">−</button>
          <button type="button" className="chip-button" onClick={() => { setView({ yaw: -0.38, pitch: 0.78, zoom: 1 }); setAuto(true); }}>
            Reset view
          </button>
        </div>
      </div>

      <div className="m3d-stage" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          style={{ width: size.w, height: size.h }}
          tabIndex={0}
          role="img"
          aria-label={`3D landscape of monthly ${layer.label.toLowerCase()} in the ${data.name}, ${years[0]} to ${years[years.length - 1]}. Use arrow keys to rotate and plus or minus to zoom.`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={() => {
            setHover(null);
            setHoverYear(null);
          }}
          onKeyDown={onKeyDown}
        />
        {hovered && (
          <div className="tooltip m3d-tip" style={{ left: Math.min(size.w - 170, hover.px + 14), top: Math.max(0, hover.py - 70) }}>
            <strong>
              {hovered.month} {hovered.calYear}
            </strong>
            <span>{formatValue(layer.id, hovered.raw)} that month</span>
            {smooth && <span>{formatValue(layer.id, hovered.value)} 5-year average</span>}
            <span className="m3d-tip-note">Water year {hovered.year}</span>
          </div>
        )}
        <div className="m3d-legend" aria-hidden="true">
          <span>{formatValue(layer.id, grid.lo)}</span>
          <span className="legend-ramp" style={{ background: `linear-gradient(90deg, ${layer.ramp.join(",")})` }} />
          <span>{formatValue(layer.id, grid.trueHi)}</span>
        </div>
        {auto && <p className="m3d-hint">Drag to rotate</p>}
      </div>
      <p className="footnote">
        NASA NLDAS-2 monthly data. “5-year average” smooths each month over the surrounding five years so the
        long-term shape shows through; switch to “Each year” for the raw values. The top 1.5% of months are
        capped in height so one extreme storm doesn’t flatten the rest. Hover always shows the true value.
      </p>
    </section>
  );
}

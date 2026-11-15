// Tiny replacements for d3-scale so the app has no charting dependency.

export function linear([d0, d1], [r0, r1]) {
  const span = d1 - d0 || 1;
  const f = (v) => r0 + ((v - d0) / span) * (r1 - r0);
  f.invert = (px) => d0 + ((px - r0) / (r1 - r0)) * span;
  f.domain = [d0, d1];
  f.range = [r0, r1];
  return f;
}

// Round numbers for axis ticks ("nice" steps of 1, 2, 2.5 or 5 x 10^k).
export function niceTicks(min, max, count = 5) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) return [min];
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  const start = Math.ceil(min / step) * step;
  const ticks = [];
  for (let v = start; v <= max + step * 1e-9; v += step) ticks.push(+v.toFixed(10));
  return ticks;
}

export function niceDomain(min, max, count = 5, { zero = false, pad = 0.05 } = {}) {
  let lo = zero ? Math.min(0, min) : min;
  let hi = max;
  const span = hi - lo || Math.abs(hi) || 1;
  if (!zero) lo -= span * pad;
  hi += span * pad;
  const ticks = niceTicks(lo, hi, count);
  const step = ticks.length > 1 ? ticks[1] - ticks[0] : span;
  return [zero && min >= 0 ? 0 : Math.floor(lo / step) * step, Math.ceil(hi / step) * step];
}

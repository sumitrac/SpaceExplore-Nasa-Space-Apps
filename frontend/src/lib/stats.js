// Trend statistics used across the app.
// Mann-Kendall test: is there a consistent upward or downward trend?
// Sen's slope: how steep is it? Both are standard in hydrology because they
// don't assume the data is normally distributed and aren't thrown off by
// one extreme year.

export function median(values) {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

export function mean(values) {
  const v = values.filter((x) => Number.isFinite(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

// Standard normal cumulative distribution (Abramowitz & Stegun 7.1.26).
export function normalCdf(z) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const poly =
    t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

/**
 * @param {number[]} xs  e.g. years
 * @param {number[]} ys  values (null/NaN are skipped)
 * @returns {{n, S, varS, z, p, tau, slope, intercept, direction, significant}}
 */
export function trendTest(xs, ys, alpha = 0.05) {
  const pts = xs.map((x, i) => [x, ys[i]]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  const n = pts.length;
  if (n < 8) {
    return { n, tooFew: true, significant: false, direction: "none", slope: null, p: null };
  }

  let S = 0;
  const slopes = [];
  for (let i = 0; i < n - 1; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const dy = pts[j][1] - pts[i][1];
      S += Math.sign(dy);
      const dx = pts[j][0] - pts[i][0];
      if (dx !== 0) slopes.push(dy / dx);
    }
  }

  // Variance with correction for tied values.
  const counts = new Map();
  pts.forEach(([, y]) => counts.set(y, (counts.get(y) || 0) + 1));
  let tieTerm = 0;
  counts.forEach((t) => {
    if (t > 1) tieTerm += t * (t - 1) * (2 * t + 5);
  });
  const varS = (n * (n - 1) * (2 * n + 5) - tieTerm) / 18;

  let z = 0;
  if (S > 0) z = (S - 1) / Math.sqrt(varS);
  else if (S < 0) z = (S + 1) / Math.sqrt(varS);
  const p = 2 * (1 - normalCdf(Math.abs(z)));

  const slope = median(slopes);
  const intercept = median(pts.map(([x, y]) => y - slope * x));
  const tau = S / ((n * (n - 1)) / 2);
  const significant = p < alpha;

  return {
    n,
    S,
    varS,
    z,
    p,
    tau,
    slope,
    intercept,
    significant,
    direction: slope > 0 ? "up" : slope < 0 ? "down" : "none",
  };
}

export function parseGiovanniCsv(text) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim().toLowerCase().startsWith("time"));
  if (start < 0) throw new Error("Could not find the data header (a line starting with 'time').");
  const rows = [];
  for (const line of lines.slice(start + 1)) {
    const [t, v] = line.split(",");
    if (!t || v === undefined) continue;
    const date = new Date(t.trim().slice(0, 10) + "T00:00:00Z");
    const value = Number(v);
    if (isNaN(date) || !isFinite(value) || value < -900 || value > 1e10) continue;
    rows.push({ date, value });
  }
  if (rows.length < 24) throw new Error("Not enough data rows. Use a monthly or daily time series.");
  return rows;
}

export function seasonalSeries(rows, months, how = "mean") {
  const byMonth = new Map();
  for (const { date, value } of rows) {
    const m = date.getUTCMonth() + 1;
    if (!months.includes(m)) continue;
    const wy = date.getUTCFullYear() + (m >= 10 ? 1 : 0);
    const key = `${wy}|${m}`;
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key).push(value);
  }
  const byYear = new Map();
  for (const [key, vals] of byMonth) {
    const wy = Number(key.split("|")[0]);
    const monthVal = vals.length > 1 && how === "sum" ? vals.reduce((a, b) => a + b, 0)
      : vals.reduce((a, b) => a + b, 0) / vals.length;
    if (!byYear.has(wy)) byYear.set(wy, []);
    byYear.get(wy).push(monthVal);
  }
  return [...byYear.entries()]
    .filter(([, vals]) => vals.length === months.length)
    .map(([year, vals]) => ({
      year,
      value: how === "sum" ? vals.reduce((a, b) => a + b, 0) : vals.reduce((a, b) => a + b, 0) / vals.length,
    }))
    .sort((a, b) => a.year - b.year);
}

function normalCdf(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

export function analyzeTrend(series) {
  const n = series.length;
  if (n < 10) throw new Error(`Only ${n} complete years. At least 10 are needed for a trend test.`);
  const x = series.map((d) => d.year);
  const y = series.map((d) => d.value);
  let s = 0;
  const slopes = [];
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      s += Math.sign(y[j] - y[i]);
      slopes.push((y[j] - y[i]) / (x[j] - x[i]));
    }
  }
  const counts = {};
  y.forEach((v) => (counts[v] = (counts[v] || 0) + 1));
  const ties = Object.values(counts).filter((c) => c > 1).reduce((a, t) => a + t * (t - 1) * (2 * t + 5), 0);
  const varS = (n * (n - 1) * (2 * n + 5) - ties) / 18;
  const z = s > 0 ? (s - 1) / Math.sqrt(varS) : s < 0 ? (s + 1) / Math.sqrt(varS) : 0;
  const p = 2 * (1 - normalCdf(Math.abs(z)));
  slopes.sort((a, b) => a - b);
  const N = slopes.length;
  const mid = Math.floor(N / 2);
  const slope = N % 2 ? slopes[mid] : (slopes[mid - 1] + slopes[mid]) / 2;
  const c = 1.96 * Math.sqrt(varS);
  const lo = slopes[Math.max(0, Math.floor((N - c) / 2))];
  const hi = slopes[Math.min(N - 1, Math.ceil((N + c) / 2))];
  const medX = [...x].sort((a, b) => a - b)[Math.floor(n / 2)];
  const medY = [...y].sort((a, b) => a - b)[Math.floor(n / 2)];
  const resid = y.map((v, i) => v - (medY + slope * (x[i] - medX)));
  const mean = resid.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(resid.reduce((a, r) => a + (r - mean) ** 2, 0) / n);
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { den += (resid[i] - mean) ** 2; if (i > 0) num += (resid[i] - mean) * (resid[i - 1] - mean); }
  const phi = Math.min(0.9, Math.max(-0.9, den ? num / den : 0));
  let yearsToDetect = null;
  if (slope !== 0) {
    const nStar = Math.pow((3.3 * sd / Math.abs(slope)) * Math.sqrt((1 + phi) / (1 - phi)), 2 / 3);
    yearsToDetect = Math.max(0, Math.round((nStar - n) * 10) / 10);
  }
  const avg = y.reduce((a, b) => a + b, 0) / n;
  let verdict = "no_trend";
  if (p < 0.05 && (lo > 0 || hi < 0)) verdict = "real_trend";
  else if (p < 0.05) verdict = "borderline";
  else if (yearsToDetect !== null && yearsToDetect <= 30) verdict = "cant_tell_yet";
  return {
    n, firstYear: x[0], lastYear: x[n - 1],
    slopePerDecade: slope * 10, ciLow: lo * 10, ciHigh: hi * 10,
    percentPerDecade: avg ? (slope * 10 / Math.abs(avg)) * 100 : null,
    pValue: p, yearsToDetect, verdict,
    trendLine: x.map((yr) => ({ year: yr, value: medY + slope * (yr - medX) })),
  };
}

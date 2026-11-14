// Formatting helpers shared by the Trends, Validation and Tour components.
// They only format numbers that come from the pipeline JSON; they never create values.

export const DATA_URL = `${import.meta.env.BASE_URL}data/`;

export const REGIONS = {
  cedar: { name: "Cedar River", note: "Whole watershed box (upper + lower, 8 grid cells)" },
  cedarupper: { name: "Upper Cedar", note: "High, snowy zone east of Chester Morse Lake (6 grid cells)" },
  cedarlower: { name: "Lower Cedar", note: "Lower, rainier zone toward Landsburg (2 grid cells)" },
  tolt: { name: "South Fork Tolt", note: "Only 2 grid cells: treat as a rough signal" },
  seattle: { name: "Seattle city", note: "City box, for a city vs mountains contrast (4 grid cells)" },
};
export const REGION_ORDER = ["cedar", "cedarupper", "cedarlower", "tolt", "seattle"];
export const VAR_ORDER = ["summer_runoff", "winter_runoff", "peak_swe", "rain_fraction", "winter_temp",
  "total_precip", "snow_cover_days", "max_1day_rain", "heavy_rain_days"];

// "What do you want to investigate?" -> which variables to show
export const TOPICS = [
  { id: "all", label: "Everything", vars: null },
  { id: "water", label: "Water supply", vars: ["summer_runoff", "winter_runoff", "peak_swe", "total_precip"] },
  { id: "snow", label: "Snow", vars: ["peak_swe", "rain_fraction", "snow_cover_days"] },
  { id: "rain", label: "Rain", vars: ["total_precip", "rain_fraction", "max_1day_rain", "heavy_rain_days"] },
  { id: "temp", label: "Temperature", vars: ["winter_temp"] },
];

export const VERDICTS = {
  real_trend: { badge: "Real trend", cls: "is-real" },
  borderline: { badge: "Borderline", cls: "is-borderline" },
  cant_tell_yet: { badge: "Can’t tell yet", cls: "is-cant-tell" },
  no_trend: { badge: "No clear trend", cls: "is-none" },
};

export const regionName = (r) => REGIONS[r]?.name ?? r;
export const sign = (x) => (x > 0 ? "+" : x < 0 ? "−" : "±");
export const fmtP = (p) => (p < 0.001 ? "< 0.001" : p.toFixed(3));
// "p = 0.012" or "p < 0.001" (avoids "p = < 0.001")
export const eq = (name, p) => (p < 0.001 ? `${name} < 0.001` : `${name} = ${p.toFixed(3)}`);

// Shares (0-1) are shown as percent; slopes of shares as percentage points.
export function fmtValue(v, units) {
  if (units === "share") return `${(v * 100).toFixed(0)}%`;
  const digits = Math.abs(v) < 10 ? 1 : 0;
  return `${v.toFixed(digits)} ${units === "deg C" ? "°C" : units}`;
}
export function fmtSlope(v, units) {
  if (units === "share") return `${sign(v)}${Math.abs(v * 100).toFixed(1)} percentage points`;
  const u = units === "deg C" ? " °C" : ` ${units}`;
  const digits = Math.abs(v) < 1 ? 2 : Math.abs(v) < 10 ? 1 : 0;
  return `${sign(v)}${Math.abs(v).toFixed(digits)}${u}`;
}
export function fmtPct(t) {
  return t.pct_of_mean_per_decade == null ? "" : `${sign(t.pct_of_mean_per_decade)}${Math.abs(t.pct_of_mean_per_decade).toFixed(0)}%`;
}

export function sentence(d) {
  const t = d.trend;
  const what = `${d.label} changed by ${fmtSlope(t.slope_per_decade, d.units)} per decade`;
  // % of mean is meaningless for shares (already %) and for °C (no true zero)
  const pct = t.pct_of_mean_per_decade != null && d.units !== "share" && d.units !== "deg C" ? ` (${fmtPct(t)} of its average)` : "";
  switch (t.verdict) {
    case "real_trend":
      return `${what}${pct}, ${t.first_year}–${t.last_year}. That is statistically significant (${eq("q", t.q_value)}).`;
    case "borderline":
      return `${what}${pct}. It is on the edge: the change looks big enough to detect, but after correcting for testing many things at once it does not pass (${eq("q", t.q_value)}).`;
    case "cant_tell_yet":
      return `${what}${pct}, but that is not significant yet (${eq("q", t.q_value)}). If it keeps going at this rate, roughly ${Math.ceil(t.years_to_detect)} more years of data would settle it.`;
    default:
      return `${what}${pct}. That is small next to the normal year-to-year swings, so the data shows no clear trend (${eq("q", t.q_value)}).`;
  }
}

// One validation comparison in plain words (p-values, no FDR: it is a separate check).
export function validationSentence(v) {
  const g = v.ground.trend, m = v.model.trend;
  const dir = (t) => (t.p_value < 0.05 ? (t.slope_per_decade < 0 ? "falling" : "rising") : "no clear trend");
  return `${v.ground_label}: ${dir(g)} (${fmtSlope(g.slope_per_decade, v.units)} per decade, ${eq("p", g.p_value)}). ` +
    `NASA model: ${dir(m)} (${fmtSlope(m.slope_per_decade, v.units)} per decade, ${eq("p", m.p_value)}).`;
}

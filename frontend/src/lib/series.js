// Turns the monthly watershed data into the yearly numbers the charts use.
// A "water year" runs October to September and is named for the year it ends
// in (water year 2026 = Oct 2025 to Sep 2026). That keeps a whole winter's
// snow in one year.

import { median, mean } from "./stats.js";

export const MONTHS = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];

export const SEASONS = {
  wy: { label: "Whole year", months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], note: "Oct–Sep" },
  winter: { label: "Winter", months: [1, 2, 3, 4, 5], note: "Nov–Mar" },
  spring: { label: "Spring", months: [6, 7, 8], note: "Apr–Jun" },
  summer: { label: "Late summer", months: [9, 10, 11], note: "Jul–Sep" },
};

// How each variable is summarized over a season, and how to talk about it.
export const VARIABLES = {
  swe: {
    label: "Snowpack",
    long: "Snow water equivalent",
    unit: "mm",
    digits: 0,
    seasons: ["wy", "winter", "spring"],
    agg: (season) => (season === "wy" ? "max" : "mean"),
    aggLabel: (season) => (season === "wy" ? "Peak snowpack" : "Average snowpack"),
    worseWhen: "down",
    chart: "bars",
    explain: "How much water is stored in the snow, in millimeters of water.",
  },
  tair: {
    label: "Temperature",
    long: "Air temperature",
    unit: "°C",
    digits: 1,
    seasons: ["winter", "spring", "summer", "wy"],
    agg: () => "mean",
    aggLabel: () => "Average temperature",
    worseWhen: "up",
    chart: "line",
    explain: "Average air temperature over the watershed.",
  },
  precip: {
    label: "Precipitation",
    long: "Rain plus snow",
    unit: "mm",
    digits: 0,
    seasons: ["wy", "winter", "spring", "summer"],
    agg: () => "sum",
    aggLabel: () => "Total precipitation",
    worseWhen: null,
    chart: "bars",
    explain: "All the water that fell from the sky, as rain or snow.",
  },
  rainShare: {
    label: "Rain share",
    long: "Share of precipitation falling as rain",
    unit: "%",
    digits: 0,
    seasons: ["winter", "wy"],
    agg: () => "ratio",
    aggLabel: () => "Share falling as rain",
    worseWhen: "up",
    chart: "line",
    explain: "Of all the water that fell, how much came down as rain instead of snow.",
  },
  runoff: {
    label: "Runoff",
    long: "Water flowing off the land into streams",
    unit: "mm",
    digits: 0,
    seasons: ["summer", "spring", "winter", "wy"],
    agg: () => "sum",
    aggLabel: () => "Total runoff",
    worseWhen: "down",
    chart: "bars",
    explain: "Water that drains off the land into streams, on the surface and underground.",
  },
  streamflow: {
    label: "River flow",
    long: "Streamflow at the USGS gauge",
    unit: "cfs",
    digits: 0,
    seasons: ["summer", "spring", "winter", "wy"],
    agg: () => "mean",
    aggLabel: () => "Average river flow",
    worseWhen: "down",
    chart: "bars",
    explain: "How much water passes the river gauge, in cubic feet per second.",
  },
  meltOut: {
    label: "Melt-out date",
    long: "Day the snow is mostly gone",
    unit: "",
    digits: 0,
    seasons: ["wy"],
    agg: () => "annual",
    aggLabel: () => "Snow melt-out date",
    worseWhen: "down",
    chart: "dots",
    explain: "The day each spring when the snowpack drops below 10% of its peak.",
  },
};

export function availableVariables(data) {
  return Object.keys(VARIABLES).filter((id) => {
    if (id === "meltOut") return Object.keys(data.annual?.meltOutDay || {}).length > 0;
    if (id === "precip" || id === "rainShare") return data.monthly.rain && data.monthly.snow;
    return Array.isArray(data.monthly[id]);
  });
}

function firstWaterYear(data) {
  const [y, m] = data.monthly.start.split("-").map(Number);
  return m >= 10 ? y + 1 : y;
}

export function waterYears(data) {
  const n = Math.floor(data.monthly[Object.keys(data.monthly).find((k) => k !== "start")].length / 12);
  const first = firstWaterYear(data);
  return Array.from({ length: n }, (_, i) => first + i);
}

function monthValues(data, key, wy) {
  const i = (wy - firstWaterYear(data)) * 12;
  const arr = data.monthly[key];
  if (!arr || i < 0 || i + 12 > arr.length) return null;
  return arr.slice(i, i + 12);
}

/** Twelve monthly values (Oct–Sep) of a variable for one water year. */
export function monthlyProfile(data, varId, wy) {
  if (varId === "precip" || varId === "rainShare") {
    const rain = monthValues(data, "rain", wy);
    const snow = monthValues(data, "snow", wy);
    if (!rain || !snow) return null;
    return rain.map((r, i) => {
      const total = r + snow[i];
      if (varId === "precip") return total;
      return total > 0 ? (100 * r) / total : null;
    });
  }
  if (varId === "meltOut") return null;
  return monthValues(data, varId, wy);
}

/** One number per water year for a variable and season: [{year, value}] */
export function seasonalSeries(data, varId, seasonId) {
  const v = VARIABLES[varId];
  if (varId === "meltOut") {
    const md = data.annual?.meltOutDay || {};
    return Object.keys(md)
      .map((y) => ({ year: Number(y), value: md[y] }))
      .sort((a, b) => a.year - b.year);
  }
  const months = SEASONS[seasonId].months;
  const how = v.agg(seasonId);
  return waterYears(data)
    .map((year) => {
      if (varId === "rainShare") {
        const rain = monthValues(data, "rain", year);
        const snow = monthValues(data, "snow", year);
        if (!rain || !snow) return { year, value: null };
        const r = months.reduce((s, i) => s + rain[i], 0);
        const t = months.reduce((s, i) => s + rain[i] + snow[i], 0);
        return { year, value: t > 0 ? (100 * r) / t : null };
      }
      const vals = monthlyProfile(data, varId, year);
      if (!vals) return { year, value: null };
      const pick = months.map((i) => vals[i]);
      if (pick.some((x) => x === null || x === undefined)) return { year, value: null };
      let value;
      if (how === "max") value = Math.max(...pick);
      else if (how === "sum") value = pick.reduce((a, b) => a + b, 0);
      else value = mean(pick);
      return { year, value };
    })
    .filter((p) => p.value !== null && Number.isFinite(p.value));
}

export const BASELINES = {
  normal: { label: "1991–2020 normal", short: "1991–2020 normal" },
  early: { label: "First 10 years shown", short: "early-years average" },
  record: { label: "Whole record", short: "long-term average" },
};

/** Typical value used as "normal". Median, so one extreme year can't skew it. */
export function baselineValue(series, mode, range) {
  let pick;
  if (mode === "normal") pick = series.filter((p) => p.year >= 1991 && p.year <= 2020);
  else if (mode === "early") pick = series.filter((p) => p.year >= range[0]).slice(0, 10);
  else pick = series;
  if (pick.length < 5) pick = series; // fall back if the record is short
  return median(pick.map((p) => p.value));
}

export function normalProfile(data, varId) {
  const years = waterYears(data).filter((y) => y >= 1991 && y <= 2020);
  const profiles = years.map((y) => monthlyProfile(data, varId, y)).filter(Boolean);
  if (!profiles.length) return null;
  return MONTHS.map((_, i) => median(profiles.map((p) => p[i])));
}

export function dayToDate(doy) {
  const d = new Date(Date.UTC(2021, 0, Math.round(doy)));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function formatValue(varId, value, { withUnit = true } = {}) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "–";
  const v = VARIABLES[varId];
  if (varId === "meltOut") return dayToDate(value);
  const text = value.toLocaleString("en-US", {
    minimumFractionDigits: v.digits,
    maximumFractionDigits: v.digits,
  });
  if (!withUnit) return text;
  return v.unit === "%" ? `${text}%` : v.unit === "°C" ? `${text} °C` : `${text} ${v.unit}`;
}

/** "−94 mm per decade" style text for a trend slope (per year in). */
export function formatSlope(varId, slopePerYear) {
  const perDecade = slopePerYear * 10;
  const v = VARIABLES[varId];
  const abs = Math.abs(perDecade);
  const digits = abs < 10 && v.digits === 0 ? 1 : v.digits;
  const num = abs.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
  if (varId === "meltOut") return `${num} days ${perDecade < 0 ? "earlier" : "later"} per decade`;
  const unit = v.unit === "%" ? " percentage points" : v.unit === "°C" ? " °C" : ` ${v.unit}`;
  return `${perDecade < 0 ? "−" : "+"}${num}${unit} per decade`;
}

export function trendVerb(varId, direction) {
  if (direction === "none") return "is flat";
  if (varId === "meltOut") return direction === "down" ? "is coming earlier" : "is coming later";
  if (varId === "tair") return direction === "up" ? "is warming" : "is cooling";
  return direction === "up" ? "is rising" : "is falling";
}

export function latestYear(data) {
  const ys = waterYears(data);
  return ys[ys.length - 1];
}

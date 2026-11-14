"""CascadeWatch pipeline: clean long table -> yearly series -> trend stats -> JSON for the app.

Input CSV columns: date, region, variable, value
  region:   any name without "_" (e.g. cedar | cedarupper | cedarlower | tolt | seattle)
  variable: swe (mm), rain (mm/month), snowfall (mm/month), runoff (mm/month), tair (deg C),
            precip_monthly (mm/month, total precipitation, e.g. NLDAS forcing Rainf),
            snow_cover_days (one row per water year, date = Jan 1 of that water year),
            precip_daily (mm/day, GPM, seattle box)

Usage:
  python pipeline.py --fake            # test end to end with synthetic data
  python pipeline.py data/clean/long.csv
"""
import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
import pymannkendall as mk
from statsmodels.stats.multitest import multipletests

OUT = Path("data/processed")
WINTER = [11, 12, 1, 2, 3]
MONTHLY_VARS = ["swe", "rain", "snowfall", "runoff", "tair", "precip_monthly"]
MIN_DAYS_PER_YEAR = 360  # calendar years with fewer daily values are partial (GPM starts 2000-06; current year)

CATALOG = {
    "peak_swe": {"label": "Peak snowpack", "units": "mm", "source": "NLDAS 2 Noah",
                 "definition": "The most water stored in the snow during the winter. This is the water that melts into rivers and reservoirs through summer."},
    "rain_fraction": {"label": "Rain fraction", "units": "share", "source": "NLDAS 2",
                      "definition": "The share of winter precipitation that falls as rain instead of snow. Higher means less water saved in the mountains."},
    "total_precip": {"label": "Total precipitation", "units": "mm", "source": "NLDAS 2",
                     "definition": "All the rain and snow that fell in the water year (October to September), added up as water depth."},
    "winter_runoff": {"label": "Winter runoff", "units": "mm", "source": "NLDAS 2 Noah",
                      "definition": "Water flowing off the land in December to February. More winter runoff means higher flood risk."},
    "summer_runoff": {"label": "Summer runoff", "units": "mm", "source": "NLDAS 2 Noah",
                      "definition": "Water flowing off the land in July to September, when the city needs it most."},
    "winter_temp": {"label": "Winter temperature", "units": "deg C", "source": "NLDAS 2",
                    "definition": "Average air temperature from November to March. It decides whether precipitation falls as rain or snow."},
    "snow_cover_days": {"label": "Snow cover days", "units": "days", "source": "MODIS MOD10A2",
                        "definition": "How many days each winter the ground is covered by snow, seen from satellite."},
    "max_1day_rain": {"label": "Biggest rain day", "units": "mm", "source": "GPM IMERG",
                      "definition": "The most rain that fell in a single day that year. Big rain days can overwhelm sewers."},
    "heavy_rain_days": {"label": "Heavy rain days", "units": "days", "source": "GPM IMERG",
                        "definition": "Number of days per year with rain heavier than 95% of rainy days in the record."},
}


# ---------- loading ----------
def load_long(path):
    df = pd.read_csv(path, parse_dates=["date"])
    return add_wy(df)


def add_wy(df):
    df["wy"] = df["date"].dt.year + (df["date"].dt.month >= 10).astype(int)
    monthly = df[df.variable.isin(MONTHLY_VARS)]
    n = monthly.groupby(["region", "variable", "wy"])["value"].transform("size")
    return pd.concat([monthly[n == 12], df[~df.variable.isin(MONTHLY_VARS)]])  # full water years only


def pick(df, var, months=None):
    s = df[df.variable == var]
    return s[s.date.dt.month.isin(months)] if months else s


# ---------- yearly series ----------
def yearly_series(df):
    v = set(df.variable)
    out = {}
    if "swe" in v:
        out["peak_swe"] = pick(df, "swe").groupby("wy")["value"].max()
    if {"rain", "snowfall"} <= v:
        rain = pick(df, "rain", WINTER).groupby("wy")["value"].sum()
        snow = pick(df, "snowfall", WINTER).groupby("wy")["value"].sum()
        out["rain_fraction"] = rain / (rain + snow)
        out["total_precip"] = (pick(df, "rain").groupby("wy")["value"].sum()
                               + pick(df, "snowfall").groupby("wy")["value"].sum())
    elif "precip_monthly" in v:
        out["total_precip"] = pick(df, "precip_monthly").groupby("wy")["value"].sum()
    if "runoff" in v:
        out["winter_runoff"] = pick(df, "runoff", [12, 1, 2]).groupby("wy")["value"].sum()
        out["summer_runoff"] = pick(df, "runoff", [7, 8, 9]).groupby("wy")["value"].sum()
    if "tair" in v:
        out["winter_temp"] = pick(df, "tair", WINTER).groupby("wy")["value"].mean()
    if "snow_cover_days" in v:
        out["snow_cover_days"] = pick(df, "snow_cover_days").groupby("wy")["value"].first()
    if "precip_daily" in v:
        d = pick(df, "precip_daily")
        n_days = d.groupby(d.date.dt.year)["value"].transform("count")
        d = d[n_days >= MIN_DAYS_PER_YEAR]  # drop partial calendar years
        yr = d.date.dt.year
        out["max_1day_rain"] = d.groupby(yr)["value"].max()
        p95 = d.loc[d.value > 1, "value"].quantile(0.95)
        out["heavy_rain_days"] = (d.value > p95).groupby(yr).sum().astype(float)
    return {k: s.dropna() for k, s in out.items()}


def by_month(df, var="runoff"):
    rows = []
    d = pick(df, var)
    for m in range(1, 13):
        s = d[d.date.dt.month == m].groupby("wy")["value"].mean()
        if len(s) >= 10:
            r = mk.original_test(s.values)
            rows.append({"month": m, "slope_per_decade": float(r.slope * 10), "p_value": float(r.p)})
    return rows


# ---------- stats ----------
def sen_ci(y, z=1.96):
    n = len(y)
    i, j = np.triu_indices(n, 1)
    slopes = np.sort((y[j] - y[i]) / (j - i))
    c = z * np.sqrt(n * (n - 1) * (2 * n + 5) / 18)
    lo = int(max(0, np.floor((len(slopes) - c) / 2)))
    hi = int(min(len(slopes) - 1, np.ceil((len(slopes) + c) / 2)))
    return slopes[lo], slopes[hi]


def analyze(s):
    y = s.values.astype(float)
    with np.errstate(invalid="ignore"):  # NaN handled below
        r = mk.hamed_rao_modification_test(y)  # autocorrelation aware Mann Kendall
    test = "Mann-Kendall (Hamed-Rao modified) + Sen's slope"
    if not np.isfinite(r.p):  # Hamed-Rao variance correction can go negative for short series -> NaN
        r = mk.original_test(y)
        test = "Mann-Kendall (original; Hamed-Rao undefined for this series) + Sen's slope"
    lo, hi = sen_ci(y)
    t = np.arange(len(y))
    resid = y - (r.slope * t + r.intercept)
    phi = float(np.clip(np.corrcoef(resid[:-1], resid[1:])[0, 1], -0.9, 0.9))
    more = None
    if r.slope != 0:  # rough years needed for |slope| / SE(slope) ~ 1.96 with annual data (HANDOFF section 5),
        # inflated for lag-1 autocorrelation as in Weatherhead et al. 1998. Assumes the trend continues linearly.
        n_star = ((1.96 * np.sqrt(12) * resid.std() / abs(r.slope)) * np.sqrt((1 + phi) / (1 - phi))) ** (2 / 3)
        more = round(max(0.0, n_star - len(y)), 1)
    mean = float(y.mean())
    return {"test": test, "n_years": int(len(y)),
            "first_year": int(s.index[0]), "last_year": int(s.index[-1]),
            "mean": mean, "slope_per_decade": float(r.slope * 10),
            "pct_of_mean_per_decade": float(r.slope * 10 / mean * 100) if mean else None,
            "intercept": float(r.intercept),  # Sen line value at first_year: intercept + slope * (year - first_year)
            "ci_low": float(lo * 10), "ci_high": float(hi * 10), "p_value": float(r.p), "years_to_detect": more}


def verdict(q, more):
    if q < 0.05:
        return "real_trend"
    if more is not None and more == 0:  # should already be detectable, but q says no: on the edge
        return "borderline"
    if more is not None and more <= 30:
        return "cant_tell_yet"
    return "no_trend"


# ---------- run ----------
def run(df):
    OUT.mkdir(parents=True, exist_ok=True)
    results = []
    for region, rdf in df.groupby("region"):
        months = by_month(rdf) if "runoff" in set(rdf.variable) else []
        for var, s in yearly_series(rdf).items():
            if len(s) >= 10:
                gaps = sorted(set(range(int(s.index.min()), int(s.index.max()) + 1)) - set(s.index.astype(int)))
                if gaps:  # MK / Sen treat values as evenly spaced
                    print(f"WARNING {region} {var}: missing years {gaps}")
                results.append((region, var, s, analyze(s), months if "runoff" in var else []))

    qs = multipletests([r[3]["p_value"] for r in results], method="fdr_bh")[1]  # false discovery rate
    index = []
    for (region, var, s, trend, months), q in zip(results, qs):
        trend["q_value"] = float(q)
        trend["verdict"] = verdict(q, trend["years_to_detect"])
        doc = {"region": region, "variable": var, **CATALOG[var],
               "series": [{"year": int(y), "value": round(float(v), 4)} for y, v in s.items()],
               "trend": trend, "by_month": months}
        (OUT / f"{region}_{var}.json").write_text(json.dumps(doc, indent=2))
        index.append({"region": region, "variable": var, "label": CATALOG[var]["label"],
                      "verdict": trend["verdict"], "q_value": float(q)})
    index.sort(key=lambda x: x["q_value"])
    (OUT / "index.json").write_text(json.dumps(index, indent=2))
    for row in index:
        print(f'{row["region"]:8} {row["label"]:20} {row["verdict"]:14} q={row["q_value"]:.3f}')


def fake():
    rng = np.random.default_rng(0)
    dates = pd.date_range("1979-01-01", "2024-12-01", freq="MS")
    t = (dates.year - 1979).values
    m = dates.month.values
    cold = np.clip(np.cos(2 * np.pi * (m - 1) / 12), 0, None)
    rows = []
    for region in ["cedar", "tolt"]:
        vals = {
            "swe": np.clip(cold * 500 * (1 - 0.006 * t) + rng.normal(0, 60, len(t)), 0, None),
            "snowfall": np.clip(cold * 120 * (1 - 0.008 * t) + rng.normal(0, 20, len(t)), 0, None),
            "rain": np.clip(150 + cold * 100 * (1 + 0.006 * t) + rng.normal(0, 40, len(t)), 0, None),
            "runoff": np.clip(100 + cold * 80 * (1 + 0.005 * t) + rng.normal(0, 25, len(t)), 0, None),
            "tair": 8 - 8 * cold + 0.03 * t + rng.normal(0, 1, len(t)),
        }
        for var, v in vals.items():
            rows += [{"date": d, "region": region, "variable": var, "value": x} for d, x in zip(dates, v)]
        for wy in range(2001, 2025):
            rows.append({"date": pd.Timestamp(wy, 1, 1), "region": region, "variable": "snow_cover_days",
                         "value": 120 - 0.8 * (wy - 2001) + rng.normal(0, 15)})
    days = pd.date_range("2000-06-01", "2024-12-31", freq="D")
    rain = rng.gamma(0.6, 6 * (1 + 0.01 * (days.year.values - 2000)))
    rows += [{"date": d, "region": "seattle", "variable": "precip_daily", "value": x} for d, x in zip(days, rain)]
    return add_wy(pd.DataFrame(rows))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("csv", nargs="?")
    ap.add_argument("--fake", action="store_true")
    a = ap.parse_args()
    run(fake() if a.fake else load_long(a.csv))

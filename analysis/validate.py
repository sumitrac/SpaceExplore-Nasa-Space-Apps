"""Validate NLDAS (model) against ground measurements in the Cedar watershed.

Ground truth (raw downloads in data/raw/validation/, fetched once, never edited):
  snotel_<id>.json   NRCS SNOTEL daily snow water equivalent (inches), AWDB REST API
                     672 Olallie Meadows (inside the Upper Cedar box), 911 Rex River (Cedar watershed, from 1995),
                     788 Stampede Pass (east edge of the Upper Cedar box)
  usgs_12115000.rdb  USGS daily discharge (cfs), Cedar River near Cedar Falls, 40.7 sq mi, upstream of
                     Chester Morse Lake (not dam-regulated). The gauge 472208121375600 named in HANDOFF.md
                     has no daily discharge record, so this co-located long-record gauge is used instead.
  usgs_12115500.rdb  USGS daily discharge, Rex River near Cedar Falls, 13.4 sq mi (also unregulated).

Metrics are defined exactly as in pipeline.py so model and ground are compared like for like:
  peak_swe      = highest monthly-mean SWE in the water year
  summer_runoff = Jul-Sep runoff total, winter_runoff = Dec-Feb total (gauge flow converted to mm over the basin)

Usage:
  python analysis/validate.py data/clean/long.csv
Writes data/processed/validation.json
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from pipeline import add_wy, analyze, verdict  # noqa: E402  (same stats as the main analysis)

RAW = Path("data/raw/validation")
OUT = Path("data/processed/validation.json")
SQMI_TO_M2 = 2.589988e6
CFS_TO_M3S = 0.0283168
MIN_YEARS = 15

SNOTEL = {"672": "Olallie Meadows SNOTEL", "911": "Rex River SNOTEL", "788": "Stampede Pass SNOTEL"}
GAUGES = {"12115000": ("Cedar River near Cedar Falls (USGS 12115000)", 40.7),
          "12115500": ("Rex River near Cedar Falls (USGS 12115500)", 13.4)}


def water_year(dates):
    return dates.dt.year + (dates.dt.month >= 10).astype(int)


def snotel_daily(sid):
    d = json.loads((RAW / f"snotel_{sid}.json").read_text())
    v = pd.DataFrame(d[0]["data"][0]["values"])
    v["date"] = pd.to_datetime(v["date"])
    v["value"] = pd.to_numeric(v["value"], errors="coerce") * 25.4  # inches -> mm
    return v.dropna()


def gauge_daily(site, sqmi):
    lines = [l for l in (RAW / f"usgs_{site}.rdb").read_text().splitlines() if l.startswith("USGS\t")]
    rows = [l.split("\t") for l in lines]
    d = pd.DataFrame({"date": pd.to_datetime([r[2] for r in rows]),
                      "q": pd.to_numeric([r[3] for r in rows], errors="coerce")}).dropna()
    d["value"] = d.q * CFS_TO_M3S * 86400 / (sqmi * SQMI_TO_M2) * 1000  # mm per day over the basin
    return d


def monthly(daily, how, min_days=25):
    g = daily.groupby(daily.date.dt.to_period("M"))["value"]
    m = g.agg(how)[g.count() >= min_days]
    out = m.rename("value").reset_index()
    out["date"] = out["date"].dt.to_timestamp()
    out["wy"] = water_year(out.date)
    return out


def full_years(m):
    n = m.groupby("wy")["value"].transform("size")
    return m[n == 12]


def peak_swe(m):
    return full_years(m).groupby("wy")["value"].max()


def season_sum(m, months):
    m = full_years(m)
    return m[m.date.dt.month.isin(months)].groupby("wy")["value"].sum()


def compare(name, ground_label, ground, model_label, model, units):
    both = pd.concat({"ground": ground, "model": model}, axis=1).dropna()
    if len(both) < MIN_YEARS:
        return None
    g, m = analyze(both.ground), analyze(both.model)
    for t in (g, m):  # validation is a separate question from the main scan: report p, no FDR
        t["verdict"] = verdict(t["p_value"], t["years_to_detect"])
    agree = np.sign(g["slope_per_decade"]) == np.sign(m["slope_per_decade"])
    return {
        "metric": name, "units": units, "ground_label": ground_label, "model_label": model_label,
        "n_years": int(len(both)), "first_year": int(both.index[0]), "last_year": int(both.index[-1]),
        "correlation": float(both.ground.corr(both.model)),
        "model_to_ground_ratio": float(both.model.mean() / both.ground.mean()),
        "same_direction": bool(agree),
        "ground": {"series": [{"year": int(y), "value": round(float(v), 3)} for y, v in both.ground.items()], "trend": g},
        "model": {"series": [{"year": int(y), "value": round(float(v), 3)} for y, v in both.model.items()], "trend": m},
    }


def main(long_csv):
    long = add_wy(pd.read_csv(long_csv, parse_dates=["date"]))
    up = long[long.region == "cedarupper"]
    nl_swe = up[up.variable == "swe"].groupby("wy")["value"].max()
    nl_run = up[up.variable == "runoff"]

    results = []
    for sid, label in SNOTEL.items():
        m = monthly(snotel_daily(sid), "mean")
        r = compare("peak_swe", label, peak_swe(m), "NLDAS Upper Cedar", nl_swe, "mm")
        if r:
            results.append(r)

    for site, (label, sqmi) in GAUGES.items():
        m = monthly(gauge_daily(site, sqmi), "sum")
        for name, months in [("summer_runoff", [7, 8, 9]), ("winter_runoff", [12, 1, 2])]:
            model = nl_run[nl_run.date.dt.month.isin(months)].groupby("wy")["value"].sum()
            r = compare(name, label, season_sum(m, months), "NLDAS Upper Cedar", model, "mm")
            if r:
                results.append(r)

    OUT.write_text(json.dumps(results, indent=2))
    print(f"{'metric':14} {'ground':45} {'years':10} {'r':>5} {'model/ground':>12}  ground slope/dec (p)   model slope/dec (p)   same dir")
    for r in results:
        g, m = r["ground"]["trend"], r["model"]["trend"]
        print(f"{r['metric']:14} {r['ground_label']:45} {r['first_year']}-{r['last_year']} {r['correlation']:5.2f} "
              f"{r['model_to_ground_ratio']:12.2f}  {g['slope_per_decade']:+8.1f} ({g['p_value']:.3f})      "
              f"{m['slope_per_decade']:+8.1f} ({m['p_value']:.3f})     {r['same_direction']}")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])

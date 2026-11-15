"""Build the per-watershed monthly files the story/explore sections of the app read.

Replaces the hand-made "sample" files in frontend/src/data/watersheds/ with real data:
  swe, tair, rain, snow, runoff  NASA NLDAS-2 monthly via Giovanni (data/clean/long.csv, made by giovanni_to_long.py)
  streamflow                     USGS daily discharge, monthly mean in cfs (data/raw/validation/usgs_<site>.rdb)
                                 Cedar only: gauge 12115000 is above Chester Morse Lake (not dam-regulated).
                                 No Tolt gauge has been downloaded, so Tolt has no streamflow and the app falls
                                 back to NLDAS runoff there.

Melt-out day (the date the snowpack drops below 10% of its peak) needs daily snow data. NLDAS here is
monthly, so it is NOT produced; the app hides the melt-out views when it is missing.

Usage:
  python analysis/build_watersheds.py data/clean/long.csv
"""
import json
import sys
from datetime import date
from pathlib import Path

import pandas as pd

OUT = Path("frontend/src/data/watersheds")
RAW = Path("data/raw/validation")
START, END = "1979-10-01", "2025-09-01"  # full water years 1980-2025 in the Giovanni download
MIN_DAYS = 25  # a month of gauge data needs at least this many days

WATERSHEDS = {
    "cedar": {"name": "Cedar River", "region": "cedar", "gauge": ("12115000", "Cedar River near Cedar Falls")},
    "tolt": {"name": "South Fork Tolt River", "region": "tolt", "gauge": None},
}
NLDAS = {  # app key -> variable in long.csv
    "swe": "swe", "tair": "tair", "rain": "rain", "snow": "snowfall", "runoff": "runoff",
}
SOURCE = "NASA NLDAS-2 monthly (Noah/forcing, 0.125°), area-averaged with NASA Giovanni"


def months():
    return pd.date_range(START, END, freq="MS")


def nldas(long, region, var):
    s = long[(long.region == region) & (long.variable == var)].set_index("date")["value"]
    s = s.reindex(months())
    if s.isna().any():
        raise SystemExit(f"{region}/{var}: {int(s.isna().sum())} missing months between {START} and {END}")
    return s


def gauge_monthly_cfs(site):
    lines = [l.split("\t") for l in (RAW / f"usgs_{site}.rdb").read_text().splitlines() if l.startswith("USGS\t")]
    d = pd.DataFrame({"date": pd.to_datetime([r[2] for r in lines]),
                      "q": pd.to_numeric([r[3] for r in lines], errors="coerce")}).dropna()
    g = d.groupby(d.date.dt.to_period("M"))["q"]
    m = g.mean()[g.count() >= MIN_DAYS]
    m.index = m.index.to_timestamp()
    return m.reindex(months())


def rounded(s, digits):
    return [None if pd.isna(v) else round(float(v), digits) for v in s]


def main(long_csv):
    long = pd.read_csv(long_csv, parse_dates=["date"])
    OUT.mkdir(parents=True, exist_ok=True)
    for wid, w in WATERSHEDS.items():
        monthly = {"start": START[:7]}
        sources = {}
        for key, var in NLDAS.items():
            monthly[key] = rounded(nldas(long, w["region"], var), 2)
            sources[key] = SOURCE
        if w["gauge"]:
            site, label = w["gauge"]
            flow = gauge_monthly_cfs(site)
            monthly["streamflow"] = rounded(flow, 2)
            sources["streamflow"] = f"USGS {site} {label}, daily discharge (monthly mean, cfs)"
            gaps = int(flow.isna().sum())
        doc = {
            "id": wid, "name": w["name"], "status": "real", "updated": date.today().isoformat(),
            "region": w["region"], "sources": sources, "monthly": monthly, "annual": {},
        }
        path = OUT / f"{wid}.json"
        path.write_text(json.dumps(doc, separators=(",", ":")))
        extra = f", streamflow gaps: {gaps} months" if w["gauge"] else ""
        print(f"wrote {path}: {len(monthly['swe'])} months from {START[:7]}{extra}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])

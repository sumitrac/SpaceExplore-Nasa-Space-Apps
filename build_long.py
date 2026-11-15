"""Merge every raw download into data/clean/long.csv (the input for pipeline.py).

Folder layout (name every Giovanni file REGION__VARIABLE.csv, two underscores):
  data/raw/giovanni/cedar__swe.csv
  data/raw/giovanni/cedar__snowfall.csv
  data/raw/giovanni/cedar__rain.csv
  data/raw/giovanni/cedar__runoff_surface.csv
  data/raw/giovanni/cedar__runoff_sub.csv     (surface + sub are added into "runoff")
  data/raw/giovanni/cedar__tair.csv
  data/raw/giovanni/tolt__swe.csv ... (same names)
  data/raw/giovanni/seattle__precip_daily.csv
  data/raw/appeears/<the AppEEARS .nc file>   (optional, gives snow_cover_days)

Usage:
  python build_long.py
"""
import re
from io import StringIO
from pathlib import Path

import numpy as np
import pandas as pd

RAW = Path("data/raw")
OUT = Path("data/clean/long.csv")
FLUX = {"rain", "snowfall", "runoff_surface", "runoff_sub", "runoff"}
# lat south, lat north, lon west, lon east (same boxes used in Giovanni)
BOXES = {"cedar": (47.25, 47.50, -121.85, -121.35), "tolt": (47.60, 47.80, -121.85, -121.45)}


def read_giovanni(path):
    """Giovanni CSVs start with metadata lines; the data starts at the line beginning with 'time'."""
    lines = Path(path).read_text(errors="ignore").splitlines()
    start = next(i for i, line in enumerate(lines) if line.strip().lower().startswith("time"))
    df = pd.read_csv(StringIO("\n".join(lines[start:])))
    df = df.rename(columns={df.columns[0]: "date", df.columns[1]: "value"})[["date", "value"]]
    df["date"] = pd.to_datetime(df["date"].astype(str).str.slice(0, 10), errors="coerce")
    df["value"] = pd.to_numeric(df["value"], errors="coerce")
    df = df.dropna()
    return df[(df.value > -900) & (df.value < 1e10)]  # drop fill values


def fix_units(df, var, monthly, name):
    v = df["value"]
    if var == "tair" and v.median() > 200:
        df["value"] = v - 273.15
        print(f"  {name}: Kelvin -> deg C")
    if var in FLUX and monthly:
        med = v.abs().median()
        if 0 < med < 0.01:  # kg/m2 per second
            df["value"] = v * df["date"].dt.days_in_month * 86400
            print(f"  {name}: per second rate -> monthly total (mm)")
        elif 0.01 <= med < 1:  # most likely kg/m2 per hour
            df["value"] = v * df["date"].dt.days_in_month * 24
            print(f"  {name}: per hour rate -> monthly total (mm)  << CHECK the units in the file header")
    return df


def load_giovanni():
    frames = []
    for f in sorted((RAW / "giovanni").glob("*.csv")):
        m = re.match(r"([a-z]+)__([a-z_]+)\.csv$", f.name)
        if not m:
            print(f"  SKIPPED {f.name}: rename it to region__variable.csv")
            continue
        region, var = m.groups()
        df = read_giovanni(f)
        monthly = var != "precip_daily"
        if monthly:
            df["date"] = df["date"].dt.to_period("M").dt.to_timestamp()
            if df["date"].duplicated().any():  # hourly or daily input: collapse to one value per month
                how = "mean" if var in {"swe", "tair"} else "sum"
                df = df.groupby("date", as_index=False)["value"].agg(how)
                print(f"  {f.name}: hourly/daily rows -> monthly {how}")
        df = fix_units(df, var, monthly, f.name)
        df["region"], df["variable"] = region, var
        frames.append(df)
    if not frames:
        return pd.DataFrame(columns=["date", "region", "variable", "value"])
    long = pd.concat(frames, ignore_index=True)

    parts = long[long.variable.isin(["runoff_surface", "runoff_sub"])]
    if not parts.empty:  # total runoff = surface + subsurface (only months that have both)
        wide = parts.pivot_table(index=["date", "region"], columns="variable", values="value").dropna()
        total = wide.sum(axis=1).rename("value").reset_index()
        total["variable"] = "runoff"
        long = pd.concat([long[~long.index.isin(parts.index)], total], ignore_index=True)
    return long


def load_modis():
    files = sorted((RAW / "appeears").glob("*.nc"))
    if not files:
        print("  no AppEEARS file yet, skipping snow_cover_days")
        return pd.DataFrame(columns=["date", "region", "variable", "value"])
    import xarray as xr

    ds = xr.open_dataset(files[0])
    name = next(v for v in ds.data_vars if "snow" in v.lower())
    da = ds[name]
    tn = next(d for d in da.dims if "time" in d.lower())
    latn = next(d for d in da.dims if "lat" in d.lower())
    lonn = next(d for d in da.dims if "lon" in d.lower())
    da = da.transpose(tn, latn, lonn)
    vals, lat, lon = da.values, da[latn].values, da[lonn].values
    times = pd.to_datetime([str(t)[:10] for t in da[tn].values])
    wy = times.year + (times.month >= 10).astype(int)

    rows = []
    for region, (s, n, w, e) in BOXES.items():
        sub = vals[:, (lat >= s) & (lat <= n)][:, :, (lon >= w) & (lon <= e)]
        for y in np.unique(wy):
            k = wy == y
            if k.sum() < 44:  # skip partial water years (a full year has 46 eight day images)
                continue
            block = sub[k]
            snow = (block == 200).sum(0)
            clear = np.isin(block, [25, 200]).sum(0)  # cloud (50) is skipped
            ok = clear > 0
            days = (snow[ok] / clear[ok]).mean() * k.sum() * 8
            rows.append({"date": pd.Timestamp(int(y), 1, 1), "region": region,
                         "variable": "snow_cover_days", "value": float(days)})
    return pd.DataFrame(rows)


if __name__ == "__main__":
    print("Reading Giovanni files...")
    g = load_giovanni()
    print("Reading AppEEARS file...")
    mo = load_modis()
    long = pd.concat([g, mo], ignore_index=True)[["date", "region", "variable", "value"]]
    long = long.sort_values(["region", "variable", "date"])
    OUT.parent.mkdir(parents=True, exist_ok=True)
    long.to_csv(OUT, index=False, date_format="%Y-%m-%d")

    print(f"\nWrote {OUT} with {len(long)} rows. CHECK these numbers look sensible:")
    summary = long.groupby(["region", "variable"]).agg(
        rows=("value", "size"), start=("date", "min"), end=("date", "max"),
        min=("value", "min"), median=("value", "median"), max=("value", "max"))
    summary[["min", "median", "max"]] = summary[["min", "median", "max"]].round(2)
    print(summary.to_string())

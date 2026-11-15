"""Convert Giovanni "Time Series, Area-Averaged" CSVs into the long table pipeline.py expects.

Put the downloads in one folder and name each file  <region>_<anything>.csv  (or <region>.<anything>.csv)
  region = cedar | tolt | seattle   (or e.g. cedarupper / cedarlower; no underscores in the region)
  examples: cedar_SWE.csv  tolt_Tair.csv  cedar_Qs.csv  cedar_Qsb.csv  seattle_IMERG_daily.csv
  Region names are normalised: case is ignored, "ceder" -> "cedar", "upperCedar" -> "cedarupper".

The variable is detected from the NLDAS short name in the CSV column header (e.g. mean_NLDAS_NOAH0125_M_2_0_Rainf),
falling back to the title:
  SWE -> swe, Rainf (NOAH) -> rain, Snowf -> snowfall, Qs + Qsb -> runoff, Tair -> tair (K -> deg C),
  Rainf from the FORA forcing file -> precip_monthly (total precipitation, rain + snow),
  IMERG / precipitation at daily resolution -> precip_daily

If both cedarupper and cedarlower are present, a full "cedar" region is added as the grid-cell-weighted
mean of the two (cell counts read from each file's "Data Bounding Box"; the two boxes do not overlap).

Usage:
  python giovanni_to_long.py data/raw/giovanni data/clean/long.csv
Then:
  python pipeline.py data/clean/long.csv
"""
import io
import re
import sys
from pathlib import Path

import numpy as np
import pandas as pd

# order matters: Qsb before Qs, Snowf before generic matches
W = r"(?<![A-Za-z]){}(?![A-Za-z])"  # name not glued to other letters (underscores are fine)
RULES = [
    (W.format("SWE") + "|Snow Water Equivalent", "swe"),
    (W.format("Qsb") + "|Subsurface runoff|Baseflow", "qsb"),
    (W.format("Qs") + "|Surface runoff", "qs"),
    (W.format("Snowf") + "|Snowfall|(?<!un)Frozen precipitation", "snowfall"),
    (W.format("Rainf") + "|Rainfall|Liquid precipitation", "rain"),
    (W.format("Tair") + "|" + W.format("TMP") + "|Temperature", "tair"),
    (r"IMERG|precipitation", "precip"),
]


SHORT = {"SWE": "swe", "Qsb": "qsb", "Qs": "qs", "Snowf": "snowfall", "Rainf": "rain", "Tair": "tair"}
UNITS = {"swe": "kg m-2", "qs": "kg m-2", "qsb": "kg m-2", "snowfall": "kg m-2", "rain": "kg m-2",
         "precip_monthly": "kg m-2", "tair": "K"}  # NLDAS-2 monthly: accumulations are monthly totals


def region_of(path):
    r = re.split(r"[_.]", Path(path).stem)[0].lower().replace("ceder", "cedar")
    m = re.fullmatch(r"(upper|lower)([a-z]+)", r)
    return m.group(2) + m.group(1) if m else r


def detect_header(vcol):
    """Variable from the Giovanni column name, e.g. mean_NLDAS_FORA0125_M_2_0_Rainf."""
    m = re.search(r"NLDAS_(NOAH|FORA)\w*?_([A-Za-z]+)$", vcol)
    if not m or m.group(2) not in SHORT:
        return None
    var = SHORT[m.group(2)]
    return "precip_monthly" if (var == "rain" and m.group(1) == "FORA") else var


def n_cells(meta):
    """Number of 0.125 deg grid cells inside the Giovanni 'Data Bounding Box' (W,S,E,N of cell centres)."""
    m = re.search(r"Data Bounding Box:,\"([-\d.]+),([-\d.]+),([-\d.]+),([-\d.]+)\"", meta)
    if not m:
        return None
    w, s, e, n = map(float, m.groups())
    return (round((e - w) / 0.125) + 1) * (round((n - s) / 0.125) + 1)


def read_giovanni(path):
    lines = Path(path).read_text(errors="replace").splitlines()
    start = next(i for i, l in enumerate(lines) if l.strip().lower().startswith("time"))
    meta = "\n".join(lines[:start])
    df = pd.read_csv(io.StringIO("\n".join(lines[start:])))
    df.columns = [c.strip() for c in df.columns]
    tcol, vcol = df.columns[0], df.columns[1]
    out = pd.DataFrame({"date": pd.to_datetime(df[tcol].astype(str).str.strip(), utc=True).dt.tz_localize(None),
                        "value": pd.to_numeric(df[vcol], errors="coerce")})
    fills = [float(x) for x in re.findall(r"Fill Value[^:]*:\s*,?\s*(-?[\d.eE+]+)", meta)]
    out.loc[out.value.isin(fills) | (out.value <= -9999), "value"] = np.nan
    title = next((l for l in lines[:start] if l.lower().startswith("title")), "")
    return out.dropna(), meta + "\n" + vcol, title, vcol


def detect(text):
    for pattern, name in RULES:
        if re.search(pattern, text, flags=re.I):
            return name
    return None


def units_of(title):
    m = re.search(r"\]\s*([^,]+?)\s*(?:over|,|$)", title)
    return m.group(1).strip() if m else "?"


def convert(df, var, units, daily):
    u = units.replace(" ", "").lower()
    days = 1.0 if daily else df.date.dt.days_in_month.astype(float)
    if var == "tair" and (u in ("k", "kelvin") or df.value.mean() > 150):
        df["value"] = df.value - 273.15
    elif "s-1" in u or "/s" in u:                      # rate per second -> total per period
        df["value"] = df.value * 86400 * days
    elif "hr" in u or "h-1" in u:                       # mm/hr -> total per period
        df["value"] = df.value * 24 * days
    return df


def main(src, dst):
    frames, inventory, cells = [], [], {}
    for f in sorted(Path(src).glob("*.csv")):
        region = region_of(f)
        df, header, title, vcol = read_giovanni(f)
        var = detect_header(vcol) or detect(title + "\n" + header)
        if var is None:
            print(f"SKIP {f.name}: could not tell which variable this is")
            continue
        step = df.date.diff().median()
        daily = step <= pd.Timedelta(days=2)
        if var == "precip":
            if not daily:
                print(f"SKIP {f.name}: monthly precipitation (pipeline wants daily GPM for the seattle box)")
                continue
            var = "precip_daily"
        if not daily:
            df["date"] = df.date.dt.to_period("M").dt.to_timestamp()
        units = units_of(title)
        if units == "?" and var in UNITS:
            units = UNITS[var] + " (NLDAS default)"
        df = convert(df, var, units, daily)
        df["region"], df["variable"] = region, var
        frames.append(df)
        cells[region] = n_cells(header)
        inventory.append((f.name, region, var, units, df.date.min().date(), df.date.max().date(), len(df)))

    long = pd.concat(frames, ignore_index=True)

    # runoff = surface (Qs) + subsurface (Qsb)
    q = long[long.variable.isin(["qs", "qsb"])]
    if len(q):
        wide = q.pivot_table(index=["region", "date"], columns="variable", values="value")
        missing = [c for c in ["qs", "qsb"] if c not in wide]
        if missing:
            print(f"WARNING runoff: missing {missing}; runoff will use only what is present")
        runoff = wide.sum(axis=1, min_count=1).rename("value").reset_index()
        runoff["variable"] = "runoff"
        long = pd.concat([long[~long.variable.isin(["qs", "qsb"])], runoff], ignore_index=True)

    # full Cedar = cell-weighted mean of the upper and lower boxes (they do not overlap)
    up, lo = cells.get("cedarupper"), cells.get("cedarlower")
    if up and lo and "cedar" not in cells:
        w = long[long.region.isin(["cedarupper", "cedarlower"])].pivot_table(
            index=["variable", "date"], columns="region", values="value").dropna()
        full = ((w.cedarupper * up + w.cedarlower * lo) / (up + lo)).rename("value").reset_index()
        full["region"] = "cedar"
        long = pd.concat([long, full], ignore_index=True)
        print(f"Added region 'cedar' = ({up} x cedarupper + {lo} x cedarlower) / {up + lo} grid cells")

    dup = long.duplicated(["region", "variable", "date"])
    if dup.any():
        print(f"WARNING dropped {dup.sum()} duplicate rows (same region/variable/date in two files)")
        long = long[~dup]

    Path(dst).parent.mkdir(parents=True, exist_ok=True)
    long[["date", "region", "variable", "value"]].sort_values(["region", "variable", "date"]).to_csv(dst, index=False)

    print("\nfile                              region     variable      units         start       end         rows")
    for row in inventory:
        print("{:33} {:10} {:13} {:24} {} {} {:>6}".format(*[str(x) for x in row]))
    print("\ngrid cells per region:", cells)
    print(f"\nwrote {dst}: {len(long)} rows")
    print("CHECK: units column above. Precip/runoff should be totals per month (kg m-2 = mm). Tair is converted to deg C.")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])

"""Is ski season getting worse near Snoqualmie Pass, and is temperature the cause?

Inputs (raw downloads, never edited):
  data/raw/validation/snotel_<id>.json         NRCS SNOTEL daily SWE (in), AWDB REST API
  data/raw/ski/snotel_<id>_temp_precip.json    NRCS SNOTEL daily TAVG/TMAX/TMIN (degF) and PREC
                                               (accumulated water-year precipitation, in), AWDB REST API
  data/raw/ski/noaa_oni.txt                    NOAA CPC Oceanic Nino Index (3-month seasons)
                                               https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt
  data/raw/ski/noaa_pdo.dat                    NOAA NCEI ERSSTv5 Pacific Decadal Oscillation index (monthly)
                                               https://www.ncei.noaa.gov/pub/data/cmb/ersst/v5/index/ersst.v5.pdo.dat
  data/clean/long.csv                          NLDAS-2 monthly (made by giovanni_to_long.py)

Stations: 788 Stampede Pass (1,180 m), 672 Olallie Meadows (1,228 m), 911 Rex River (1,155 m, from 1995).
Stampede Pass and Olallie Meadows sit a few km from the Snoqualmie Pass ski areas.

Ski metrics (one value per water year, Oct-Sep; "days" counted from Oct 1). The thresholds are rough
proxies for "skiable", not ski-area opening dates:
  season_start    first day SWE >= 100 mm (about 4 in of water, roughly 1 ft or more of settled snow)
  jan1_swe        SWE on Jan 1 (holiday-season snowpack)
  deep_days       days with SWE >= 500 mm (a deep base)
  snow_days       days with SWE >= 25 mm
  melt_out        first day after the peak with SWE <= 10% of the peak
  early_precip    Oct 1 - Dec 31 precipitation (did the storms come?)
  early_retention Jan 1 SWE / Oct-Dec precipitation (how much of what fell stayed as snow: "did it stick?")
  temp_novdec     Nov-Dec mean air temperature (SNOTEL; see sensor caveat below)
  temp_novmar     Nov-Mar mean air temperature (SNOTEL)

Trend test: the same Mann-Kendall (Hamed-Rao) + Sen's slope as pipeline.py, with Benjamini-Hochberg FDR
across every trend tested in this script (one family) -> q.

Drivers (year to year): standardized regression of jan1_swe and peak SWE on Nov-Mar temperature,
Nov-Mar precipitation, ENSO (ONI, Dec-Feb) and PDO (Nov-Mar mean). This shows what makes a winter good
or bad; it is not, by itself, proof of what causes a long-term trend.

Sensor caveat: NRCS replaced SNOTEL temperature sensors across the West in roughly 2005-2013, which is
known to add an artificial warm jump (Oyler et al. 2015, GRL). SNOTEL temperature TRENDS are therefore
reported with that warning, next to NLDAS temperature for the same years.

Usage:
  python analysis/ski.py data/clean/long.csv
Writes data/processed/ski.json
"""
import json
import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
import statsmodels.api as sm
from statsmodels.stats.multitest import multipletests

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from pipeline import analyze, verdict  # noqa: E402  same stats as the main analysis
from validate import snotel_daily  # noqa: E402

RAW = Path("data/raw/ski")
OUT = Path("data/processed/ski.json")
STATIONS = {"788": "Stampede Pass", "672": "Olallie Meadows", "911": "Rex River"}
MIN_DAYS = 330        # a water year of SWE needs this many daily values
MIN_FRAC = 0.9        # a temperature window needs this share of its days
MIN_YEARS = 15

METRICS = {
    "season_start": ("Snowpack reaches 100 mm", "days after Oct 1", "later is worse"),
    "jan1_swe": ("Snowpack on Jan 1", "mm", "lower is worse"),
    "deep_days": ("Days with a deep base (SWE >= 500 mm)", "days", "lower is worse"),
    "snow_days": ("Days with snow on the ground (SWE >= 25 mm)", "days", "lower is worse"),
    "melt_out": ("Melt-out day", "days after Oct 1", "earlier is worse"),
    "peak_swe": ("Peak snowpack", "mm", "lower is worse"),
    "early_precip": ("Oct-Dec precipitation", "mm", ""),
    "early_retention": ("Share of Oct-Dec precipitation still on the ground as snow on Jan 1", "fraction", "lower is worse"),
    "temp_novdec": ("Nov-Dec air temperature", "deg C", "warmer is worse"),
    "temp_novmar": ("Nov-Mar air temperature", "deg C", "warmer is worse"),
}


def wy(idx):
    return idx.year + (idx.month >= 10)


def day_of_wy(ts):
    return (ts - pd.Timestamp(ts.year - (ts.month < 10), 10, 1)).days


def element(sid, code):
    d = json.loads((RAW / f"snotel_{sid}_temp_precip.json").read_text())
    for e in d[0]["data"]:
        if e["stationElement"]["elementCode"] == code:
            v = pd.DataFrame(e["values"])
            s = pd.Series(pd.to_numeric(v["value"], errors="coerce").values, index=pd.to_datetime(v["date"]))
            return s[~s.index.duplicated()].dropna()
    raise KeyError(code)


def window_mean(daily, months):
    """Mean over the given months for each water year, only if MIN_FRAC of those days are present."""
    out = {}
    for y, s in daily.groupby(wy(daily.index)):
        days = pd.date_range(f"{y - 1}-10-01", f"{y}-09-30")
        want = days[days.month.isin(months)]
        got = s[s.index.isin(want)]
        if len(got) >= MIN_FRAC * len(want):
            out[y] = got.mean()
    return pd.Series(out, dtype=float)


def station_metrics(sid):
    swe = snotel_daily(sid).set_index("date")["value"]
    swe = swe[~swe.index.duplicated()]
    n = swe.groupby(wy(swe.index)).size()
    full = n[n >= MIN_DAYS].index
    swe = swe[wy(swe.index).isin(full)]
    g = swe.groupby(wy(swe.index))

    def first_at(s, thr):
        hit = s[s >= thr]
        return np.nan if hit.empty else day_of_wy(hit.index[0])

    def melt_out(s):
        after = s[s.index >= s.idxmax()]
        low = after[after <= 0.1 * s.max()]
        return np.nan if low.empty else day_of_wy(low.index[0])

    jan1 = swe[(swe.index.month == 1) & (swe.index.day == 1)]
    jan1.index = wy(jan1.index)

    # PREC is accumulated since Oct 1 (resets each water year); Dec 31 value = Oct-Dec total.
    prec = element(sid, "PREC") * 25.4
    dec31 = prec[(prec.index.month == 12) & (prec.index.day == 31)]
    oct1 = prec[(prec.index.month == 10) & (prec.index.day == 1)]
    dec31.index = wy(dec31.index)
    oct1.index = wy(oct1.index)
    early = (dec31 - oct1.reindex(dec31.index).fillna(0)).where(lambda x: x > 0)
    novmar_p = {}
    for y in prec.index.year.unique():
        a = prec.get(pd.Timestamp(y, 3, 31))
        b = prec.get(pd.Timestamp(y - 1, 10, 31))
        if a is not None and b is not None and a > b:
            novmar_p[y] = a - b

    tavg = (element(sid, "TAVG") - 32) / 1.8
    tavg = tavg[(tavg > -40) & (tavg < 40)]  # drop impossible values

    m = {
        "season_start": g.apply(lambda s: first_at(s, 100)),
        "jan1_swe": jan1,
        "deep_days": g.apply(lambda s: float((s >= 500).sum())),
        "snow_days": g.apply(lambda s: float((s >= 25).sum())),
        "melt_out": g.apply(melt_out),
        "peak_swe": g.max(),
        "early_precip": early,
        "temp_novdec": window_mean(tavg, [11, 12]),
        "temp_novmar": window_mean(tavg, [11, 12, 1, 2, 3]),
    }
    m["early_retention"] = (m["jan1_swe"] / m["early_precip"]).where(lambda x: np.isfinite(x))
    return {k: v.astype(float).dropna() for k, v in m.items()}, pd.Series(novmar_p, dtype=float)


def oni_djf():
    rows = [l.split() for l in (RAW / "noaa_oni.txt").read_text().splitlines()[1:] if l.strip()]
    d = pd.DataFrame(rows, columns=["seas", "yr", "total", "anom"])
    d = d[d.seas == "DJF"]
    return pd.Series(d.anom.astype(float).values, index=d.yr.astype(int).values)  # DJF of year Y -> WY Y


def pdo_novmar():
    lines = (RAW / "noaa_pdo.dat").read_text().splitlines()[2:]
    vals = {}
    for l in lines:
        p = l.split()
        if len(p) == 13:
            for i, v in enumerate(p[1:], 1):
                v = float(v)
                if v < 90:
                    vals[(int(p[0]), i)] = v
    out = {}
    for y in range(1950, 2027):
        want = [(y - 1, 11), (y - 1, 12), (y, 1), (y, 2), (y, 3)]
        if all(k in vals for k in want):
            out[y] = np.mean([vals[k] for k in want])
    return pd.Series(out)


def nldas_temp(long_csv, months, region="cedarupper"):
    long = pd.read_csv(long_csv, parse_dates=["date"])
    d = long[(long.region == region) & (long.variable == "tair") & long.date.dt.month.isin(months)]
    return d.groupby(wy(pd.DatetimeIndex(d.date))).value.mean()


def series_json(s):
    return [{"year": int(y), "value": round(float(v), 3)} for y, v in s.items()]


def drivers(target, temp, precip, oni, pdo):
    df = pd.concat({"y": target, "temp": temp, "precip": precip, "enso": oni, "pdo": pdo}, axis=1).dropna()
    if len(df) < MIN_YEARS:
        return None
    z = (df - df.mean()) / df.std()
    fit = sm.OLS(z.y, sm.add_constant(z[["temp", "precip", "enso", "pdo"]])).fit()
    return {
        "n_years": int(len(df)), "first_year": int(df.index.min()), "last_year": int(df.index.max()),
        "r2": float(fit.rsquared),
        "standardized_effect": {k: float(fit.params[k]) for k in ["temp", "precip", "enso", "pdo"]},
        "p_value": {k: float(fit.pvalues[k]) for k in ["temp", "precip", "enso", "pdo"]},
        "correlation": {k: float(df.y.corr(df[k])) for k in ["temp", "precip", "enso", "pdo"]},
        "predictor_correlation": {"temp_enso": float(df.temp.corr(df.enso)), "temp_pdo": float(df.temp.corr(df.pdo)),
                                  "enso_pdo": float(df.enso.corr(df.pdo))},
    }


def main(long_csv):
    warnings.filterwarnings("ignore")
    oni, pdo = oni_djf(), pdo_novmar()
    tests, stations = [], []
    for sid, name in STATIONS.items():
        m, novmar_p = station_metrics(sid)
        st = {"id": sid, "name": f"{name} SNOTEL", "metrics": {}}
        for key, s in m.items():
            if len(s) < MIN_YEARS:
                continue
            t = analyze(s)
            st["metrics"][key] = {"label": METRICS[key][0], "units": METRICS[key][1], "worse": METRICS[key][2],
                                  "series": series_json(s), "trend": t}
            tests.append((sid, key, t))
        worst = m["peak_swe"].sort_values().head(5)
        st["worst_years"] = [{"year": int(y), "peak_swe": round(float(v)), "enso_djf": float(oni.get(y, np.nan)),
                              "pdo_novmar": round(float(pdo.get(y, np.nan)), 2),
                              "temp_novmar": None if y not in m["temp_novmar"] else round(float(m["temp_novmar"][y]), 2)}
                             for y, v in worst.items()]
        st["drivers"] = {k: drivers(m[k], m["temp_novmar"], novmar_p, oni, pdo) for k in ["jan1_swe", "peak_swe", "season_start"]}
        stations.append(st)

    # NLDAS temperature over the same years as the SNOTEL temperature record, as a sensor-independent check.
    nl = {}
    for key, months in [("temp_novdec", [11, 12]), ("temp_novmar", [11, 12, 1, 2, 3])]:
        s = nldas_temp(long_csv, months)
        first = min(st["metrics"][key]["trend"]["first_year"] for st in stations if key in st["metrics"])
        for label, sub in [("1980-2025", s), (f"{first}-2025 (same years as SNOTEL temperature)", s[s.index >= first])]:
            t = analyze(sub)
            nl[f"{key} {label}"] = {"label": METRICS[key][0] + ", NLDAS Upper Cedar", "units": "deg C",
                                    "series": series_json(sub), "trend": t}
            tests.append(("nldas", f"{key} {label}", t))

    q = multipletests([t["p_value"] for _, _, t in tests], method="fdr_bh")[1]
    for (_, _, t), qq in zip(tests, q):
        t["q_value"] = float(qq)
        t["verdict"] = verdict(float(qq), t["years_to_detect"], t["ci_low"], t["ci_high"])

    OUT.write_text(json.dumps({
        "about": "Ski-season metrics from NRCS SNOTEL daily data near Snoqualmie Pass, with NOAA ENSO (ONI) and PDO "
                 "indices and NLDAS-2 temperature. q = Benjamini-Hochberg FDR across all trends in this file.",
        "sensor_caveat": "SNOTEL temperature sensors were replaced across the western US around 2005-2013, which "
                         "adds an artificial warm jump (Oyler et al. 2015). Treat SNOTEL temperature trends with "
                         "caution; compare with the NLDAS temperature in nldas_temperature.",
        "stations": stations, "nldas_temperature": nl}, indent=1))

    print(f"{'station':16} {'metric':16} {'years':10} {'mean':>8} {'slope/dec':>10} {'p':>7} {'q':>7}  verdict")
    for (sid, key, t) in tests:
        name = STATIONS.get(sid, "NLDAS")
        print(f"{name:16} {key[:30]:16} {t['first_year']}-{t['last_year']} {t['mean']:8.2f} {t['slope_per_decade']:+10.2f} "
              f"{t['p_value']:7.3f} {t['q_value']:7.3f}  {t['verdict']}")
    for st in stations:
        print(f"\n{st['name']}: worst years", ", ".join(f"{w['year']} ({w['peak_swe']} mm, ONI {w['enso_djf']:+.1f}, PDO {w['pdo_novmar']:+.1f})" for w in st["worst_years"]))
        for k, d in st["drivers"].items():
            if d:
                e, p = d["standardized_effect"], d["p_value"]
                print(f"  {k:13} {d['first_year']}-{d['last_year']} R2={d['r2']:.2f}  " + "  ".join(
                    f"{v}={e[v]:+.2f} (p={p[v]:.3f})" for v in e) + "   r: " + " ".join(f"{v}={d['correlation'][v]:+.2f}" for v in e))
    print(f"\nwrote {OUT}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])

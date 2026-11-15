
import json
from pathlib import Path

import numpy as np
from scipy.stats import kendalltau, theilslopes, pearsonr

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "processed"

REGIONS = ["cedarupper", "cedarlower", "tolt"]
METRICS = [
    "peak_swe",
    "winter_runoff",
    "summer_runoff",
    "winter_temp",
    "total_precip",
    "rain_fraction",
]


def load_series(region, metric):
    path = DATA / f"{region}_{metric}.json"

    if not path.exists():
        return None

    with open(path) as f:
        obj = json.load(f)

    values = {
        int(p["year"]): float(p["value"])
        for p in obj["series"]
        if p.get("value") is not None
        and np.isfinite(float(p["value"]))
    }
    return values, obj.get("units", "")


def trend(series):
    years = np.array(sorted(series), dtype=float)
    values = np.array([series[int(y)] for y in years])

    if len(years) < 5:
        return None

    tau, p = kendalltau(years, values)
    slope, intercept, low, high = theilslopes(
        values, years, alpha=0.95
    )

    return {
        "n_years": len(years),
        "first_year": int(years[0]),
        "last_year": int(years[-1]),
        "slope_per_year": float(slope),
        "slope_ci_95": [float(low), float(high)],
        "kendall_tau": float(tau),
        "p_value": float(p),
        "significant": bool(p < 0.05),
        "direction": (
            "increasing" if slope > 0
            else "decreasing" if slope < 0
            else "flat"
        ),
    }


def snow_runoff_relationship(region):
    snow = load_series(region, "peak_swe")
    runoff = load_series(region, "summer_runoff")

    if snow is None or runoff is None:
        return None

    common = sorted(set(snow[0]) & set(runoff[0]))

    if len(common) < 5:
        return None

    x = np.array([snow[0][y] for y in common])
    y = np.array([runoff[0][yr] for yr in common])

    if np.std(x) == 0 or np.std(y) == 0:
        return None

    r, p = pearsonr(x, y)

    return {
        "n_years": len(common),
        "correlation": float(r),
        "p_value": float(p),
        "significant": bool(p < 0.05),
        "note": (
            "Same-year association; correlation "
            "does not establish causation."
        ),
    }


def main():
    output = {}

    for region in REGIONS:
        result = {"trends": {}}

        for metric in METRICS:
            loaded = load_series(region, metric)

            if loaded is None:
                continue

            series, units = loaded
            stats = trend(series)

            if stats:
                result["trends"][metric] = {
                    "units": units,
                    **stats,
                }

        result["snow_runoff_relationship"] = (
            snow_runoff_relationship(region)
        )

        output[region] = result

    target = DATA / "scientific_findings.json"
    with open(target, "w") as f:
        json.dump(output, f, indent=2, allow_nan=False)

    print(f"Saved findings to {target}")

    for region, result in output.items():
        print(f"\n{region.upper()}")

        for metric, stats in result["trends"].items():
            print(
                f"{metric:18s} "
                f"slope={stats['slope_per_year']:+.4f} "
                f"p={stats['p_value']:.4g} "
                f"CI={stats['slope_ci_95']}"
            )

        print(
            "Snow/runoff relationship:",
            result["snow_runoff_relationship"]
        )


if __name__ == "__main__":
    main()

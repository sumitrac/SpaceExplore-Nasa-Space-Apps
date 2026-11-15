# CascadeWatch: Snow to Tap: Status handoff (Nov 15, 2026)

Read `HANDOFF.md` first for the project goals, challenge brief and analysis spec. This file covers **where the code is, what the data shows, and what is left before submission**.

**Guardrail:** every number in the app comes from scripts run on data in this repo. Nothing is hard-coded, invented or nudged. If the data contradicts the hypothesis, the app and pitch say so.

---

## 1. Branches

| Branch | State |
|---|---|
| `main` (`0e7cb35`) | Has the real pipeline and Trends section, plus Shilpa's redesign (PRs #3 and #4). ⚠ It still has the two problems fixed below. |
| **`fix-real-data-pipeline`** (`b9d3535`, pushed) | **Open a PR into main:** https://github.com/sumitrac/SpaceExplore-Nasa-Space-Apps/pull/new/fix-real-data-pipeline. Shilpa should review it, because it changes the data behind her sections. |
| `NASA-giovanni-Sanjana` | Already merged into main. Nothing new on it. |
| `NASA-frontend-Shilpa` | Merged into main. |
| `NASA-Hydrology-Sumitra`, `sanvidha-pipeline`, `integrate` | Hourly Cedar data and earlier pipeline work. Nothing on them is needed by the app. |

### What `fix-real-data-pipeline` fixes
1. **The pipeline crash.** `pipeline.py` `by_month()` used an undefined `y`, which raised a `NameError`. It now uses `s.values`. The full pipeline runs again. Rerunning it applied Sanvidha's "max of two p-values" safeguard to the outputs for the first time. A few p and q values for no-trend series went up slightly. **No verdict changed.**
2. **Sample data in the story sections.** Glance, Story, Explore, Impact and the 3D data mountain read `frontend/src/data/watersheds/{cedar,tolt}.json`. On main these files are fake ("Sample data shaped like NLDAS-2"). The branch rebuilds them from real data with the new script `analysis/build_watersheds.py`:
   - Snowpack, air temperature, rain, snowfall and runoff come from NLDAS-2 via Giovanni, Oct 1979 – Sep 2025.
   - Streamflow (Cedar only) is the monthly mean of USGS 12115000 in cfs, with no missing months. Tolt has no gauge download yet, so the app uses NLDAS runoff there.
   - **Melt-out day is not produced.** It needs daily snow data, and our NLDAS data is monthly. The "Is it melting earlier?" chapter hides itself, and Glance and Explore skip it.
   - The sample banner is gone, and Glance now shows water year 2025.
   - Story text no longer claims what the data doesn't show. "Why? Winters are warming" became "Are winters warming?", and the river and closing text are phrased as hypotheses.

---

## 2. How to run everything

```bash
# one-time setup
python3 -m venv .venv
.venv/bin/pip install pandas numpy pymannkendall statsmodels
cd frontend && npm install && cd ..

# data -> results  (rerun after any new download)
.venv/bin/python giovanni_to_long.py data/raw/giovanni data/clean/long.csv
.venv/bin/python pipeline.py data/clean/long.csv          # trends   -> data/processed/*.json
.venv/bin/python analysis/validate.py data/clean/long.csv # ground   -> data/processed/validation.json
.venv/bin/python analysis/build_watersheds.py data/clean/long.csv  # story data -> frontend/src/data/watersheds/

# app (predev/prebuild copy data/processed/*.json -> frontend/public/data/)
cd frontend && npm run dev      # http://localhost:5173/
cd frontend && npm run build
```

- Before a fresh real-data run, `rm data/processed/*.json`, because stale region or variable files are not removed automatically.
- `pipeline.py --fake` writes synthetic output. Delete it afterwards.
- ⚠ The `.gitignore` on main ignores `data/raw/`. Files already tracked are fine, but **new raw downloads won't be committed** unless that line is changed or the files are force-added.

---

## 3. Repo map

| Path | What it is |
|---|---|
| `data/raw/giovanni/` | Giovanni area-averaged NLDAS-2 monthly CSVs, Oct 1979 – Sep 2025. Never edit. |
| `data/raw/validation/` | SNOTEL 672, 911 and 788 (AWDB JSON, SWE in inches) and USGS 12115000 / 12115500 daily discharge (`.rdb`, cfs) |
| `data/clean/long.csv` | date, region, variable, value (made by `giovanni_to_long.py`) |
| `data/clean/hourly/` | Hourly Upper Cedar CSVs from Sumitra/Sanvidha (`build_long.py`). **Not used by the app.** |
| `pipeline.py` | One value per water year, then Mann-Kendall + Sen + FDR, then `data/processed/<region>_<variable>.json` + `index.json` |
| `analysis/validate.py` | Compares NLDAS with SNOTEL and USGS (`validation.json`) |
| `analysis/build_watersheds.py` | Builds the monthly arrays for the story sections (`frontend/src/data/watersheds/*.json`) |
| `frontend/src/components/Trends.jsx` (+ `TrendChart`, `ZoneMap`, `Validation`, `Tours`, `lib/trends.js`) | "What the NASA data shows": the pipeline's verdicts, map, ground checks and guided tours |
| `frontend/src/components/{Header,Glance,Story,Explore,Impact,DataMountain}.jsx` (+ `lib/series.js`, `lib/stats.js`, `state/AppState.jsx`) | Shilpa's redesign. Reads the watershed JSON. |
| `frontend/src/data/facts.js` | Cited outside facts (SPU, state climatologist, UW) used by Hero, WaterPath and SnowBank |
| `docs/*.png` | Pitch screenshots (taken before the redesign, so they may need retaking) |

### Two sets of statistics, by design
- **Trends section:** the official results, computed in Python. Mann-Kendall with the Hamed-Rao autocorrelation correction, Sen's slope with a 95% CI, and Benjamini-Hochberg q across all 25 series.
- **Story, Explore and Glance:** `lib/stats.js` runs a *plain* Mann-Kendall in the browser, with no autocorrelation correction and no FDR, so readers can explore any season or variable. On the current data the two methods agree for every series the story mentions. If they ever disagree, the Trends section is the one to cite.

---

## 4. What the data shows (water years 1980–2025, n = 46)

| Zone | Summer runoff (Jul–Sep) per decade | q | Verdict |
|---|---|---|---|
| Cedar (whole) | −11.9 mm (−15% of mean) | 0.030 | real trend |
| Upper Cedar | −11.5 mm (−14%) | 0.030 | real trend |
| Lower Cedar | −12.3 mm (−16%) | 0.030 | real trend |
| South Fork Tolt | −14.9 mm (−14%) | 0.042 | real trend |

**Everything else** (peak snowpack, rain fraction, winter temperature, winter runoff, total precipitation, in every zone including Seattle) shows **no significant trend** (q ≥ 0.9).

The hypothesis is **only partly supported**. Summer runoff decline is real. Snowpack decline, a rising rain share and rising winter runoff are *not* seen in NLDAS over 1980–2025.

### Ground checks (`validation.json`, p not FDR-adjusted)

| Comparison | Ground slope/decade (p) | NLDAS slope/decade (p) | r | Model ÷ ground |
|---|---|---|---|---|
| Summer runoff, Cedar R. gauge 12115000 | −12.7 mm (0.007) | −11.5 mm (0.004) | 0.66 | 0.58 |
| Summer runoff, Rex R. gauge 12115500 | −17.7 mm (< 0.001) | −11.5 mm (0.004) | 0.81 | 0.63 |
| Winter runoff, Cedar R. gauge | +7.0 mm (0.69) | −12.1 mm (0.52) | 0.84 | 0.99 |
| Winter runoff, Rex R. gauge | −9.0 mm (0.79) | −12.1 mm (0.52) | 0.84 | 0.78 |
| Peak SWE, Stampede Pass SNOTEL (1983–) | **−76.1 mm (0.023)** | −4.1 mm (0.74) | 0.69 | 0.19 |
| Peak SWE, Olallie Meadows SNOTEL (1983–) | +1.2 mm (0.97) | −5.4 mm (0.65) | 0.71 | 0.14 |
| Peak SWE, Rex River SNOTEL (1996–) | −6.5 mm (0.90) | −17.7 mm (0.46) | 0.88 | 0.22 |

- **Headline:** the summer runoff decline is confirmed by two independent, unregulated river gauges.
- NLDAS holds only 14–22% of station snowpack, because 12 km cells average high slopes with valleys. It does track the ups and downs from year to year (r 0.69–0.88).
- Stampede Pass shows a real snowpack decline that the model misses.

### Story-section numbers (from the real watershed files, on the fix branch)
- WY2025 Cedar: peak snowpack 42% of normal (50 mm vs. a 1991–2020 median of 121 mm), winter rain share 88%, Jul–Sep river flow 53% of normal (29 cfs).
- Late-summer flow is 19% lower in 2011–2025 than in 1980–1994 (Cedar gauge). Tolt runoff is 39% lower.

### Exploratory, NOT in the app
Upper Cedar Jun–Sep air temperature is +0.39 °C per decade (p < 0.001), and Jun–Sep rain is −8% per decade (p = 0.03). Tolt summer temperature is +0.36 °C per decade (p = 0.001). This is the likely explanation for the summer runoff decline. It was found *after* seeing the results, so if it is added (as `summer_temp` and `summer_rain` metrics) it must be disclosed. **Team decision pending.**

---

## 5. Left to do for the MVP (priority order)

**🔴 Before demo**
1. **Merge `fix-real-data-pipeline` into main.** Until then, main shows sample data in five sections and the pipeline crashes.
2. **Fix stale docs:**
   - `frontend/README.md` still describes the sample data and points to an `analysis/README.md` that doesn't exist.
   - `README.md` lists KNMI, SWOT and AppEEARS/MODIS, which we don't use, and has "Deployment: TBD".
   - The story framing elsewhere (Hero, WaterPath, Impact intro) still leans on "less snow". It is cited background, but the headline must be **summer runoff ↓, confirmed by gauges**.
3. **Deploy.** `vite.config.js` already sets the GitHub Pages base path when `GITHUB_ACTIONS` is set, but nothing is deployed yet.

**🟠 Submission** (check the exact requirements in the Space Apps participant guide)
4. A ~30-second demo video or slides. The "Is Seattle's summer water shrinking?" tour is a ready script. Retake the `docs/*.png` screenshots after the redesign.
5. A project write-up covering: summary, NASA data (NLDAS-2 via Giovanni), other data (NRCS SNOTEL, USGS NWIS), tools (Python, pymannkendall, React/Vite), and a disclosure of AI use.

**🟡 Nice to have**
6. The `summer_temp` / `summer_rain` decision (see §4).
7. A Tolt streamflow gauge (an unregulated USGS gauge above the reservoir) so Tolt gets river flow like Cedar.
8. Melt-out date from daily data: SNOTEL daily at a station (label it as a station, not the watershed), or daily NLDAS.
9. Unify the browser statistics with the pipeline (for example, show the pipeline's q when available).
10. Decide whether the hourly CSVs in `data/clean/hourly/` stay in the repo (they add a lot of size and aren't used).
11. Optional data: GPM IMERG daily rain for Seattle, MODIS snow cover (both start in 2000).

---

## 6. Known issues and caveats
- **Seattle Giovanni file:** Nov 2025 is missing and May 2026 appears twice. Only water year 2026 is affected, and it is dropped automatically.
- **Small boxes:** Tolt and Lower Cedar are 2 NLDAS cells each, and Seattle is 4. The boxes are approximate rectangles, not watershed outlines.
- **Metric definitions** differ slightly from `HANDOFF.md` §5:
  - peak SWE = the highest monthly mean, not the Mar–Apr mean;
  - winter runoff = Dec–Feb;
  - summer runoff = Jul–Sep.
  Pick one set and state it in the pitch.
- Gauge 472208121375600 (named in HANDOFF) has no daily record, so the co-located USGS 12115000 is used.
- `.venv/`, `node_modules/` and `frontend/public/data/` are gitignored. Recreate them with §2.

## 7. Attribution
NASA NLDAS-2 (via NASA Giovanni), NRCS SNOTEL (AWDB), USGS NWIS. Add GPM IMERG and MODIS if they are used.

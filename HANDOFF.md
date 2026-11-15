# CascadeWatch: Snow to Tap 💧 — Handoff for Claude Code

NASA Space Apps Challenge 2026 (Nov 14–15), Seattle team of 4–6.
Challenge: **"Be an Earth System Trend Detective!"** (Advanced, Earth Science / Software)
https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/

> Read this file first. Then inspect the repo to see what data teammates have already collected before writing any code. Do not assume file names or formats; check them.

---

## 1. The project in one paragraph

Seattle Public Utilities supplies drinking water to ~1.6 million people from two mountain watersheds: the **Cedar River** (~60–70% of supply) and the **South Fork Tolt** (~30–40%). Hypothesis: warmer winters shift precipitation from snow to rain, so less water is stored as snowpack for summer. We build a **trend detective tool**: pick a watershed/zone → it scans NASA variables → removes the seasonal cycle → runs Mann-Kendall + Sen's slope → reports *what* is changing, *where*, *how much*, and *whether it's statistically significant*. If a trend is not significant yet, it estimates how many more years of data would be needed.

**Hypothesized "wow" (NOT YET CONFIRMED — must come from the data):** same warming, opposite trends — snowpack ↓, snow fraction ↓, winter runoff ↑, summer runoff ↓, total precipitation ~flat; and high-elevation vs low-elevation zones behaving differently. If the data disagrees, report what the data actually shows. Never hard-code or "nudge" results.

---

## 2. Challenge requirements (must hit all four)

1. Identify Earth science variables that may show trends.
2. Acquire the variables for a specific region (not global).
3. Generate and visualize a time series long enough for statistics.
4. Basic statistical analysis: rate of change + significance test (t-test, Mann-Kendall, or confidence intervals).

Suggested extras from the brief (we want these): simple definitions of each variable for a lay audience; a guided/question-driven entry ("What do you want to investigate?"); 1–2 demo walkthroughs; handling regionally opposite trends; noting that non-significant trends may become significant with more data. Linear trends are sufficient; complex non-linear analysis is out of scope.

Audience: high school / college students and the science-curious public.

---

## 3. Regions (Giovanni bounding-box format: West, South, East, North)

Approximate rectangles built from landmarks — not official watershed outlines.

| Zone | Box | Notes |
|---|---|---|
| Upper Cedar (high, snowy) | `-121.72,47.25,-121.33,47.44` | East of Chester Morse Lake (~47.387N, -121.700W). ~6 NLDAS cells. |
| Lower Cedar (lower, rainier) | `-121.97,47.32,-121.72,47.46` | West of Chester Morse toward Landsburg. |
| Full Cedar | `-121.97,47.25,-121.33,47.46` | Union of the two above. |
| South Fork Tolt | `-121.70,47.66,-121.53,47.75` | Tolt Dam ~47.693N, -121.690W. Only ~1–2 NLDAS cells — say so in the UI. |
| Seattle city (contrast) | `-122.44,47.49,-122.24,47.74` | City rain, for "city vs mountains" contrast. |
| Seattle metro (alt) | `-122.50,47.40,-122.10,47.80` | More grid cells. |
| Combined gridded download | `-121.97,47.25,-121.33,47.75` | If teammates pulled raw NetCDF covering both watersheds. |

---

## 4. Data sources

### Primary: NLDAS-2 (0.125°, monthly, 1979–present)
Product `NLDAS_NOAH0125_M v2.0`:
- `SWE` — snow water equivalent (kg m⁻² = mm of water)
- `Snowf` — snowfall / frozen precipitation
- `Rainf` — rainfall / liquid precipitation
- `Qs` — surface runoff
- `Qsb` — subsurface runoff (baseflow)

Product `NLDAS_FORA0125_M v2.0`:
- `Tair` — 2 m air temperature (likely Kelvin — verify)

**Verify units in each file's metadata/header.** Monthly flux variables may be monthly totals or rates; check before summing.

### Secondary / cross-checks
- **GPM IMERG monthly** (0.1°, from 2000-06): independent precipitation check.
- **MODIS MOD10A2** (8-day max snow extent, 500 m, from 2000) via AppEEARS: snow-covered weeks per year / snow-off date. 8-day product chosen because winter cloud cover gaps the daily product.
- MERRA-2: too coarse (~50 km) for these watersheds; cross-check only, not primary.

### Ground truth for validation
- **Rex River SNOTEL** (NRCS, inside the Cedar watershed) — annual snowpack record.
- **USGS gauge 472208121375600, "Cedar R Abv Chester Morse Lk, NR Cedar Falls"** (47.3715N, -121.6323W) — upstream of the reservoir, so closer to natural runoff. Gauges farther downstream are dam-regulated; do not use them for natural-runoff trends.
- SPU's public "Current Water Supply Graphs" PDF shows weighted Cedar/Tolt SWE vs the 1990–2019 median — good visual sanity check only.

### Data formats likely in the repo
- **Giovanni "Time Series, Area-Averaged" CSVs:** have several metadata lines at the top before the data table. Parse robustly: skip lines until the header row (typically starting with `time`). One value per month, already averaged over the box.
- **GES DISC subset NetCDF:** gridded (time × lat × lon). Use `xarray`; slice per zone yourself.
- Possibly PNG/GeoTIFF maps from Giovanni (presentation assets only).

---

## 5. Analysis spec

**Water year:** Oct 1 – Sep 30, labeled by the ending year (WY2025 = Oct 2024–Sep 2025). Target period: **WY1980–WY2025** for NLDAS; WY2001–WY2025 for MODIS/GPM.

**Remove the seasonal cycle by deriving one value per water year:**

| Metric | Derivation |
|---|---|
| Peak-season snowpack | Mean of March + April `SWE` (proxy for April 1 SWE) |
| Snow fraction ⭐ | Σ`Snowf` / (Σ`Snowf` + Σ`Rainf`) over the water year |
| Total precipitation | Σ(`Snowf` + `Rainf`) over the water year |
| Winter temperature | Mean `Tair` Nov–Mar |
| Winter runoff | Σ(`Qs` + `Qsb`) Nov–Mar |
| Summer runoff | Σ(`Qs` + `Qsb`) Jun–Sep |
| Snow cover (MODIS) | Snow-covered 8-day periods per water year, or snow-off date |

Alternative: seasonal Mann-Kendall on monthly data. Annual aggregation is simpler and easier to explain — prefer it.

**Statistics (per metric × zone):**
- Mann-Kendall test → p-value, direction. Library: `pymannkendall`. Consider `hamed_rao_modification_test` to account for autocorrelation; report which test was used.
- Sen's slope → rate of change; express per decade and as % of the long-term mean.
- Significance threshold: p < 0.05. Label clearly: "significant", "not significant (yet)".
- Also return n (years), mean, and Sen's slope confidence interval if available.

**"Years until significant" estimate (rough, label it as such):**
For linear slope *b* and residual standard deviation σ (residuals around the trend line), significance at ~95% is reached around
`n_needed ≈ (1.96 · σ · √12 / |b|)^(2/3)` → years remaining = `n_needed − n_current` (floor at 0).
Caveats to show in UI: assumes the trend continues linearly and noise is independent.

**Validation:** compute the same peak-SWE trend from Rex River SNOTEL and compare direction/magnitude with NLDAS Upper Cedar. Compare NLDAS runoff seasonality vs the upstream USGS gauge. Report agreement *and* disagreement honestly.

---

## 6. App spec

Frontend: interactive map + panel. Streamlit is fastest; React + Leaflet/Plotly if a front-end teammate prefers. Precompute results to JSON — **no live API calls during the demo**, and never present static data as live.

Flow:
1. Entry question: "What do you want to investigate?" (Water supply / Snow / Rain / Temperature) → suggests variables.
2. Map with zones (Upper Cedar, Lower Cedar, Tolt, Seattle city). Click a zone.
3. For each variable: annual time series chart + Sen's slope line, verdict card, e.g. *"Peak snowpack is changing by X% per decade. Significant (p = 0.0Y)."* or *"Not significant yet — roughly N more years of data needed at this rate."*
4. "Opposite trends" view: side-by-side winter vs summer runoff, and Upper vs Lower Cedar.
5. Plain-language definitions of every variable (SWE, snow fraction, runoff, Mann-Kendall, p-value).
6. Data sources + caveats panel (grid resolution vs watershed size, Tolt is 1–2 cells, approximate boxes, model vs observation).
7. 1–2 guided demo walkthroughs.

---

## 7. Suggested repo layout (adapt to what exists)

```
data/raw/          # untouched downloads from teammates (never edit)
data/processed/    # annual metrics per zone (CSV)
analysis/          # loading, aggregation, stats, validation scripts
results/           # trends.json consumed by the app
app/               # frontend
docs/              # pitch assets, screenshots, write-up
```

---

## 8. Task list

1. Inventory `data/` (or wherever downloads are): list files, variables, zones, date ranges, units. Report gaps to the team.
2. Write a robust loader for Giovanni CSVs (metadata header) and NetCDF.
3. Build annual metrics per zone (Section 5 table).
4. Run Mann-Kendall + Sen's slope + years-to-significance; write `results/trends.json`.
5. Validation vs SNOTEL / USGS.
6. Build the app on top of `trends.json`.
7. Pitch assets: one headline chart, opposite-trends chart, 30-second demo video, write-up.

---

## 9. Guardrails

- Every number shown must come from code run on the data in this repo. No placeholder or invented values in the final app.
- The hypothesis in Section 1 is a hypothesis. If results contradict it, the app and pitch say so.
- Keep raw downloads untouched; all transforms are scripted and reproducible.
- Attribute all data sources in the app (NASA NLDAS-2, GPM IMERG, MODIS, NRCS SNOTEL, USGS).
- Time is short: 3 clean variables beat 6 half-finished ones. Cut scope before cutting correctness.

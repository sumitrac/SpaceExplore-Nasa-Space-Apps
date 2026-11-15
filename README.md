# CascadeWatch — Be An Earth System Trend Detective

**NASA Space Apps Challenge 2026**
Team size: 6 | Location: Seattle, WA

---

## The Story

The Cedar River and Tolt River watersheds supply drinking water to roughly 1.5 million people in the Seattle metro area. Both are fed by snowpack in the Cascade Mountains — a natural reservoir that accumulates over winter and releases slowly through spring and summer.

Over 45 years of NASA data tells a clear story: Seattle's summer water supply is shrinking. Real USGS river gauges confirm it — the Cedar River is losing roughly 13 mm of runoff per decade (p = 0.007), and the Rex River 18 mm per decade (p < 0.001). Summer air temperatures are rising about 0.4°C per decade (p < 0.001), and summer rainfall in the upper Cedar watershed is falling around 8% per decade (p = 0.03).

The cause isn't simply less snow — it's a combination of rising temperatures and declining summer rain that together reduce how much water reaches the rivers when it's needed most. This project uses NASA Earth observation data to tell that story: what is changing, how much, and what it means for the people, wildlife, and infrastructure that depend on these watersheds.

---

## What We Built

A web app that lets users explore 45+ years of NASA snowpack and watershed data for the Cedar River and Tolt River watersheds. The app tells the story of how summer water supply in the Cascades is changing and what that means for the people, wildlife, and infrastructure downstream.

### Features
- Region selector (Cedar, Tolt, Seattle) with ranked variable list
- Time series charts for each variable with trend visualization
- Verdict cards summarizing whether each trend is statistically significant
- Opposite trends chart showing runoff by month (winter vs. summer)
- "Years until detectable" indicator for uncertain trends
- Plain language definitions for each variable
- "What this means for you" panel with King County and FEMA flood map links

### Deployment
Hosted publicly via Vercel or GitHub Pages.

---

## Data Sources & Tools

### NASA Tools
- **[Giovanni](https://giovanni.gsfc.nasa.gov/)** — primary tool for extracting time-series data across the Cedar and Tolt watershed regions and Seattle:
  - **NLDAS-2 Noah (monthly)** — snow water equivalent (`swe`), snowfall (`snowfall`), rainfall (`rain`), surface + subsurface runoff (`runoff`) — Cedar & Tolt, Jan 1979–Sep 2025
  - **NLDAS-2 Forcing (monthly)** — near surface air temperature (`tair`) — Cedar & Tolt, Jan 1979–Sep 2025
  - **GPM IMERG Final (daily)** — precipitation (`precip_daily`) — Seattle region, Jun 2000–Sep 2025
- **[AppEEARS](https://appeears.earthdatacloud.nasa.gov/)** — snow cover days (`snow_cover_days`) via MODIS MOD10A2, one value per water year — Cedar & Tolt, 2001–present
- **[Hydrology Time Series](https://disc.gsfc.nasa.gov/information/tools?title=Hydrology%20Data%20Rods%20Time%20Series)** — hydrological time-series generation
- **[Climate Data Online (CDO)](https://www.ncdc.noaa.gov/cdo-web/)** — historical weather and climate station data for the Cascade region

### Study Regions

| Region | Use | Approximate Bounding Box |
|--------|-----|--------------------------|
| Cedar | Snowpack, runoff, temperature | 121.85°W, 47.25°N, 121.35°W, 47.50°N |
| Tolt | Same variables (second watershed) | 121.85°W, 47.60°N, 121.45°W, 47.80°N |
| Seattle | Heavy rain / sewer story | 122.44°W, 47.49°N, 122.24°W, 47.74°N |

### Space Agency Partner Tools
- **[KNMI Climate Explorer](https://climexp.knmi.nl/)** — scientific analysis and visualization of climate data, used for trend analysis
- **[SWOT Mission](https://swot.jpl.nasa.gov/)** — surface water elevation measurements for rivers, lakes, and reservoirs

### Analysis & Methods
- Statistical significance testing applied to all identified trends, following the methods described in the challenge's recommended resources

### Supplementary Data
- USGS streamflow gauges — Cedar River (USGS 12115000, −13 mm/decade, p = 0.007) and Rex River (USGS 12115500, −18 mm/decade, p < 0.001)
- SNOTEL snowpack stations — Stampede Pass (significant decline, −76 mm/decade, p = 0.023), Olallie Meadows and Rex River (no significant trend)
- Seattle Public Utilities water rate history (for water cost impact analysis)

### Key Findings
- Summer runoff declining in both watersheds, confirmed by real USGS gauges
- Summer air temperature rising ~0.4°C per decade (p < 0.001)
- Upper Cedar summer rainfall falling ~8% per decade (p = 0.03)
- Snowpack trends mixed — Stampede Pass declining significantly, other stations flat
- NASA model captures runoff trends well but underestimates snowpack by 78–86% due to 12 km grid cell resolution averaging high slopes with low valleys

### Who Is Affected

| Who | How |
|-----|-----|
| 🏠 Households | Possible summer conservation requests, higher summer bills |
| 🏘️ River towns | More winter flooding |
| 🐟 Salmon, orcas, tribes | Warmer, lower rivers in late summer |
| ⚡ Electricity customers | Less summer hydropower |
| 🏞️ Lake and boating users | Lower summer flows to Lake Washington |
| 🌲 The watershed itself | Higher wildfire risk |
| 🏔️ Winter recreation | Shorter, less reliable seasons for skiing, snowshoeing, and mountain recreation |
| 🏛️ The city and utilities | Harder to balance flood space and summer storage |


---

## Tech Stack

- **Frontend:** React 18 + Vite
- **Components:** Hero, MountainScene, SnowBank, WaterPath, WinterTimeline, DataSources
- **Data processing:** Google Colab (Python)
- **Deployment:** Vercel or GitHub Pages (TBD)

---

## Team

A team of 6 based in Seattle, competing in the NASA Space Apps Challenge 2026.

---

## Challenge

[Earth System Trend Detective](https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective) — NASA Space Apps Challenge 2026

> *Find and examine variables measured by NASA missions, visualize how they change over time, and determine what is changing, where, how much, and whether those changes are statistically significant.*

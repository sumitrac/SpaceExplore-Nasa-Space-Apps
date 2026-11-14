# SpaceExplore — Be An Earth System Trend Detective

**NASA Space Apps Challenge 2026**
Team size: 6 | Location: Seattle, WA

---

## The Story

The Cedar River and Tolt River watersheds supply drinking water to roughly 1.5 million people in the Seattle metro area. Both are fed by snowpack in the Cascade Mountains — a natural reservoir that accumulates over winter and releases slowly through spring and summer.

As temperatures rise, that snowpack is changing. Less snow, earlier melt, and shifting precipitation patterns all affect how much water flows into these watersheds and when. This project uses NASA Earth observation data to tell that story: what is changing in the Cascades over the last 20 years, how much, and what does it mean for the watersheds — and the water bills — downstream?

---

## What We Built

An interactive web app that lets users explore multi-decade NASA data tied to Cascade snowpack and its downstream effects on the Cedar River and Tolt watersheds. Users can:

- Visualize how key variables (snow water equivalent, temperature, precipitation, streamflow) have changed over the last 20 years
- Identify statistically significant trends in the data
- Follow a guided narrative connecting snowpack decline to watershed-level impacts
- Explore the potential downstream effect on municipal water costs for Seattle residents
- Compare current conditions against historical baselines

---

## Data Sources & Tools

### NASA Tools
- **[Giovanni](https://giovanni.gsfc.nasa.gov/)** — primary tool for exploring and downloading time-series data across a wide range of Earth observation variables (snowpack, temperature, precipitation)
- **[Hydrology Time Series](https://disc.gsfc.nasa.gov/information/tools?title=Hydrology%20Data%20Rods%20Time%20Series)** — hydrological time-series generation for streamflow and water storage variables
- **[AppEEARS](https://appeears.earthdatacloud.nasa.gov/)** — geospatial data access and transformation across federal archives, used for extracting time-series over our specific watershed boundaries
- **[Climate Data Online (CDO)](https://www.ncdc.noaa.gov/cdo-web/)** — historical weather and climate station data for the Cascade region

### Space Agency Partner Tools
- **[KNMI Climate Explorer](https://climexp.knmi.nl/)** — scientific analysis and visualization of climate data, used for trend analysis
- **[SWOT Mission](https://swot.jpl.nasa.gov/)** — surface water elevation measurements for rivers, lakes, and reservoirs

### Analysis & Methods
- Statistical significance testing applied to all identified trends, following the methods described in the challenge's recommended resources

### Supplementary Data
- USGS streamflow gauges (Cedar River and Tolt River)
- SNOTEL snowpack stations (Cascade Range)
- Seattle Public Utilities water rate history (for water cost impact analysis)

---

## Tech Stack

> *(Update this section as the stack is confirmed)*

- **Frontend:** TBD
- **Backend / data processing:** TBD
- **APIs:** NASA Earthdata, NASA POWER API
- **Visualization:** TBD

---

## Team

A team of 6 based in Seattle, competing in the NASA Space Apps Challenge 2026.

---

## Challenge

[Earth System Trend Detective](https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective) — NASA Space Apps Challenge 2026

> *Find and examine variables measured by NASA missions, visualize how they change over time, and determine what is changing, where, how much, and whether those changes are statistically significant.*

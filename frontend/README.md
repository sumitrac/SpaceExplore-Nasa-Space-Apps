# Cascade Snow Bank (frontend)

React web app for the 2026 NASA Space Apps Challenge (Seattle), built for
**Be an Earth System Trend Detective**. It shows how Cascade snowpack feeds
the Cedar and Tolt rivers, what has changed, and what that means downstream.

## How people use it

The page is built in three layers, so a visitor can stop at any point:

1. **Glance (10 seconds):** "How is this year doing?" Four cards compare the
   latest water year with a normal year. Each card opens that measure in Explore.
2. **Story (2 minutes):** Five questions answered by scrolling. The chart stays
   pinned and changes with each chapter: less snow, earlier melt, more rain,
   warmer winters, and a river that runs lower in late summer.
3. **Explore (as long as they like):** Pick a measure, season, year range and
   baseline. The Mann-Kendall trend test reruns live and explains the result in
   plain language, with the math one click away. Compare any two years month by
   month, see the numbers as a table, or download them as CSV.

Plus:

- **Watershed switch** (Cedar or Tolt) in the header changes every chart.
- **Linked hover:** pointing at a year highlights it across charts. Charts also
  work with arrow keys when focused.
- **Downstream impact:** what happened after past low-snow winters, a "what if"
  decade slider, how drought shows up on a water bill, and a household
  calculator.
- Light and dark mode, phone layouts, and reduced-motion support.

## Run it

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
cd frontend
npm install
npm run dev
```

Open the link it prints (usually http://localhost:5173).

## Data

The charts read `src/data/watersheds/cedar.json` and `tolt.json`. These start as
**sample data** (the site says so in a banner). To load your NASA results, see
`analysis/README.md` at the repo root; one command rebuilds both files and the
banner disappears automatically.

Facts quoted on the page (Seattle Public Utilities, WA State Climate Office,
University of Washington) live in `src/data/facts.js`, each with its source.

## Project structure

```
src/
├── App.jsx                     page order
├── styles.css                  all styling (colors at the top)
├── state/AppState.jsx          selected watershed, hovered year, Explore links
├── lib/
│   ├── stats.js                Mann-Kendall test, Sen's slope, median
│   ├── series.js               water years, seasons, baselines, formatting
│   └── scale.js                chart scales and axis ticks
├── data/
│   ├── facts.js                quoted facts and sources
│   └── watersheds/*.json       time series (sample or NASA)
└── components/
    ├── Header.jsx              watershed switch, navigation, sample banner
    ├── Hero.jsx, MountainScene.jsx   animated snow-line model
    ├── Glance.jsx, MiniGauge.jsx     this-year cards
    ├── WaterPath.jsx           snow-to-tap steps
    ├── Story.jsx               scrollytelling chapters
    ├── WinterTimeline.jsx      the 2025–26 winter
    ├── Explore.jsx, SignificanceBadge.jsx
    ├── Impact.jsx              low-snow effects, scenario, water bill
    ├── SnowBank.jsx            gallons calculator
    ├── DataSources.jsx         datasets, methods, sources
    └── charts/                 YearChart, StackedYearBars, MonthChart
```

No chart library is used; charts are plain SVG, so everything is easy to tweak.

## Put it online (GitHub Pages)

1. Push the repo (including `.github/workflows/deploy-frontend.yml`).
2. **Settings → Pages → Source: GitHub Actions.**
3. Push to `main`. The site appears at
   `https://<username>.github.io/SpaceExplore-Nasa-Space-Apps/`.

If you rename the repo, update `base` in `vite.config.js`.

## License

MIT, see the LICENSE file at the repo root.

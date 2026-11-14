# Cascade Snow Bank (frontend)

A React web app for the 2026 NASA Space Apps Challenge (Seattle), built for the
**Be an Earth System Trend Detective** challenge. It shows how snow in the
Cascade Mountains becomes Seattle's drinking water through the Cedar River, and
what warmer winters change.

## What's on the page

| Section | What it does |
|---|---|
| Hero | Animated cross-section of the Cedar River Watershed. A "Warm the winter" slider raises the snow line, and rain replaces snow on the lower slopes. |
| From snowflake to tap | Five clickable steps: snow, spring melt, Chester Morse Lake, the Cedar River, your tap. |
| One winter, a flood and a drought | Timeline of the 2025–26 winter (December floods, April drought). |
| The snow bank, in gallons | Slider that turns missing snow water into gallons and "Masonry Dams." |
| The data behind it | NASA datasets used and sources for every fact. |

All numbers live in `src/data/facts.js`, each with its source, so you can update
them once your NASA analysis is done.

## Run it on your computer

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
cd frontend
npm install
npm run dev
```

Open the link it prints (usually http://localhost:5173).

## Project structure

```
frontend/
├── index.html
├── package.json
├── vite.config.js
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── styles.css
    ├── data/
    │   └── facts.js            ← all numbers and sources
    └── components/
        ├── Hero.jsx            ← slider + readouts
        ├── MountainScene.jsx   ← the animated SVG mountain
        ├── WaterPath.jsx       ← snow-to-tap steps
        ├── WinterTimeline.jsx  ← 2025–26 timeline
        ├── SnowBank.jsx        ← gallons calculator
        └── DataSources.jsx     ← datasets + links
```

## Put it online (GitHub Pages)

1. Push this repo to GitHub (the `frontend/` folder and `.github/workflows/`).
2. In the repo, open **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **GitHub Actions**.
4. Push to `main` (or run the workflow from the **Actions** tab).
5. The site appears at `https://<your-username>.github.io/SpaceExplore-Nasa-Space-Apps/`.

If you rename the repo, change the `base` path in `vite.config.js` to match.

## Next steps

- Add your NASA trend results (peak snow per year, rain vs. snow) as a small JSON
  file in `src/data/` and chart them in a new section.
- Replace the illustrative hero model with numbers from your own analysis.

## License

MIT, see the LICENSE file at the root of the repo.

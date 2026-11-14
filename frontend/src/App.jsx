import Hero from "./components/Hero.jsx";
import WaterPath from "./components/WaterPath.jsx";
import WinterTimeline from "./components/WinterTimeline.jsx";
import SnowBank from "./components/SnowBank.jsx";
import Trends from "./components/Trends.jsx";
import DataSources from "./components/DataSources.jsx";

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <a href="#main" className="brand">
          SpaceExplore
        </a>
        <nav aria-label="Sections">
          <a href="#path">Snow to tap</a>
          <a href="#winter">Last winter</a>
          <a href="#snow-bank">Snow bank</a>
          <a href="#trends">Trends</a>
          <a href="#data">Data</a>
        </nav>
      </header>

      <main id="main">
        <Hero />
        <WaterPath />
        <WinterTimeline />
        <SnowBank />
        <Trends />
        <DataSources />
      </main>

      <footer className="site-footer">
        <p>
          Built by team SpaceExplore for the 2026 NASA Space Apps Challenge, Seattle, for the “Be an
          Earth System Trend Detective” challenge. Open source under the MIT License.
        </p>
      </footer>
    </>
  );
}

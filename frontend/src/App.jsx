import { AppStateProvider } from "./state/AppState.jsx";
import Header from "./components/Header.jsx";
import Hero from "./components/Hero.jsx";
import Glance from "./components/Glance.jsx";
import WaterPath from "./components/WaterPath.jsx";
import Story from "./components/Story.jsx";
import Explore from "./components/Explore.jsx";
import Impact from "./components/Impact.jsx";
import SnowBank from "./components/SnowBank.jsx";

export default function App() {
  return (
    <AppStateProvider>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main">
        <Hero />
        <Glance />
        <WaterPath />
        <Story />
        <Explore />
        <Impact />
        <SnowBank />
      </main>
      <footer className="site-footer">
        <p>
          Built by team SpaceExplore for the 2026 NASA Space Apps Challenge in Seattle, for the “Be an
          Earth System Trend Detective” challenge. Open source under the MIT License.
        </p>
      </footer>
    </AppStateProvider>
  );
}

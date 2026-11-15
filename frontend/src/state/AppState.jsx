import { createContext, useCallback, useContext, useMemo, useState } from "react";
import cedar from "../data/watersheds/cedar.json";
import tolt from "../data/watersheds/tolt.json";

export const WATERSHEDS = { cedar, tolt };

const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {
  const [watershedId, setWatershedId] = useState("cedar");
  // The year someone is pointing at. Every year-based chart highlights it.
  const [hoverYear, setHoverYear] = useState(null);
  // Lets other sections open Explore with a variable already chosen.
  const [exploreRequest, setExploreRequest] = useState(null);

  const openInExplore = useCallback((varId, season, extra = {}) => {
    setExploreRequest({ varId, season, ...extra, at: Date.now() });
    const target = extra.compareYear ? "compare" : "explore";
    // Wait a frame so the section has re-rendered before scrolling to it.
    requestAnimationFrame(() =>
      document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  }, []);

  const value = useMemo(
    () => ({
      watershedId,
      setWatershedId,
      data: WATERSHEDS[watershedId],
      hoverYear,
      setHoverYear,
      exploreRequest,
      openInExplore,
    }),
    [watershedId, hoverYear, exploreRequest, openInExplore]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used inside AppStateProvider");
  return ctx;
}

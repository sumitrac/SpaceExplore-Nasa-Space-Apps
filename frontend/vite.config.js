import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// On GitHub Pages the site lives at /<repo-name>/, so assets need that prefix.
// Locally (npm run dev) it runs at the root.
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? "/SpaceExplore-Nasa-Space-Apps/" : "/",
});

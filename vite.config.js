import { defineConfig } from "vite";

export default defineConfig({
  // relative base so the build works from any GitHub Pages path
  // (e.g. https://<user>.github.io/<repo>/) without a rebuild
  base: "./",
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
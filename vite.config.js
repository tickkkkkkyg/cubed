import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  // relative base so the build works from any GitHub Pages path
  // (e.g. https://<user>.github.io/<repo>/) without a rebuild
  base: "./",
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      input: {
        // 3D voxel site
        main: resolve(import.meta.dirname, "index.html"),
        // XyleHosting marketing + legal pages
        hosting: resolve(import.meta.dirname, "hosting/index.html"),
        minecraft: resolve(import.meta.dirname, "hosting/minecraft.html"),
        vps: resolve(import.meta.dirname, "hosting/vps.html"),
        dedicated: resolve(import.meta.dirname, "hosting/dedicated.html"),
        terms: resolve(import.meta.dirname, "hosting/terms.html"),
        privacy: resolve(import.meta.dirname, "hosting/privacy.html"),
      },
    },
  },
});
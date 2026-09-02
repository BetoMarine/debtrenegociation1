import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const pagesBase = process.env.GITHUB_PAGES === "true" ? "/debtrenegociation1/" : "/";

export default defineConfig({
  base: pagesBase,
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png", "apple-touch-icon.png"],
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest,woff2}"],
        navigateFallback: `${pagesBase}index.html`,
        runtimeCaching: [],
      },
    }),
  ],
  test: {
    environment: "node",
  },
});

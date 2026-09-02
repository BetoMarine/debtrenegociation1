import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png", "apple-touch-icon.png"],
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest,woff2}"],
        navigateFallback: "/index.html",
        runtimeCaching: [],
      },
    }),
  ],
  test: {
    environment: "node",
  },
});

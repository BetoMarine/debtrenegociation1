import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  appType: "mpa",
  base: "./",
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, "index.html"),
        sunday: resolve(root, "sunday/index.html"),
        fortune: resolve(root, "fortune/index.html"),
      },
    },
  },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      includeAssets: [
        "icons/icon-192.png",
        "icons/icon-512.png",
        "apple-touch-icon.png",
        "sunday/icons/icon-192.png",
        "sunday/icons/icon-512.png",
        "sunday/apple-touch-icon.png",
        "fortune/icons/icon-192.png",
        "fortune/icons/icon-512.png",
        "fortune/apple-touch-icon.png",
      ],
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest,woff2}"],
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/\/sunday(?:\/|$)/, /\/fortune(?:\/|$)/, /\/pyl(?:\/|$)/],
        runtimeCaching: [],
      },
    }),
  ],
  test: {
    environment: "node",
  },
});

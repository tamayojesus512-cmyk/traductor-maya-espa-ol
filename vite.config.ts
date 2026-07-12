// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        // The guarded wrapper in src/lib/pwa.ts is the only registrar.
        injectRegister: null,
        // Never emit a service worker in dev / Lovable preview.
        devOptions: { enabled: false },
        filename: "sw.js",
        includeAssets: ["favicon.ico", "icons/apple-touch-icon.png"],
        manifest: {
          name: "Traductor Maya · Español ↔ Maya Yucateco",
          short_name: "Traductor Maya",
          description:
            "Traductor español–maya yucateco con diccionario, historial, favoritos y aprendizaje. Funciona sin conexión.",
          lang: "es",
          dir: "ltr",
          start_url: "/",
          scope: "/",
          display: "standalone",
          orientation: "portrait",
          background_color: "#f7f1e0",
          theme_color: "#2f6b3a",
          categories: ["education", "productivity", "reference"],
          icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
            {
              src: "/icons/maskable-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          swDest: "dist/client/sw.js",
          globDirectory: "dist/client",
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],

          // SSR app: no static index.html to fall back to.
          navigateFallback: null,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigationPreload: true,
          runtimeCaching: [
            {
              // HTML navigations: always try the network first, fall back to cache offline.
              urlPattern: ({ request, url }) =>
                request.mode === "navigate" && !url.pathname.startsWith("/~oauth"),
              handler: "NetworkFirst",
              options: {
                cacheName: "html-pages",
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 14 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Same-origin hashed build assets.
              urlPattern: ({ request, sameOrigin }) =>
                sameOrigin && ["script", "style", "worker"].includes(request.destination),
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "static-assets",
                expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: ({ request }) => request.destination === "image",
              handler: "CacheFirst",
              options: {
                cacheName: "images",
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: ({ url }) =>
                url.origin === "https://fonts.googleapis.com" ||
                url.origin === "https://fonts.gstatic.com",
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "google-fonts",
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
  },
});

// Single, guarded service-worker registrar for the offline PWA.
// It must NEVER register in dev, inside an iframe, or in any Lovable preview host,
// and it supports a `?sw=off` kill switch that unregisters the app worker.

const SW_URL = "/sw.js";

function isRefusedContext(): boolean {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;

  // Never run inside an iframe (Lovable editor preview embeds the app).
  if (window.self !== window.top) return true;

  const host = window.location.hostname;
  const refusedHost =
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev");
  if (refusedHost) return true;

  if (new URLSearchParams(window.location.search).has("sw")) {
    // Any `?sw=...` (typically `?sw=off`) forces cleanup.
    if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  }
  return false;
}

async function unregisterAppWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => {
          const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
          return url.endsWith(SW_URL);
        })
        .map((r) => r.unregister()),
    );
  } catch {
    // ignore
  }
}

export function registerPwa() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  if (isRefusedContext()) {
    void unregisterAppWorker();
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register(SW_URL).catch(() => {
      // Registration failures are non-fatal; the app still works online.
    });
  });
}

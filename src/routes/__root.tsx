import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { BottomNav } from "../components/BottomNav";
import { ThemeManager } from "../components/ThemeManager";
import { PwaBanner } from "../components/PwaBanner";
import { rehydrateStores } from "../lib/stores";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Traductor Maya · Español ↔ Maya Yucateco" },
      {
        name: "description",
        content:
          "Traductor español–maya yucateco con diccionario de miles de palabras, historial, favoritos y modo de aprendizaje. Conservemos nuestra lengua.",
      },
      { name: "author", content: "Traductor Maya" },
      { property: "og:title", content: "Traductor Maya · Español ↔ Maya Yucateco" },
      {
        property: "og:description",
        content:
          "Traductor español–maya yucateco con diccionario de miles de palabras, historial, favoritos y modo de aprendizaje. Conservemos nuestra lengua.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#2f6b3a" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "Traductor Maya" },
      { name: "twitter:title", content: "Traductor Maya · Español ↔ Maya Yucateco" },
      { name: "twitter:description", content: "Traductor español–maya yucateco con diccionario de miles de palabras, historial, favoritos y modo de aprendizaje. Conservemos nuestra lengua." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f8695274-d933-4e7a-8a39-41f1df43484e/id-preview-0f847453--d9a4f077-921a-45d3-9ea5-9245da35a930.lovable.app-1783630368683.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f8695274-d933-4e7a-8a39-41f1df43484e/id-preview-0f847453--d9a4f077-921a-45d3-9ea5-9245da35a930.lovable.app-1783630368683.png" },
    ],

    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Nunito+Sans:ital,opsz,wght@0,6..12,400;0,6..12,600;0,6..12,700;0,6..12,800;1,6..12,400&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
    ],

  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    void rehydrateStores();
    void import("../lib/pwa").then((m) => m.registerPwa());
  }, []);



  return (
    <QueryClientProvider client={queryClient}>
      <ThemeManager />
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
        <PwaBanner />
        <div className="flex-1 pb-24">
          {/* Required: nested routes render here. */}
          <Outlet />
        </div>
        <BottomNav />
      </div>
      <Toaster position="top-center" richColors closeButton />
    </QueryClientProvider>
  );
}


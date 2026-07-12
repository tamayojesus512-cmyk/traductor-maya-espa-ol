import { createFileRoute } from "@tanstack/react-router";
import { Star, Trash2, ArrowRight, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { useData } from "../lib/stores";
import { PageHeader } from "../components/PageHeader";

export const Route = createFileRoute("/favoritos")({
  component: FavoritosPage,
});

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text.replace(/[[\]]/g, ""));
  u.lang = "es-MX";
  u.rate = 0.92;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

function FavoritosPage() {
  const favorites = useData((s) => s.favorites);
  const removeFavorite = useData((s) => s.removeFavorite);
  const clearFavorites = useData((s) => s.clearFavorites);

  return (
    <main>
      <PageHeader
        title="Favoritos"
        subtitle={`${favorites.length} favorito(s)`}
        action={
          favorites.length > 0 ? (
            <button
              onClick={() => {
                clearFavorites();
                toast.success("Favoritos borrados");
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" /> Limpiar
            </button>
          ) : undefined
        }
      />

      <div className="space-y-3 px-5">
        {favorites.length === 0 && (
          <div className="mt-16 flex flex-col items-center text-center text-muted-foreground">
            <Star className="h-10 w-10 opacity-40" />
            <p className="mt-3 text-sm">No tienes favoritos todavía.</p>
            <p className="text-xs">Marca una traducción con la estrella para guardarla.</p>
          </div>
        )}
        {favorites.map((f) => (
          <div key={f.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary">
                {f.direction === "es-maya" ? "ES → Maya" : "Maya → ES"}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => speak(f.to)}
                  aria-label="Escuchar"
                  className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-primary"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => removeFavorite(f.id)}
                  aria-label="Quitar favorito"
                  className="rounded-full p-1.5 text-accent transition-colors hover:text-destructive"
                >
                  <Star className="h-4 w-4 fill-accent" />
                </button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{f.from}</p>
            <p className="mt-0.5 flex items-start gap-1.5 text-base font-semibold text-foreground">
              <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" />
              {f.to}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { History, Trash2, ArrowRight, Star } from "lucide-react";
import { toast } from "sonner";
import { useData } from "../lib/stores";
import { PageHeader } from "../components/PageHeader";

export const Route = createFileRoute("/historial")({
  component: HistorialPage,
});

function dirLabel(d: string) {
  return d === "es-maya" ? "ES → Maya" : "Maya → ES";
}

function HistorialPage() {
  const history = useData((s) => s.history);
  const remove = useData((s) => s.remove);
  const clearHistory = useData((s) => s.clearHistory);
  const toggleFavorite = useData((s) => s.toggleFavorite);
  const favorites = useData((s) => s.favorites);

  return (
    <main>
      <PageHeader
        title="Historial"
        subtitle={`${history.length} traducción(es) guardada(s)`}
        action={
          history.length > 0 ? (
            <button
              onClick={() => {
                clearHistory();
                toast.success("Historial borrado");
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5" /> Limpiar
            </button>
          ) : undefined
        }
      />

      <div className="space-y-3 px-5">
        {history.length === 0 && (
          <div className="mt-16 flex flex-col items-center text-center text-muted-foreground">
            <History className="h-10 w-10 opacity-40" />
            <p className="mt-3 text-sm">Aún no tienes traducciones.</p>
            <p className="text-xs">Tus traducciones aparecerán aquí.</p>
          </div>
        )}
        {history.map((h) => {
          const fav = favorites.find(
            (f) => f.from === h.from && f.direction === h.direction,
          );
          return (
            <div key={h.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary">
                  {dirLabel(h.direction)}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      toggleFavorite({ from: h.from, to: h.to, direction: h.direction })
                    }
                    aria-label="Favorito"
                    className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-accent"
                  >
                    <Star className={`h-4 w-4 ${fav ? "fill-accent text-accent" : ""}`} />
                  </button>
                  <button
                    onClick={() => remove(h.id)}
                    aria-label="Eliminar"
                    className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{h.from}</p>
              <p className="mt-0.5 flex items-start gap-1.5 text-base font-semibold text-foreground">
                <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" />
                {h.to}
              </p>
            </div>
          );
        })}
      </div>
    </main>
  );
}

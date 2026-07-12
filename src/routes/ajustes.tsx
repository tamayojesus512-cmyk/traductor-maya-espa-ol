import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { Sun, Moon, Leaf, Upload, Trash2, Type } from "lucide-react";
import { toast } from "sonner";
import { useData, useSettings, type FontSize, type Theme } from "../lib/stores";
import { activeCount, parseImport, type Direction } from "../lib/translator";
import { PageHeader } from "../components/PageHeader";

export const Route = createFileRoute("/ajustes")({
  component: AjustesPage,
});

const themes: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "green", label: "Verde", icon: Leaf },
];

const fontSizes: { value: FontSize; label: string; size: string }[] = [
  { value: "sm", label: "Pequeño", size: "text-sm" },
  { value: "md", label: "Normal", size: "text-base" },
  { value: "lg", label: "Grande", size: "text-lg" },
];

const directions: { value: Direction; label: string }[] = [
  { value: "es-maya", label: "Español → Maya" },
  { value: "maya-es", label: "Maya → Español" },
];

function AjustesPage() {
  const {
    theme,
    fontSize,
    defaultDirection,
    customEntries,
    setTheme,
    setFontSize,
    setDefaultDirection,
    addCustomEntries,
  } = useSettings();
  const clearHistory = useData((s) => s.clearHistory);
  const clearFavorites = useData((s) => s.clearFavorites);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const entries = parseImport(text);
      if (!entries.length) {
        toast.error("No se encontraron pares válidos en el archivo");
        return;
      }
      addCustomEntries(entries);
      toast.success(`${entries.length} término(s) añadidos al diccionario`);
    } catch {
      toast.error("No se pudo leer el archivo");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <main>
      <PageHeader title="Ajustes" subtitle="Personaliza" />

      <div className="space-y-6 px-5">
        {/* Theme */}
        <section>
          <h2 className="mb-2 text-sm font-bold text-foreground">Tema</h2>
          <div className="grid grid-cols-3 gap-2">
            {themes.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border py-3 text-xs font-semibold transition-colors ${
                  theme === value
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Font size */}
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-foreground">
            <Type className="h-4 w-4" /> Tamaño de letra
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {fontSizes.map(({ value, label, size }) => (
              <button
                key={value}
                onClick={() => setFontSize(value)}
                className={`flex flex-col items-center gap-1 rounded-2xl border py-3 font-semibold transition-colors ${
                  fontSize === value
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                <span className={size}>Aa</span>
                <span className="text-xs">{label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Default direction */}
        <section>
          <h2 className="mb-2 text-sm font-bold text-foreground">Idioma inicial</h2>
          <div className="grid grid-cols-2 gap-2">
            {directions.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setDefaultDirection(value)}
                className={`rounded-2xl border py-3 text-sm font-semibold transition-colors ${
                  defaultDirection === value
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Import dictionary */}
        <section>
          <h2 className="mb-2 text-sm font-bold text-foreground">Importar diccionario</h2>
          <p className="mb-2 text-xs text-muted-foreground">
            Acepta archivos JSON (array de pares o objetos con <code>es</code> y{" "}
            <code>maya</code>) o CSV/TSV (español, maya).
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".json,.csv,.tsv,.txt,text/plain,application/json"
            onChange={onFile}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            <Upload className="h-4 w-4" /> Elegir archivo
          </button>
          {customEntries.length > 0 && (
            <p className="mt-2 text-xs text-primary">
              {customEntries.length} término(s) personalizados activos.
            </p>
          )}
        </section>

        {/* Data */}
        <section>
          <h2 className="mb-2 text-sm font-bold text-foreground">Datos</h2>
          <div className="space-y-2">
            <button
              onClick={() => {
                clearHistory();
                toast.success("Historial borrado");
              }}
              className="flex w-full items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" /> Borrar historial
            </button>
            <button
              onClick={() => {
                clearFavorites();
                toast.success("Favoritos borrados");
              }}
              className="flex w-full items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" /> Borrar favoritos
            </button>
          </div>
        </section>

        {/* About */}
        <section className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="text-sm font-bold text-foreground">Acerca de</p>
          <p className="mt-1 text-xs text-muted-foreground">Traductor Maya · v1.0.0</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Diccionario local con {activeCount()} términos activos.
          </p>
          <p className="mt-2 text-xs italic text-primary">
            Conservemos nuestra lengua, honremos nuestras raíces.
          </p>
        </section>
      </div>
    </main>
  );
}

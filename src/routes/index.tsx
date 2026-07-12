import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftRight,
  Copy,
  Check,
  Star,
  Volume2,
  Sparkles,
  Wand2,
  X,
  Loader2,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import {
  correctPhrase,
  detectDirection,
  suggest,
  translate,
  translateWord,
  norm,
  type Correction,
  type Direction,
  type TranslateResult,
} from "../lib/translator";
import { useData, useSettings } from "../lib/stores";
import { aiTranslate } from "../lib/ai-translate.functions";
import { aiOcr } from "../lib/ai-ocr.functions";
import { Greca } from "../components/Greca";

export const Route = createFileRoute("/")({
  component: TranslatorPage,
});

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    toast.error("Tu navegador no soporta lectura en voz alta");
    return;
  }
  const clean = text.replace(/[[\]]/g, "");
  const utter = new SpeechSynthesisUtterance(clean);
  utter.lang = "es-MX";
  utter.rate = 0.92;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

function TranslatorPage() {
  const defaultDirection = useSettings((s) => s.defaultDirection);
  const add = useData((s) => s.add);
  const toggleFavorite = useData((s) => s.toggleFavorite);
  const favorites = useData((s) => s.favorites);

  const [direction, setDirection] = useState<Direction>(defaultDirection);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<TranslateResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoDetect, setAutoDetect] = useState(true);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiUsed, setAiUsed] = useState(false);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const runAiTranslate = useServerFn(aiTranslate);
  const runAiOcr = useServerFn(aiOcr);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  // Apply the persisted "Idioma inicial" once the store rehydrates on the
  // client, unless the user has already chosen a direction this session.
  const dirTouched = useRef(false);
  useEffect(() => {
    if (!dirTouched.current) setDirection(defaultDirection);
  }, [defaultDirection]);

  const meta = useMemo(
    () =>
      direction === "es-maya"
        ? { from: "Español", to: "Maya", placeholder: "Escribe en español…" }
        : { from: "Maya", to: "Español", placeholder: "Ts'íib maaya t'aan…" },
    [direction],
  );

  const wordSuggestions = useMemo(() => {
    if (input.trim().length === 0) return [];
    const last = input.split(/\s+/).slice(-1)[0];
    return suggest(last, direction, 6);
  }, [input, direction]);

  const isFav = !!(
    result?.translation &&
    favorites.find((f) => f.from === input.trim() && f.direction === direction)
  );

  const handleTranslate = async (value = input, forceDetect = false) => {
    const text = value.trim();
    if (!text) {
      setResult(null);
      setCorrections([]);
      setAiSuggestions([]);
      setAiUsed(false);
      return;
    }
    setLoading(true);
    setCopied(false);
    setAiSuggestions([]);
    setAiUsed(false);
    try {
      let dir = direction;
      if (autoDetect || forceDetect) {
        const detected = detectDirection(text);
        if (detected !== dir) {
          dir = detected;
          dirTouched.current = true;
          setDirection(detected);
        }
      }
      const fixed = correctPhrase(text, dir);
      setCorrections(fixed.corrections);
      const corrected = fixed.corrected;
      const local = translate(corrected, dir);
      setResult(local);

      const words = corrected.split(/\s+/).filter(Boolean);
      if (aiEnabled && (words.length >= 3 || local.unknownCount > 0 || fixed.corrections.length > 0)) {
        const glossary: { from: string; to: string }[] = [];
        const unknown: string[] = [];
        const seen = new Set<string>();
        for (const w of words) {
          const key = norm(w).replace(/[.,;:!?¡¿()"“”]/g, "");
          if (!key || seen.has(key)) continue;
          seen.add(key);
          const t = translateWord(key, dir);
          if (t) glossary.push({ from: key, to: t });
          else unknown.push(key);
        }
        try {
          const ai = await runAiTranslate({
            data: { text: corrected, direction: dir, glossary, unknown },
          });
          if (ai.translation) {
            setResult({
              translation: ai.translation,
              unknownCount: 0,
              totalWords: local.totalWords,
            });
            setAiUsed(true);
          }
          if (ai.suggestions?.length) setAiSuggestions(ai.suggestions);
          add({ from: text, to: ai.translation || local.translation, direction: dir });
          return;
        } catch (e) {
          console.warn("AI translate failed, using local result", e);
        }
      }
      add({ from: text, to: local.translation, direction: dir });
    } finally {
      setLoading(false);
    }
  };

  const swap = () => {
    const next = direction === "es-maya" ? "maya-es" : "es-maya";
    dirTouched.current = true;
    setDirection(next);
    setAutoDetect(false);
    if (result?.translation) {
      setInput(result.translation.replace(/[[\]]/g, ""));
    } else {
      setInput("");
    }
    setResult(null);
    setCorrections([]);
    setAiSuggestions([]);
    setAiUsed(false);
  };

  const clear = () => {
    setInput("");
    setResult(null);
    setCorrections([]);
    setAiSuggestions([]);
    setAiUsed(false);
    inputRef.current?.focus();
  };

  const copy = async () => {
    if (!result?.translation) return;
    try {
      await navigator.clipboard.writeText(result.translation.replace(/[[\]]/g, ""));
      setCopied(true);
      toast.success("Copiado al portapapeles");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const pickSuggestion = (s: string) => {
    const parts = input.split(/\s+/);
    parts[parts.length - 1] = s;
    setInput(parts.join(" ") + " ");
    setShowSuggest(false);
    inputRef.current?.focus();
  };

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona una imagen válida");
      return;
    }
    setOcrLoading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const { text } = await runAiOcr({ data: { image: dataUrl } });
      const clean = text.trim();
      if (!clean) {
        toast.error("No se detectó texto en la imagen");
        return;
      }
      setInput(clean);
      setShowSuggest(false);
      const detected = detectDirection(clean);
      toast.success(
        detected === "es-maya"
          ? "Texto en español detectado → traduciendo a maya"
          : "Texto en maya detectado → traduciendo a español",
      );
      await handleTranslate(clean, true);
    } catch (err) {
      console.error("OCR failed", err);
      toast.error("No se pudo leer la imagen");
    } finally {
      setOcrLoading(false);
    }
  };



  return (
    <main className="relative">
      <Greca />
      <header className="px-5 pt-8 pb-5 text-center">
        <h1 className="font-display text-3xl font-bold text-primary">Traductor Maya</h1>
        <p className="mt-1.5 text-sm italic text-muted-foreground">
          Conservemos nuestra lengua, honremos nuestras raíces
        </p>
      </header>

      <div className="space-y-4 px-5">
        {/* Direction bar */}
        <div className="flex items-center justify-center gap-3">
          <span className="min-w-[84px] rounded-full bg-primary-soft px-4 py-1.5 text-center text-sm font-bold text-primary">
            {meta.from}
          </span>
          <button
            onClick={swap}
            aria-label="Intercambiar idiomas"
            className="rounded-full border border-border bg-card p-2 text-primary shadow-sm transition-transform active:scale-90"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>
          <span className="min-w-[84px] rounded-full bg-primary-soft px-4 py-1.5 text-center text-sm font-bold text-primary">
            {meta.to}
          </span>
        </div>

        {/* Options row */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          <button
            onClick={() => setAutoDetect((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-semibold transition-colors ${
              autoDetect
                ? "border-primary/40 bg-primary-soft text-primary"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            <Wand2 className="h-3.5 w-3.5" />
            {autoDetect ? "Detección automática activa" : "Detección automática"}
          </button>
          <button
            onClick={() => setAiEnabled((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-semibold transition-colors ${
              aiEnabled
                ? "border-accent/50 bg-accent/15 text-accent-foreground"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            {aiEnabled ? "IA activada" : "IA desactivada"}
          </button>
        </div>

        {/* Input card */}
        <div className="relative rounded-2xl border border-border bg-card p-4 shadow-sm">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setShowSuggest(true);
            }}
            onFocus={() => setShowSuggest(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                setShowSuggest(false);
                handleTranslate();
              }
            }}
            placeholder={meta.placeholder}
            rows={3}
            className="w-full resize-none bg-transparent text-lg text-foreground outline-none placeholder:text-muted-foreground"
          />
          {input && (
            <button
              onClick={clear}
              aria-label="Borrar"
              className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {showSuggest && wordSuggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border pt-2">
              {wordSuggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => pickSuggestion(s)}
                  className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground transition-colors hover:bg-primary-soft"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => handleTranslate()}
          disabled={loading || !input.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-base font-bold text-primary-foreground shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
          {loading ? "Traduciendo…" : "Traducir"}
        </button>

        {/* Camera / image OCR */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImage}
          className="hidden"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleImage}
          className="hidden"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={ocrLoading || loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-primary-soft py-3 text-sm font-bold text-primary shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {ocrLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Camera className="h-5 w-5" />
            )}
            {ocrLoading ? "Leyendo imagen…" : "Tomar foto"}
          </button>
          <button
            onClick={() => galleryInputRef.current?.click()}
            disabled={ocrLoading || loading}
            aria-label="Elegir imagen de la galería"
            className="rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
          >
            Galería
          </button>
        </div>



        {/* Corrections */}
        {corrections.length > 0 && (
          <div className="rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-foreground">
            <span className="font-semibold">¿Quisiste decir? </span>
            {corrections.map((c, i) => (
              <span key={i}>
                {i > 0 && ", "}
                <span className="line-through opacity-60">{c.from}</span> →{" "}
                <span className="font-semibold text-primary">{c.to}</span>
              </span>
            ))}
          </div>
        )}

        {/* Result card */}
        {result && (
          <div className="rounded-2xl border border-primary/25 bg-primary-soft/60 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-primary">
                {meta.to}
              </span>
              {aiUsed && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">
                  <Sparkles className="h-3 w-3 text-accent" /> Mejorado con IA
                </span>
              )}
            </div>
            <p className="text-xl font-semibold leading-snug text-foreground">
              {result.translation || "—"}
            </p>
            {result.unknownCount > 0 && !aiUsed && (
              <p className="mt-2 text-xs text-muted-foreground">
                {result.unknownCount} palabra(s) sin traducción. Las palabras entre
                corchetes [ ] no están en el diccionario.
              </p>
            )}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={copy}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copiado" : "Copiar"}
              </button>
              <button
                onClick={() => speak(result.translation)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                <Volume2 className="h-3.5 w-3.5" /> Escuchar
              </button>
              <button
                onClick={() => {
                  toggleFavorite({
                    from: input.trim(),
                    to: result.translation,
                    direction,
                  });
                  toast.success(isFav ? "Quitado de favoritos" : "Guardado en favoritos");
                }}
                className={`ml-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isFav
                    ? "border-accent bg-accent/20 text-accent-foreground"
                    : "border-border bg-card text-foreground hover:bg-secondary"
                }`}
              >
                <Star className={`h-3.5 w-3.5 ${isFav ? "fill-accent text-accent" : ""}`} />
                {isFav ? "Guardado" : "Favorito"}
              </button>
            </div>
          </div>
        )}

        {/* AI suggestions */}
        {aiSuggestions.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-primary">
              <Sparkles className="h-3.5 w-3.5 text-accent" /> Notas y alternativas
            </p>
            <ul className="space-y-1.5">
              {aiSuggestions.map((s, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  • {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}

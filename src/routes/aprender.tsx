import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { GraduationCap, RotateCcw, Volume2, Check, X } from "lucide-react";
import { randomEntry, type Direction, type Entry } from "../lib/translator";
import { Greca } from "../components/Greca";

export const Route = createFileRoute("/aprender")({
  component: AprenderPage,
});

const TOTAL = 10;

interface Question {
  prompt: string;
  answer: string;
  options: string[];
  direction: Direction;
}

function firstSense(term: string) {
  return term.split(/[,;/(]/)[0].trim();
}

function buildQuestion(): Question {
  const direction: Direction = Math.random() < 0.5 ? "es-maya" : "maya-es";
  const entry = randomEntry();
  const prompt = direction === "es-maya" ? entry.es : firstSense(entry.maya);
  const answer = direction === "es-maya" ? firstSense(entry.maya) : entry.es;
  const options = new Set<string>([answer]);
  let guard = 0;
  while (options.size < 4 && guard < 40) {
    guard++;
    const d: Entry = randomEntry();
    const opt = direction === "es-maya" ? firstSense(d.maya) : d.es;
    if (opt && opt !== answer) options.add(opt);
  }
  return {
    prompt,
    answer,
    direction,
    options: shuffle(Array.from(options)),
  };
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "es-MX";
  u.rate = 0.9;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

function AprenderPage() {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [finished, setFinished] = useState(false);

  const start = useCallback(() => {
    setIndex(0);
    setScore(0);
    setSelected(null);
    setChecked(false);
    setFinished(false);
    setQuestion(buildQuestion());
  }, []);

  useEffect(() => {
    start();
  }, [start]);

  const check = () => {
    if (!selected || !question) return;
    setChecked(true);
    if (selected === question.answer) setScore((s) => s + 1);
  };

  const next = () => {
    if (index + 1 >= TOTAL) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setChecked(false);
    setQuestion(buildQuestion());
  };

  return (
    <main className="relative">
      <header className="relative px-5 pt-8 pb-4 text-center">
        <Greca />
        <h1 className="font-display text-2xl font-bold text-primary">Aprender</h1>
        <p className="mt-1 text-sm text-muted-foreground">Modo Práctica</p>
      </header>

      <div className="px-5">
        {finished ? (
          <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center">
            <GraduationCap className="mx-auto h-12 w-12 text-primary" />
            <p className="mt-3 font-display text-xl font-bold text-foreground">
              ¡Práctica completada!
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Acertaste {score} de {TOTAL} preguntas
            </p>
            <div className="mx-auto mt-4 h-2 w-40 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(score / TOTAL) * 100}%` }}
              />
            </div>
            <button
              onClick={start}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-transform active:scale-95"
            >
              <RotateCcw className="h-4 w-4" /> Practicar de nuevo
            </button>
          </div>
        ) : question ? (
          <>
            <div className="mb-4 flex items-center justify-between text-sm font-semibold">
              <span className="text-muted-foreground">
                Pregunta {index + 1} / {TOTAL}
              </span>
              <span className="rounded-full bg-primary-soft px-3 py-1 text-primary">
                {score}
              </span>
            </div>

            <div className="rounded-2xl border border-primary/25 bg-primary-soft/50 p-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {question.direction === "es-maya"
                  ? "¿Cómo se dice en maya?"
                  : "¿Qué significa en español?"}
              </p>
              <div className="mt-2 flex items-center justify-center gap-2">
                <p className="font-display text-2xl font-bold text-foreground">
                  {question.prompt}
                </p>
                <button
                  onClick={() => speak(question.prompt)}
                  aria-label="Escuchar"
                  className="rounded-full p-1.5 text-primary transition-colors hover:bg-card"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {question.options.map((opt) => {
                const isAnswer = opt === question.answer;
                const isSelected = opt === selected;
                let cls =
                  "border-border bg-card text-foreground hover:border-primary/40";
                if (checked) {
                  if (isAnswer) cls = "border-primary bg-primary-soft text-primary";
                  else if (isSelected)
                    cls = "border-destructive bg-destructive/10 text-destructive";
                  else cls = "border-border bg-card text-muted-foreground opacity-70";
                } else if (isSelected) {
                  cls = "border-primary bg-primary-soft text-primary";
                }
                return (
                  <button
                    key={opt}
                    disabled={checked}
                    onClick={() => setSelected(opt)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-base font-medium transition-colors ${cls}`}
                  >
                    {opt}
                    {checked && isAnswer && <Check className="h-4 w-4" />}
                    {checked && isSelected && !isAnswer && <X className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>

            <button
              onClick={checked ? next : check}
              disabled={!selected}
              className="mt-5 w-full rounded-2xl bg-primary py-3.5 text-base font-bold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              {checked ? (index + 1 >= TOTAL ? "Ver resultado" : "Siguiente") : "Comprobar"}
            </button>
          </>
        ) : null}
      </div>
    </main>
  );
}

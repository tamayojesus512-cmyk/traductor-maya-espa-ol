import { RAW_DICTIONARY } from "./dictionary";

export type Direction = "es-maya" | "maya-es";
export interface Entry {
  es: string;
  maya: string;
}
export interface TranslateResult {
  translation: string;
  unknownCount: number;
  totalWords: number;
}
export interface Correction {
  from: string;
  to: string;
}

const BASE: Entry[] = RAW_DICTIONARY.map(([es, maya]) => ({ es, maya }));

/** Normalize: lowercase, strip diacritics + apostrophes, collapse whitespace. */
export function norm(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’´`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** First sense of a term (before a comma, semicolon, slash or parenthesis). */
function firstSense(term: string): string {
  return term.split(/[,;/(]/)[0].trim();
}

interface DictIndex {
  entries: Entry[];
  esIndex: Map<string, string>;
  mayaIndex: Map<string, string>;
  esKeys: string[];
  mayaKeys: string[];
}

function buildIndex(entries: Entry[]): DictIndex {
  const esIndex = new Map<string, string>();
  const mayaIndex = new Map<string, string>();
  for (const entry of entries) {
    const key = norm(entry.es);
    if (key && !esIndex.has(key)) esIndex.set(key, entry.maya);
    // Also index each Spanish sense (split on , ; / and parentheticals).
    for (const sub of entry.es.split(/[,;/]/)) {
      const ek = norm(firstSense(sub));
      if (ek && !esIndex.has(ek)) esIndex.set(ek, entry.maya);
    }
    for (const sub of entry.maya.split(/[,;]/)) {
      const mk = norm(firstSense(sub));
      if (mk && !mayaIndex.has(mk)) mayaIndex.set(mk, entry.es);
    }
  }
  return {
    entries,
    esIndex,
    mayaIndex,
    esKeys: Array.from(esIndex.keys()),
    mayaKeys: Array.from(mayaIndex.keys()),
  };
}

let activeEntries: Entry[] = BASE.slice();
let index: DictIndex = buildIndex(activeEntries);

/** Rebuild the index merging custom entries (dedupe by es→maya key). */
export function applyCustomEntries(custom: Entry[]) {
  const map = new Map<string, Entry>();
  for (const e of BASE) map.set(norm(e.es) + "→" + norm(e.maya), e);
  for (const e of custom) {
    if (!e.es || !e.maya) continue;
    map.set(norm(e.es) + "→" + norm(e.maya), e);
  }
  activeEntries = Array.from(map.values());
  index = buildIndex(activeEntries);
}

export function activeCount(): number {
  return activeEntries.length;
}

function lookupOne(word: string, dir: Direction): string | null {
  const key = norm(word);
  if (!key) return null;
  const res = (dir === "es-maya" ? index.esIndex : index.mayaIndex).get(key);
  if (!res) return null;
  return dir === "es-maya" ? firstSense(res) : res;
}

/** Direct word translation, exposed for glossary building. */
export function translateWord(word: string, dir: Direction): string | null {
  return lookupOne(word, dir);
}

export function translate(input: string, dir: Direction): TranslateResult {
  const text = input.trim();
  if (!text) return { translation: "", unknownCount: 0, totalWords: 0 };
  const whole = lookupOne(text, dir);
  if (whole) return { translation: whole, unknownCount: 0, totalWords: 1 };
  const tokens = text.split(/(\s+|[.,;:!?¡¿()"“”])/u);
  let unknown = 0;
  let total = 0;
  const translation = tokens
    .map((tok) => {
      if (!tok || /^\s+$/.test(tok) || /^[.,;:!?¡¿()"“”]$/.test(tok)) return tok;
      total++;
      const t = lookupOne(tok, dir);
      if (t) return t;
      unknown++;
      return `[${tok}]`;
    })
    .join("");
  return { translation, unknownCount: unknown, totalWords: total };
}

export function suggest(input: string, dir: Direction, max = 6): string[] {
  const key = norm(input);
  if (key.length < 1) return [];
  const keys = dir === "es-maya" ? index.esKeys : index.mayaKeys;
  const out: string[] = [];
  for (const k of keys) {
    if (k.startsWith(key)) {
      out.push(k);
      if (out.length >= max) break;
    }
  }
  return out;
}

export function detectDirection(input: string): Direction {
  const words = norm(input)
    .split(/\s+/)
    .filter((w) => w.length > 1);
  if (!words.length) return "es-maya";
  let es = 0;
  let maya = 0;
  for (const w of words) {
    if (index.esIndex.has(w)) es++;
    if (index.mayaIndex.has(w)) maya++;
  }
  if (/[’'`]|k'|ts'|ch'|ts|\bx[aeiou]|áa|éé|íi|óo|úu/i.test(input)) maya += 1;
  if (
    /\b(el|la|los|las|un|una|de|que|y|en|no|si|yo|tu|tú|es|soy|con|para|por|pero|como|mi|su)\b/i.test(
      input,
    )
  )
    es += 1;
  return maya > es ? "maya-es" : "es-maya";
}

function levenshtein(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const row = new Array(b.length + 1);
  for (let i = 0; i <= b.length; i++) row[i] = i;
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    let best = row[0];
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, row[j], row[j - 1]);
      prev = tmp;
      if (row[j] < best) best = row[j];
    }
    if (best > max) return max + 1;
  }
  return row[b.length];
}

function correctWord(word: string, dir: Direction): string | null {
  const key = norm(word);
  const idx = dir === "es-maya" ? index.esIndex : index.mayaIndex;
  if (key.length < 4 || idx.has(key)) return null;
  const keys = dir === "es-maya" ? index.esKeys : index.mayaKeys;
  const maxDist = key.length <= 5 ? 1 : 2;
  let best: string | null = null;
  let bestDist = maxDist + 1;
  for (const k of keys) {
    if (Math.abs(k.length - key.length) > maxDist || k[0] !== key[0]) continue;
    const d = levenshtein(key, k, maxDist);
    if (d < bestDist) {
      bestDist = d;
      best = k;
      if (d === 1) break;
    }
  }
  return best;
}

export function correctPhrase(
  input: string,
  dir: Direction,
): { corrected: string; corrections: Correction[] } {
  const tokens = input.split(/(\s+|[.,;:!?¡¿()"“”])/u);
  const corrections: Correction[] = [];
  const corrected = tokens
    .map((tok) => {
      if (!tok || /^\s+$/.test(tok) || /^[.,;:!?¡¿()"“”]$/.test(tok)) return tok;
      const fix = correctWord(tok, dir);
      if (fix && norm(fix) !== norm(tok)) {
        corrections.push({ from: tok, to: fix });
        return fix;
      }
      return tok;
    })
    .join("");
  return { corrected, corrections };
}

export function randomEntry(): Entry {
  const filtered = activeEntries.filter(
    (e) => e.es.length <= 24 && !/[.:]/.test(e.maya) && e.maya.length <= 40,
  );
  const pool = filtered.length ? filtered : activeEntries;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Parse an imported dictionary (JSON array/objects, or CSV/TSV lines). */
export function parseImport(raw: string): Entry[] {
  const text = raw.trim();
  if (!text) return [];
  if (text.startsWith("[") || text.startsWith("{")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        const out: Entry[] = [];
        for (const item of parsed) {
          if (Array.isArray(item) && item.length >= 2) {
            out.push({ es: String(item[0]).trim(), maya: String(item[1]).trim() });
          } else if (item && typeof item === "object") {
            const o = item as Record<string, unknown>;
            const es = String(o.es ?? o.spanish ?? o["español"] ?? "").trim();
            const maya = String(o.maya ?? o.mayan ?? "").trim();
            if (es && maya) out.push({ es, maya });
          }
        }
        return out;
      }
    } catch {
      /* fall through to line parsing */
    }
  }
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#"));
  const out: Entry[] = [];
  for (const line of lines) {
    const m = line.match(/^\s*([^,;\t|:]+?)\s*[,;\t|:]\s*(.+?)\s*$/);
    if (m) out.push({ es: m[1].trim().toLowerCase(), maya: m[2].trim() });
  }
  if (out.length && /^(es|spanish|español)$/i.test(out[0].es)) out.shift();
  return out;
}

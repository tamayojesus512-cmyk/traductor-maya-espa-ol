import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { applyCustomEntries, type Direction, type Entry } from "./translator";

export type Theme = "light" | "dark" | "green";
export type FontSize = "sm" | "md" | "lg";

interface SettingsState {
  theme: Theme;
  fontSize: FontSize;
  defaultDirection: Direction;
  customEntries: Entry[];
  setTheme: (t: Theme) => void;
  setFontSize: (f: FontSize) => void;
  setDefaultDirection: (d: Direction) => void;
  addCustomEntries: (entries: Entry[]) => void;
  clearCustomEntries: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: "light",
      fontSize: "md",
      defaultDirection: "es-maya",
      customEntries: [],
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setDefaultDirection: (defaultDirection) => set({ defaultDirection }),
      addCustomEntries: (entries) => {
        const merged = [...get().customEntries, ...entries];
        applyCustomEntries(merged);
        set({ customEntries: merged });
      },
      clearCustomEntries: () => {
        applyCustomEntries([]);
        set({ customEntries: [] });
      },
    }),
    {
      name: "traductor-maya-settings",
      storage: createJSONStorage(() => localStorage),
      // Defer reading localStorage until after mount so the first client render
      // matches the SSR HTML (avoids React hydration mismatches).
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        if (state?.customEntries?.length) applyCustomEntries(state.customEntries);
      },
    },
  ),
);

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export interface TranslationRecord {
  id: string;
  from: string;
  to: string;
  direction: Direction;
  ts?: number;
}

interface DataState {
  history: TranslationRecord[];
  favorites: TranslationRecord[];
  add: (r: Omit<TranslationRecord, "id" | "ts">) => void;
  remove: (id: string) => void;
  removeFavorite: (id: string) => void;
  toggleFavorite: (r: Omit<TranslationRecord, "id" | "ts">) => void;
  isFavorite: (id: string) => boolean;
  clearHistory: () => void;
  clearFavorites: () => void;
}

export const useData = create<DataState>()(
  persist(
    (set, get) => ({
      history: [],
      favorites: [],
      add: (r) =>
        set({
          history: [
            { ...r, id: genId(), ts: Date.now() },
            ...get().history.filter(
              (h) => !(h.from === r.from && h.direction === r.direction),
            ),
          ].slice(0, 500),
        }),
      remove: (id) => set({ history: get().history.filter((h) => h.id !== id) }),
      removeFavorite: (id) =>
        set({ favorites: get().favorites.filter((f) => f.id !== id) }),
      toggleFavorite: (r) => {
        const favs = get().favorites;
        const existing = favs.find(
          (f) => f.from === r.from && f.direction === r.direction,
        );
        set(
          existing
            ? { favorites: favs.filter((f) => f.id !== existing.id) }
            : { favorites: [{ ...r, id: genId() }, ...favs] },
        );
      },
      isFavorite: (id) => !!get().favorites.find((f) => f.id === id),
      clearHistory: () => set({ history: [] }),
      clearFavorites: () => set({ favorites: [] }),
    }),
    {
      name: "traductor-maya-data",
      storage: createJSONStorage(() => localStorage),
      // Same reason as useSettings: avoid SSR/CSR hydration mismatches.
      skipHydration: true,
    },
  ),
);

/** Rehydrate persisted stores on the client after mount (skipHydration is on). */
export function rehydrateStores() {
  void useSettings.persist.rehydrate();
  void useData.persist.rehydrate();
}

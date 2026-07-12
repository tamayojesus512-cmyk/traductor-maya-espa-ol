import { useEffect } from "react";
import { useSettings } from "../lib/stores";

/** Applies the persisted theme and font-size to the document root. */
export function ThemeManager() {
  const theme = useSettings((s) => s.theme);
  const fontSize = useSettings((s) => s.fontSize);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "theme-green");
    if (theme === "dark") root.classList.add("dark");
    else if (theme === "green") root.classList.add("theme-green");
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-font", fontSize);
  }, [fontSize]);

  return null;
}

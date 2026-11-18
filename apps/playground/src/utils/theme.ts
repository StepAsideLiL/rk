import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark";

const QUERY = "(prefers-color-scheme: dark)";

/** Applies the theme by toggling the `dark` class on `<html>`. */
function apply(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/**
 * Starts on the system theme and keeps following it. Once the user toggles
 * with `d`, the theme is controlled manually between light and dark.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    window.matchMedia(QUERY).matches ? "dark" : "light",
  );
  const [followsSystem, setFollowsSystem] = useState(true);

  useEffect(() => {
    apply(theme);
  }, [theme]);

  useEffect(() => {
    if (!followsSystem) return;
    const media = window.matchMedia(QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      setTheme(event.matches ? "dark" : "light");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [followsSystem]);

  const toggle = useCallback(() => {
    setFollowsSystem(false);
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      if (event.key.toLowerCase() === "d") toggle();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle]);

  return { theme, followsSystem, toggle };
}

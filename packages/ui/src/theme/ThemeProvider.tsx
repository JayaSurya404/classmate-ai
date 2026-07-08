import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Theme = "dark" | "light" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "dark" | "light";
  setTheme(theme: Theme): void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: Theme | undefined;
  onChange?: ((theme: Theme) => void) | undefined;
  storageKey?: string | undefined;
}

export function ThemeProvider({
  children,
  initialTheme = "dark",
  onChange,
  storageKey,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (storageKey) {
      const stored = localStorage.getItem(storageKey);
      if (stored === "dark" || stored === "light" || stored === "system") return stored;
    }
    return initialTheme;
  });
  const [isSystemDark, setIsSystemDark] = useState(true);
  const resolvedTheme = theme === "system" ? (isSystemDark ? "dark" : "light") : theme;

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const update = (): void => {
      setIsSystemDark(query.matches);
    };
    update();
    query.addEventListener("change", update);
    return () => {
      query.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light", resolvedTheme === "light");
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme: (next: Theme): void => {
        setThemeState(next);
        if (storageKey) localStorage.setItem(storageKey, next);
        onChange?.(next);
      },
    }),
    [onChange, resolvedTheme, storageKey, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider");
  return value;
}

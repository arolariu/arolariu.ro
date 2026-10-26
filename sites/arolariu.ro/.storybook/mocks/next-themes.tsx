import {createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren, type ReactNode} from "react";

const DEFAULT_THEMES = ["light", "dark", "system"] as const;

type ThemeContextValue = Readonly<{
  theme: string;
  resolvedTheme: string;
  systemTheme: "light";
  themes: ReadonlyArray<string>;
  setTheme: (theme: string) => void;
}>;

const DEFAULT_THEME_CONTEXT: ThemeContextValue = {
  theme: "light",
  resolvedTheme: "light",
  systemTheme: "light",
  themes: DEFAULT_THEMES,
  setTheme: () => undefined,
};

const ThemeContext = createContext<ThemeContextValue>(DEFAULT_THEME_CONTEXT);

type ThemeProviderProps = PropsWithChildren<
  Readonly<{
    attribute?: string;
    defaultTheme?: string;
    enableSystem?: boolean;
    forcedTheme?: string;
    themes?: ReadonlyArray<string>;
  }>
>;

/**
 * Storybook-safe next-themes provider without document bootstrap scripts.
 */
export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "light",
  enableSystem = true,
  forcedTheme,
  themes = DEFAULT_THEMES,
}: ThemeProviderProps): ReactNode {
  const [selectedTheme, setSelectedTheme] = useState(forcedTheme ?? defaultTheme);
  const theme = forcedTheme ?? selectedTheme;
  const resolvedTheme = theme === "system" ? (enableSystem ? "light" : defaultTheme) : theme;

  useEffect(() => {
    const root = globalThis.document.documentElement;

    if (attribute === "class") {
      const themeClasses = themes.filter((candidate) => candidate !== "system");
      const previousThemeClasses = themeClasses.filter((candidate) => root.classList.contains(candidate));
      root.classList.remove(...themeClasses);
      root.classList.add(resolvedTheme);

      return () => {
        root.classList.remove(...themeClasses);
        root.classList.add(...previousThemeClasses);
      };
    }

    const previousValue = root.getAttribute(attribute);
    root.setAttribute(attribute, resolvedTheme);

    return () => {
      if (previousValue === null) {
        root.removeAttribute(attribute);
      } else {
        root.setAttribute(attribute, previousValue);
      }
    };
  }, [attribute, resolvedTheme, themes]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      systemTheme: "light",
      themes,
      setTheme: forcedTheme ? () => undefined : setSelectedTheme,
    }),
    [forcedTheme, resolvedTheme, theme, themes],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Returns the deterministic theme state used by Storybook stories.
 */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

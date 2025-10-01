import {browser} from "$app/environment";

export type Theme = "light" | "dark";

class ThemeState {
  private __theme__ = $state<Theme>("dark");

  constructor() {
    // Initialize theme from localStorage if in browser
    if (browser) {
      const stored = localStorage.getItem("theme") as Theme;
      this.__theme__ = stored ?? "dark";
      this.applyTheme(this.__theme__);
    }
  }

  get current(): Theme {
    return this.__theme__;
  }

  set(value: Theme) {
    this.__theme__ = value;
    if (browser) {
      localStorage.setItem("theme", value);
      this.applyTheme(value);
    }
  }

  toggle() {
    const updatedTheme = this.__theme__ === "dark" ? "light" : "dark";
    this.set(updatedTheme);
  }

  // eslint-disable-next-line class-methods-use-this -- utility method
  private applyTheme(theme: Theme) {
    if (!browser) return;

    const html = document.documentElement;

    // Remove existing theme classes
    html.classList.remove("dark", "light");

    // Add new theme class
    html.classList.add(theme);

    // Also set data-theme attribute for CSS variable theming
    // eslint-disable-next-line unicorn/prefer-dom-node-dataset -- old browsers support
    html.setAttribute("data-theme", theme);
  }
}

// Export singleton instance
const themeState = new ThemeState();

/**
 * Reusable hook for theme management using Svelte 5 runes
 * Provides reactive theme state without manual subscriptions
 */
export function useTheme() {
  return {
    get current(): Theme {
      return themeState.current;
    },
    get currentTheme(): Theme {
      return themeState.current;
    },
    toggle: () => themeState.toggle(),
    set: (value: Theme) => themeState.set(value),
  };
}

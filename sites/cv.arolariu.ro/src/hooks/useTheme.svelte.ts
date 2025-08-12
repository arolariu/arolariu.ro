import { browser } from '$app/environment';

export type Theme = 'light' | 'dark';

class ThemeState {
	private _theme = $state<Theme>('dark');

	constructor() {
		// Initialize theme from localStorage if in browser
		if (browser) {
			const stored = localStorage.getItem('theme') as Theme;
			this._theme = stored ?? 'dark';
			this.applyTheme(this._theme);
		}
	}

	get current(): Theme {
		return this._theme;
	}

	set(value: Theme) {
		this._theme = value;
		if (browser) {
			localStorage.setItem('theme', value);
			this.applyTheme(value);
		}
	}

	toggle() {
		const newTheme = this._theme === 'dark' ? 'light' : 'dark';
		this.set(newTheme);
	}

	private applyTheme(theme: Theme) {
		if (!browser) return;

		const html = document.documentElement;

		// Remove existing theme classes
		html.classList.remove('dark', 'light');

		// Add new theme class
		html.classList.add(theme);
		html.setAttribute('data-theme', theme);
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
		set: (value: Theme) => themeState.set(value)
	};
}

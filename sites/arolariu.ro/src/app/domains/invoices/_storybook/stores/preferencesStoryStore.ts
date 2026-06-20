/**
 * @fileoverview Seed/reset helpers for the preferences Zustand store in Storybook.
 * @module app/domains/invoices/_storybook/stores/preferencesStoryStore
 *
 * @remarks
 * Mirrors {@link ./invoiceStoryStores} for `usePreferencesStore`, letting Profile
 * settings stories mount the real component with deterministic preference state.
 */

import {DEFAULT_PREFERENCES, usePreferencesStore, type PreferencesPersistedState} from "@/stores/preferencesStore";

/** Options for seeding the preferences store (all optional; defaults applied). */
export type SeedPreferencesStoreOptions = Partial<PreferencesPersistedState>;

/**
 * Resets the preferences store to documented defaults and marks it hydrated.
 */
export function resetPreferencesStore(): void {
	usePreferencesStore.getState().resetToDefaults();
	usePreferencesStore.getState().setHasHydrated(true);
}

/**
 * Seeds the preferences store with the given overrides on top of DEFAULT_PREFERENCES.
 *
 * @param options - Partial preference overrides.
 */
export function seedPreferencesStore(options: SeedPreferencesStoreOptions = {}): void {
	const next: PreferencesPersistedState = {...DEFAULT_PREFERENCES, ...options};
	const store = usePreferencesStore.getState();
	store.setPrimaryColor(next.primaryColor);
	store.setSecondaryColor(next.secondaryColor);
	store.setTertiaryColor(next.tertiaryColor);
	store.setTheme(next.theme);
	store.setFontType(next.fontType);
	store.setLocale(next.locale);
	store.setCompactMode(next.compactMode);
	store.setAnimationsEnabled(next.animationsEnabled);
	store.setThemePreset(next.themePreset);
	store.setCustomThemeColors(next.customThemeColors);
	store.setHasHydrated(true);
}

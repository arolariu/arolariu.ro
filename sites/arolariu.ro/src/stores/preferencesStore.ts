/**
 * @fileoverview Zustand store for managing user preferences with IndexedDB persistence.
 * Stores theme, gradient colors, font, and locale preferences.
 * @module stores/preferencesStore
 */

import {create} from "zustand";
import {devtools, persist} from "zustand/middleware";
import {createSharedStorage} from "./storage/indexedDBStorage";

/**
 * Gradient theme configuration for the application.
 */
export interface GradientTheme {
  /** Primary gradient start color (hex, e.g., "#06b6d4") */
  from: string;
  /** Optional middle gradient color (hex) */
  via?: string;
  /** Primary gradient end color (hex) */
  to: string;
}

/**
 * User preferences persisted state interface.
 * These fields are persisted to IndexedDB.
 */
export interface PreferencesPersistedState {
  /** Primary gradient color (hex, e.g., "#06b6d4") */
  primaryColor: string;
  /** Secondary gradient color (hex, e.g., "#ec4899") */
  secondaryColor: string;
  /** Optional tertiary gradient color for via (hex) */
  tertiaryColor: string | undefined;
  /** Theme mode preference */
  theme: "light" | "dark" | "system";
  /** Font type preference */
  fontType: "normal" | "dyslexic";
  /** Locale/language preference */
  locale: "en" | "ro" | "fr";
  /** Compact UI mode */
  compactMode: boolean;
  /** Whether animations are enabled */
  animationsEnabled: boolean;
}

/**
 * Full preferences state including hydration status.
 */
interface PreferencesState extends PreferencesPersistedState {
  /** Indicates whether the store has been hydrated from IndexedDB */
  hasHydrated: boolean;
}

/**
 * Preferences store actions interface.
 */
interface PreferencesActions {
  /**
   * Sets the primary gradient color.
   * @param color Hex color code (e.g., "#06b6d4")
   */
  setPrimaryColor: (color: string) => void;

  /**
   * Sets the secondary gradient color.
   * @param color Hex color code
   */
  setSecondaryColor: (color: string) => void;

  /**
   * Sets the tertiary (via) gradient color.
   * @param color Hex color code or undefined to clear
   */
  setTertiaryColor: (color: string | undefined) => void;

  /**
   * Sets the theme mode.
   * @param theme Theme preference
   */
  setTheme: (theme: "light" | "dark" | "system") => void;

  /**
   * Sets the font type.
   * @param fontType Font preference
   */
  setFontType: (fontType: "normal" | "dyslexic") => void;

  /**
   * Sets the locale/language.
   * @param locale Language code
   */
  setLocale: (locale: "en" | "ro" | "fr") => void;

  /**
   * Sets compact mode.
   * @param enabled Whether compact mode is enabled
   */
  setCompactMode: (enabled: boolean) => void;

  /**
   * Sets animations enabled state.
   * @param enabled Whether animations are enabled
   */
  setAnimationsEnabled: (enabled: boolean) => void;

  /**
   * Sets the hydration status.
   * @param hasHydrated Whether the store has been hydrated
   */
  setHasHydrated: (hasHydrated: boolean) => void;

  /**
   * Resets all preferences to defaults.
   */
  resetToDefaults: () => void;

  /**
   * Gets the current gradient theme configuration.
   * @returns GradientTheme object with from, via, and to colors
   */
  getGradientTheme: () => GradientTheme;
}

/**
 * Combined store type
 */
type PreferencesStore = PreferencesState & PreferencesActions;

/**
 * Default preference values matching the CSS variable defaults in globals.css.
 * - cyan-500: #06b6d4
 * - purple-500: #8b5cf6
 * - pink-500: #ec4899
 */
export const DEFAULT_PREFERENCES: PreferencesPersistedState = {
  primaryColor: "#06b6d4", // cyan-500
  secondaryColor: "#ec4899", // pink-500
  tertiaryColor: "#8b5cf6", // purple-500 (via)
  theme: "system",
  fontType: "normal",
  locale: "en",
  compactMode: false,
  animationsEnabled: true,
};

/**
 * Shared storage adapter for key-value persistence.
 * Uses "account-preferences" as the storage key in the shared IndexedDB table.
 */
const sharedStorage = createSharedStorage<PreferencesPersistedState>();

/**
 * Rehydration callback that sets the hydration status.
 */
function handleRehydration(state: PreferencesStore | undefined) {
  state?.setHasHydrated(true);
}

/**
 * Persist middleware configuration.
 */
const persistConfig = {
  name: "account-preferences",
  storage: sharedStorage,
  partialize: (state: PreferencesStore): PreferencesPersistedState => ({
    primaryColor: state.primaryColor,
    secondaryColor: state.secondaryColor,
    tertiaryColor: state.tertiaryColor,
    theme: state.theme,
    fontType: state.fontType,
    locale: state.locale,
    compactMode: state.compactMode,
    animationsEnabled: state.animationsEnabled,
  }),
  onRehydrateStorage: () => handleRehydration,
} as const;

/**
 * Creates the initial state and actions.
 */
const createPreferencesSlice = (
  set: (partial: Partial<PreferencesStore> | ((state: PreferencesStore) => Partial<PreferencesStore>)) => void,
  get: () => PreferencesStore,
): PreferencesStore => ({
  // State (with defaults)
  ...DEFAULT_PREFERENCES,
  hasHydrated: false,

  // Actions
  setPrimaryColor: (color) => set({primaryColor: color}),
  setSecondaryColor: (color) => set({secondaryColor: color}),
  setTertiaryColor: (color) => set({tertiaryColor: color}),
  setTheme: (theme) => set({theme}),
  setFontType: (fontType) => set({fontType}),
  setLocale: (locale) => set({locale}),
  setCompactMode: (enabled) => set({compactMode: enabled}),
  setAnimationsEnabled: (enabled) => set({animationsEnabled: enabled}),
  setHasHydrated: (hasHydrated) => set({hasHydrated}),
  resetToDefaults: () => set(DEFAULT_PREFERENCES),

  getGradientTheme: () => {
    const state = get();
    return {
      from: state.primaryColor,
      via: state.tertiaryColor,
      to: state.secondaryColor,
    };
  },
});

/**
 * Development store with DevTools integration.
 */
const createDevStore = () =>
  create<PreferencesStore>()(
    devtools(
      persist((set, get) => createPreferencesSlice(set, get), persistConfig),
      {
        name: "PreferencesStore",
        enabled: true,
      },
    ),
  );

/**
 * Production store without DevTools for better performance.
 */
const createProdStore = () => create<PreferencesStore>()(persist((set, get) => createPreferencesSlice(set, get), persistConfig));

/**
 * Preferences store with conditional DevTools support based on environment.
 * Uses shared key-value IndexedDB persistence for user preferences.
 *
 * @remarks
 * Persists user preferences including gradient colors, theme, font, and locale.
 * Automatically rehydrates from IndexedDB on application load.
 *
 * @example
 * ```tsx
 * function ThemeSettings() {
 *   const { primaryColor, setPrimaryColor, getGradientTheme } = usePreferencesStore();
 *
 *   return (
 *     <div>
 *       <p>Current primary: {primaryColor}</p>
 *       <button onClick={() => setPrimaryColor("#ef4444")}>Set Red</button>
 *     </div>
 *   );
 * }
 * ```
 */
export const usePreferencesStore = process.env.NODE_ENV === "development" ? createDevStore() : createProdStore();

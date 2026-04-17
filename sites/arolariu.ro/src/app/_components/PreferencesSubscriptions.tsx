"use client";

import {useRouter} from "next/navigation";
import {useEffect} from "react";
import {
  THEME_CSS_PROPS,
  toPersistedPreferencesState,
  usePreferencesStore,
  type PreferencesPersistedState,
} from "@/stores/preferencesStore";

/**
 * Client-side subscriber that owns the browser-only effects previously registered
 * at module load in `preferencesStore.ts`. Mounted once in `providers.tsx`.
 *
 * @remarks
 * Four subscriptions, each with its own `useEffect`:
 * 1. **Cross-tab sync** via `BroadcastChannel("zustand-preferences-sync")` — sends
 *    partialized state on change, applies incoming state directly to avoid the
 *    IndexedDB-read race.
 * 2. **Visibility rehydrate** — on `visibilitychange → visible`, re-reads from
 *    IndexedDB to catch any updates missed by the BroadcastChannel.
 * 3. **Locale → cookie sync** — on locale change, writes the HTTP cookie via the
 *    existing `setCookie` server action so `next-intl` server-side can pick it up,
 *    then calls `router.refresh()` to trigger a re-render with the new locale.
 * 4. **Theme preset → DOM sync** — on `themePreset` / `customThemeColors` change,
 *    updates `document.documentElement.dataset.themePreset` and the CSS variables
 *    listed in `THEME_CSS_PROPS`.
 *
 * Returns `null` — it is a behavior-only component.
 */
export default function PreferencesSubscriptions(): React.JSX.Element | null {
  const router = useRouter();

  // 1. Cross-tab sync via BroadcastChannel.
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel("zustand-preferences-sync");
    let isSyncing = false;

    const onMessage = (event: MessageEvent<PreferencesPersistedState>): void => {
      isSyncing = true;
      usePreferencesStore.setState(event.data);
      setTimeout(() => {
        isSyncing = false;
      }, 100);
    };
    channel.addEventListener("message", onMessage);

    const unsubscribe = usePreferencesStore.subscribe((state) => {
      if (isSyncing || !state.hasHydrated) return;
      // eslint-disable-next-line unicorn/require-post-message-target-origin -- BroadcastChannel has no targetOrigin parameter.
      channel.postMessage(toPersistedPreferencesState(state));
    });

    return () => {
      channel.removeEventListener("message", onMessage);
      channel.close();
      unsubscribe();
    };
  }, []);

  // 2. Visibility-driven rehydrate.
  useEffect(() => {
    const onVisibilityChange = (): void => {
      if (document.visibilityState === "visible") {
        void usePreferencesStore.persist.rehydrate();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  // 3. Locale → cookie sync (dynamic import keeps server-only code off the client graph until needed).
  //    After setting the cookie, router.refresh() triggers a server re-render so next-intl
  //    picks up the new locale value from the cookie.
  useEffect(() => {
    // Seed prevLocale from the current store state if it's already hydrated — otherwise
    // the first locale change after mount would be swallowed by the null-init branch.
    const initialState = usePreferencesStore.getState();
    let prevLocale: string | null = initialState.hasHydrated ? initialState.locale : null;

    const unsubscribe = usePreferencesStore.subscribe((state) => {
      if (!state.hasHydrated) return;
      if (prevLocale === null) {
        prevLocale = state.locale;
        return;
      }
      if (state.locale !== prevLocale) {
        prevLocale = state.locale;
        void import("@/lib/actions/cookies")
          .then(({setCookie}) => setCookie("locale", state.locale))
          .then(() => router.refresh())
          .catch((error: unknown) => {
            console.error("[PreferencesSubscriptions] locale sync failed", error);
          });
      }
    });

    return unsubscribe;
  }, [router]);

  // 4. Theme preset → DOM sync.
  useEffect(() => {
    const applyState = (state: ReturnType<typeof usePreferencesStore.getState>): void => {
      if (!state.hasHydrated) return;
      const root = document.documentElement;
      root.dataset["themePreset"] = state.themePreset;
      if (state.themePreset === "custom" && state.customThemeColors) {
        const c = state.customThemeColors;
        root.style.setProperty("--gradient-from", c.gradientFrom);
        root.style.setProperty("--gradient-via", c.gradientVia);
        root.style.setProperty("--gradient-to", c.gradientTo);
        root.style.setProperty("--primary", c.primary);
        root.style.setProperty("--primary-foreground", c.primaryForeground);
        root.style.setProperty("--accent-primary", c.gradientFrom);
        root.style.setProperty("--footer-bg", c.footerBg);
      } else {
        for (const prop of THEME_CSS_PROPS) root.style.removeProperty(prop);
      }
    };

    applyState(usePreferencesStore.getState());
    const unsubscribe = usePreferencesStore.subscribe(applyState);
    return unsubscribe;
  }, []);

  return null;
}

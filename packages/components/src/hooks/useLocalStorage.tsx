"use client";

import * as React from "react";

/**
 * Persists state to localStorage with SSR safety and JSON serialization.
 *
 * @remarks
 * This hook synchronizes state with localStorage, allowing data to persist
 * across page refreshes and browser sessions. It is SSR-safe and returns the
 * initial value on the server until hydration completes. The hook also syncs
 * state across tabs/windows via the `storage` event.
 *
 * Error handling:
 * - On initial load, a JSON parse failure falls back to `initialValue`.
 * - On a cross-tab `storage` event with malformed JSON, the event is ignored
 *   and the current local state is preserved (to avoid wiping user state on a
 *   bad cross-tab message).
 * - `localStorage` write failures (quota exceeded, private-mode restrictions)
 *   are swallowed silently — the in-memory state update still succeeds.
 *
 * @typeParam T - The type of the value being stored.
 * @param key - The localStorage key to store the value under.
 * @param initialValue - The default value to use if no value is found in localStorage.
 * @returns A tuple containing the current value and a setter function.
 *
 * @example
 * ```tsx
 * function UserSettings() {
 *   const [theme, setTheme] = useLocalStorage("theme", "light");
 *
 *   return (
 *     <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
 *       Toggle theme (current: {theme})
 *     </button>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * function ShoppingCart() {
 *   const [cart, setCart] = useLocalStorage<Product[]>("cart", []);
 *
 *   return (
 *     <button onClick={() => setCart((prev) => [...prev, newProduct])}>
 *       Add to cart ({cart.length} items)
 *     </button>
 *   );
 * }
 * ```
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = React.useState<T>(() => {
    // SSR safety: return initial value on server
    if (globalThis.window === undefined) {
      return initialValue;
    }

    try {
      const item = globalThis.window.localStorage.getItem(key);

      return item === null ? initialValue : (JSON.parse(item) as T);
    } catch {
      return initialValue;
    }
  });

  const setValue = React.useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        setStoredValue((currentValue) => {
          const valueToStore = typeof value === "function" ? (value as (prev: T) => T)(currentValue) : value;

          if (globalThis.window !== undefined) {
            globalThis.window.localStorage.setItem(key, JSON.stringify(valueToStore));
          }

          return valueToStore;
        });
      } catch {
        // localStorage writes can throw (quota exceeded, private mode, etc.). Fail silently.
      }
    },
    [key],
  );

  React.useEffect(() => {
    // SSR safety: window is not available on server
    if (globalThis.window === undefined) {
      return;
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== key || event.storageArea !== globalThis.window.localStorage) {
        return;
      }

      try {
        const newValue = event.newValue === null ? initialValue : (JSON.parse(event.newValue) as T);

        setStoredValue(newValue);
      } catch {
        // Parse failures on cross-tab storage events fall through silently.
      }
    };

    globalThis.window.addEventListener("storage", handleStorageChange);

    return () => {
      globalThis.window.removeEventListener("storage", handleStorageChange);
    };
  }, [key, initialValue]);

  return [storedValue, setValue];
}

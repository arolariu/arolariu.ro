import "@testing-library/jest-dom/vitest";
import {cleanup} from "@testing-library/react";
import {afterEach} from "vitest";

/** The subset of the Web Storage API the mock implements. */
type StorageMock = Pick<Storage, "length" | "clear" | "getItem" | "key" | "removeItem" | "setItem">;

/**
 * Creates an in-memory implementation of the Web Storage API.
 *
 * @remarks
 * happy-dom does not supply `localStorage` / `sessionStorage`, so anything
 * touching them throws `Cannot read properties of undefined`.
 *
 * These are installed at MODULE scope rather than inside a `beforeEach` hook:
 * Vitest runs setup files before it imports the test file, whereas `beforeEach`
 * only fires afterwards. A module reading storage during evaluation would
 * otherwise fail the whole file at collection time.
 *
 * `localStorage` and `sessionStorage` are deliberately separate instances so
 * that code comparing `StorageEvent.storageArea` against `window.localStorage`
 * can still tell them apart (see useLocalStorage).
 *
 * @returns A fresh Storage-compatible object backed by a plain record.
 */
function createStorageMock(): StorageMock {
  let store: Record<string, string> = {};

  return {
    get length(): number {
      return Object.keys(store).length;
    },
    clear(): void {
      store = {};
    },
    getItem(key: string): string | null {
      return store[key] ?? null;
    },
    key(index: number): string | null {
      return Object.keys(store)[index] ?? null;
    },
    removeItem(key: string): void {
      delete store[key];
    },
    setItem(key: string, value: string): void {
      store[key] = String(value);
    },
  };
}

for (const area of ["localStorage", "sessionStorage"] as const) {
  Object.defineProperty(globalThis, area, {
    value: createStorageMock(),
    writable: true,
    configurable: true,
  });
}

// Automatically cleanup after each test
afterEach(() => {
  cleanup();
  globalThis.localStorage.clear();
  globalThis.sessionStorage.clear();
});

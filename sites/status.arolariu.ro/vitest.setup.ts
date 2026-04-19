import "@testing-library/jest-dom/vitest";
import {cleanup} from "@testing-library/svelte";
import {afterEach, beforeEach, vi} from "vitest";

vi.mock("$app/environment", () => ({
  browser: true,
  building: false,
  dev: true,
  version: "test",
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  const store: Record<string, string> = {};
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = String(v); },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { for (const k of Object.keys(store)) delete store[k]; },
      get length() { return Object.keys(store).length; },
      key: (i: number) => Object.keys(store)[i] ?? null,
    },
    writable: true,
    configurable: true,
  });

  Object.defineProperty(globalThis, "performance", {
    value: {
      ...globalThis.performance,
      getEntriesByType: vi.fn(() => []),
    },
    writable: true,
    configurable: true,
  });
});

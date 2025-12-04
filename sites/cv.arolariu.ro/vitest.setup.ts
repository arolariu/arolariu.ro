/**
 * Vitest setup file for cv.arolariu.ro (Svelte 5 + SvelteKit)
 * Provides test environment configuration and global mocks
 */

import "@testing-library/jest-dom/vitest";
import {cleanup} from "@testing-library/svelte";
import {afterEach, beforeEach, vi} from "vitest";

// Mock SvelteKit modules that are not available in test environment
vi.mock("$app/environment", () => ({
  browser: true,
  building: false,
  dev: true,
  version: "test",
}));

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock browser APIs
beforeEach(() => {
  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};

    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
      get length() {
        return Object.keys(store).length;
      },
      key: (index: number) => {
        const keys = Object.keys(store);
        return keys[index] || null;
      },
    };
  })();

  Object.defineProperty(globalThis, "localStorage", {
    value: localStorageMock,
    writable: true,
  });

  // Mock IntersectionObserver
  const IntersectionObserverMock = vi.fn(() => ({
    disconnect: vi.fn(),
    observe: vi.fn(),
    takeRecords: vi.fn(),
    unobserve: vi.fn(),
    root: null,
    rootMargin: "",
    thresholds: [],
  }));

  vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);

  // Mock navigator.clipboard
  const clipboardMock = {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(""),
  };

  Object.defineProperty(globalThis.navigator, "clipboard", {
    value: clipboardMock,
    writable: true,
    configurable: true,
  });

  // Mock document.execCommand for clipboard fallback
  document.execCommand = vi.fn().mockReturnValue(true);

  // Mock URL.createObjectURL and URL.revokeObjectURL
  globalThis.URL.createObjectURL = vi.fn(() => "blob:mock-url");
  globalThis.URL.revokeObjectURL = vi.fn();

  // Suppress expected console errors in tests
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    const message = String(args[0]);
    // Suppress jsdom navigation warnings from download tests
    if (message.includes("Not implemented: navigation")) {
      return;
    }
    // Suppress expected clipboard API error messages from copy.ts tests
    if (message.includes("Error when trying to use modern navigation clipboard API")) {
      return;
    }
    originalConsoleError(...args);
  };

  // Mock window.matchMedia for theme detection
  Object.defineProperty(globalThis, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

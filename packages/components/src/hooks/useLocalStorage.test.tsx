import {act, renderHook} from "@testing-library/react";
import {renderToString} from "react-dom/server";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {useLocalStorage} from "./useLocalStorage";

describe("useLocalStorage", () => {
  beforeEach(() => {
    globalThis.window.localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns initial value when localStorage is empty", () => {
    const {result} = renderHook(() => useLocalStorage("test-key", "default-value"));

    expect(result.current[0]).toBe("default-value");
  });

  it("sets value in localStorage and updates state", () => {
    const {result} = renderHook(() => useLocalStorage("test-key", "initial"));

    act(() => {
      result.current[1]("updated");
    });

    expect(result.current[0]).toBe("updated");
    expect(globalThis.window.localStorage.getItem("test-key")).toBe(JSON.stringify("updated"));
  });

  it("persists value across hook re-renders", () => {
    const {result: firstResult} = renderHook(() => useLocalStorage("persist-key", "first"));

    act(() => {
      firstResult.current[1]("persisted");
    });

    const {result: secondResult} = renderHook(() => useLocalStorage("persist-key", "second"));

    expect(secondResult.current[0]).toBe("persisted");
  });

  it("handles invalid JSON gracefully and falls back to initial value", () => {
    globalThis.window.localStorage.setItem("invalid-json", "{invalid-json");

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const {result} = renderHook(() => useLocalStorage("invalid-json", "fallback"));

    expect(result.current[0]).toBe("fallback");
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("returns initial value during SSR", () => {
    function TestComponent(): React.JSX.Element {
      const [value] = useLocalStorage("ssr-key", "ssr-default");

      return <span>{value}</span>;
    }

    const originalWindow = globalThis.window;

    vi.stubGlobal("window", undefined);

    const markup = renderToString(<TestComponent />);

    expect(markup).toContain("ssr-default");

    vi.stubGlobal("window", originalWindow);
  });

  it("syncs state across tabs via storage event", () => {
    const {result} = renderHook(() => useLocalStorage("sync-key", "initial"));

    expect(result.current[0]).toBe("initial");

    act(() => {
      const storageEvent = new StorageEvent("storage", {
        key: "sync-key",
        newValue: JSON.stringify("synced-value"),
        storageArea: globalThis.window.localStorage,
      });

      globalThis.window.dispatchEvent(storageEvent);
    });

    expect(result.current[0]).toBe("synced-value");
  });

  it("ignores storage events for different keys", () => {
    const {result} = renderHook(() => useLocalStorage("my-key", "initial"));

    act(() => {
      const storageEvent = new StorageEvent("storage", {
        key: "other-key",
        newValue: JSON.stringify("other-value"),
        storageArea: globalThis.window.localStorage,
      });

      globalThis.window.dispatchEvent(storageEvent);
    });

    expect(result.current[0]).toBe("initial");
  });

  it("ignores storage events from sessionStorage", () => {
    const {result} = renderHook(() => useLocalStorage("my-key", "initial"));

    act(() => {
      const storageEvent = new StorageEvent("storage", {
        key: "my-key",
        newValue: JSON.stringify("session-value"),
        storageArea: globalThis.window.sessionStorage,
      });

      globalThis.window.dispatchEvent(storageEvent);
    });

    expect(result.current[0]).toBe("initial");
  });

  it("supports functional updates", () => {
    const {result} = renderHook(() => useLocalStorage("counter", 0));

    act(() => {
      result.current[1]((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(1);

    act(() => {
      result.current[1]((prev) => prev + 5);
    });

    expect(result.current[0]).toBe(6);
  });

  it("works with complex object types", () => {
    interface User {
      id: number;
      name: string;
      preferences: {theme: string; language: string};
    }

    const initialUser: User = {
      id: 1,
      name: "John",
      preferences: {theme: "light", language: "en"},
    };

    const {result} = renderHook(() => useLocalStorage<User>("user", initialUser));

    expect(result.current[0]).toEqual(initialUser);

    const updatedUser: User = {
      ...initialUser,
      name: "Jane",
      preferences: {theme: "dark", language: "fr"},
    };

    act(() => {
      result.current[1](updatedUser);
    });

    expect(result.current[0]).toEqual(updatedUser);
    expect(JSON.parse(globalThis.window.localStorage.getItem("user") ?? "")).toEqual(updatedUser);
  });

  it("cleans up storage event listener on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(globalThis.window, "removeEventListener");
    const {unmount} = renderHook(() => useLocalStorage("cleanup-key", "value"));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("storage", expect.any(Function));
  });
});

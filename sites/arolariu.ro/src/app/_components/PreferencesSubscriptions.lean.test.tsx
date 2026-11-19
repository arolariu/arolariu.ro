// @vitest-environment happy-dom

import "fake-indexeddb/auto";
import {THEME_CSS_PROPS, toPersistedPreferencesState, usePreferencesStore, type PreferencesPersistedState} from "@/stores/preferencesStore";
import {createSharedStorage} from "@/stores/storage/indexedDBStorage";
import {act, cleanup, fireEvent, render, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import PreferencesSubscriptions from "./PreferencesSubscriptions";

const next = vi.hoisted(() => ({cookies: vi.fn(), set: vi.fn(), router: {refresh: vi.fn()}}));
vi.mock("next/headers", () => ({cookies: next.cookies}));
vi.mock("next/navigation", () => ({useRouter: () => next.router}));

const preferences = usePreferencesStore;
const storage = createSharedStorage<PreferencesPersistedState>();
const storageKey = "account-preferences";

describe("PreferencesSubscriptions", () => {
  beforeEach(async () => {
    await preferences.persist.rehydrate();
    preferences.setState({...preferences.getInitialState(), hasHydrated: true});
    next.cookies.mockResolvedValue({set: next.set});
  });

  afterEach(async () => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    await storage.removeItem(storageKey);
    Reflect.deleteProperty(document.documentElement.dataset, "themePreset");
    for (const property of THEME_CSS_PROPS) document.documentElement.style.removeProperty(property);
  });

  it("uses the first hydrated locale as a baseline and writes only a later change before refreshing", async () => {
    preferences.setState({hasHydrated: false});
    render(<PreferencesSubscriptions />);

    await act(async () => {
      preferences.setState({locale: "ro"});
      preferences.setState({locale: "fr", hasHydrated: true});
    });

    expect(next.cookies).not.toHaveBeenCalled();
    expect(next.router.refresh).not.toHaveBeenCalled();

    await act(async () => preferences.getState().setLocale("ro"));

    await waitFor(() => expect(next.router.refresh).toHaveBeenCalledOnce());
    expect(next.set).toHaveBeenCalledExactlyOnceWith("locale", "ro", {path: "/"});
    expect(next.set).toHaveBeenCalledBefore(next.router.refresh);

    await act(async () => preferences.getState().setLocale("ro"));

    expect(next.set).toHaveBeenCalledOnce();
    expect(next.router.refresh).toHaveBeenCalledOnce();
  });

  it.each([true, false])("writes the first hydrated locale change with BroadcastChannel available: %s", async (hasChannel) => {
    if (!hasChannel) vi.stubGlobal("BroadcastChannel", undefined);
    render(<PreferencesSubscriptions />);

    await act(async () => preferences.getState().setLocale("fr"));

    await waitFor(() => expect(next.router.refresh).toHaveBeenCalledOnce());
    expect(next.set).toHaveBeenCalledExactlyOnceWith("locale", "fr", {path: "/"});
  });

  it("does not refresh when Next cannot write the locale cookie", async () => {
    const error = new Error("Cookies are unavailable");
    next.set.mockImplementation(() => {
      throw error;
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<PreferencesSubscriptions />);

    await act(async () => preferences.getState().setLocale("fr"));

    await waitFor(() => expect(log).toHaveBeenCalledWith("[PreferencesSubscriptions] locale sync failed", error));
    expect(next.router.refresh).not.toHaveBeenCalled();
  });

  it("rehydrates stored preferences when the tab becomes visible and removes its listener on unmount", async () => {
    const add = vi.spyOn(document, "addEventListener");
    const remove = vi.spyOn(document, "removeEventListener");
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    const view = render(<PreferencesSubscriptions />);
    const listener = add.mock.calls.find(([type]) => type === "visibilitychange")?.[1];
    expect(listener).toEqual(expect.any(Function));
    await storage.setItem(storageKey, {
      state: {...toPersistedPreferencesState(preferences.getState()), themePreset: "ocean"},
      version: 0,
    });

    fireEvent(document, new Event("visibilitychange"));

    expect(document.documentElement.dataset["themePreset"]).toBe("default");

    visibility.mockReturnValue("visible");
    fireEvent(document, new Event("visibilitychange"));

    await waitFor(() => expect(document.documentElement.dataset["themePreset"]).toBe("ocean"));
    view.unmount();
    expect(remove).toHaveBeenCalledWith("visibilitychange", listener);
  });

  it("clears custom theme overrides when switching back to a named preset", async () => {
    preferences.setState({
      themePreset: "custom",
      customThemeColors: {
        gradientFrom: "187 94% 43%",
        gradientVia: "193 32% 50%",
        gradientTo: "205 79% 49%",
        primary: "187 94% 43%",
        primaryForeground: "0 0% 100%",
        footerBg: "210 10% 12%",
      },
    });
    const {container} = render(<PreferencesSubscriptions />);
    const root = document.documentElement;
    expect(container.firstChild).toBeNull();
    expect(root.dataset["themePreset"]).toBe("custom");
    expect(root.style.getPropertyValue("--gradient-from")).toBe("187 94% 43%");

    await act(() => preferences.setState({themePreset: "ocean", customThemeColors: null}));

    expect(root.dataset["themePreset"]).toBe("ocean");
    expect(root.style.getPropertyValue("--gradient-from")).toBe("");
  });

  it("synchronizes incoming tab preferences through the real store and cookie action", async () => {
    render(<PreferencesSubscriptions />);
    const peer = new BroadcastChannel("zustand-preferences-sync");
    try {
      peer.postMessage({...toPersistedPreferencesState(preferences.getState()), locale: "fr", themePreset: "ocean", theme: "dark"});

      await waitFor(() => expect(preferences.getState()).toMatchObject({locale: "fr", themePreset: "ocean", theme: "dark"}));

      await waitFor(() => expect(next.router.refresh).toHaveBeenCalledOnce());
      expect(document.documentElement.dataset["themePreset"]).toBe("ocean");
      expect(next.set).toHaveBeenCalledExactlyOnceWith("locale", "fr", {path: "/"});
    } finally {
      peer.close();
    }
  });

  it("does not echo incoming preferences and resumes sending local changes after settling", async () => {
    const peer = new BroadcastChannel("zustand-preferences-sync");
    const received = vi.fn<(event: MessageEvent<PreferencesPersistedState>) => void>();
    peer.addEventListener("message", received);
    render(<PreferencesSubscriptions />);
    vi.useFakeTimers({toFake: ["setTimeout", "clearTimeout"]});

    try {
      peer.postMessage({...toPersistedPreferencesState(preferences.getState()), theme: "dark"});
      await vi.waitFor(() => expect(preferences.getState().theme).toBe("dark"));
      await vi.advanceTimersByTimeAsync(100);

      await act(() => preferences.getState().setTheme("light"));

      await vi.waitFor(() => expect(received).toHaveBeenCalledOnce());
      expect(received.mock.calls[0]?.[0].data).toMatchObject({theme: "light"});
    } finally {
      peer.close();
    }
  });
});

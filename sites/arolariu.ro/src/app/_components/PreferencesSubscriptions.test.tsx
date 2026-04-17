import {render} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {usePreferencesStore} from "@/stores/preferencesStore";
import PreferencesSubscriptions from "./PreferencesSubscriptions";

// Top-level mock so Vitest intercepts the dynamic import("@/lib/actions/cookies") inside the
// component's subscription callback. The factory returns a spy we can reprogram per test.
const setCookieMock = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/actions/cookies", () => ({setCookie: setCookieMock}));

describe("PreferencesSubscriptions", () => {
  beforeEach(() => {
    usePreferencesStore.setState({hasHydrated: true, locale: "en", themePreset: "default"});
    setCookieMock.mockResolvedValue(undefined); // reset to success default before each test
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setCookieMock.mockClear();
  });

  it("renders nothing (null)", () => {
    const {container} = render(<PreferencesSubscriptions />);
    expect(container.firstChild).toBeNull();
  });

  it("attaches a visibilitychange listener on mount and removes it on unmount", () => {
    const addSpy = vi.spyOn(document, "addEventListener");
    const removeSpy = vi.spyOn(document, "removeEventListener");

    const {unmount} = render(<PreferencesSubscriptions />);
    expect(addSpy).toHaveBeenCalledWith("visibilitychange", expect.any(Function));

    const added = addSpy.mock.calls.find(([type]) => type === "visibilitychange")?.[1];
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("visibilitychange", added);
  });

  it("applies the data-theme-preset attribute on mount", () => {
    usePreferencesStore.setState({themePreset: "ocean", hasHydrated: true});
    render(<PreferencesSubscriptions />);
    expect(document.documentElement.dataset["themePreset"]).toBe("ocean");
  });

  it("seeds prevLocale from the store state when already hydrated, so the first locale change syncs", async () => {
    // Store is hydrated BEFORE mount — prevLocale must be seeded from "en" at mount time.
    usePreferencesStore.setState({hasHydrated: true, locale: "en"});

    render(<PreferencesSubscriptions />);
    await new Promise((resolve) => setTimeout(resolve, 0)); // flush microtasks

    // First locale change after mount MUST trigger the cookie write (would be swallowed
    // by the old null-init branch that didn't seed from getState()).
    usePreferencesStore.setState({locale: "ro"});
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(setCookieMock).toHaveBeenCalledWith("locale", "ro");
  });

  it("does not write the cookie when locale does not change", async () => {
    usePreferencesStore.setState({hasHydrated: true, locale: "en"});
    render(<PreferencesSubscriptions />);
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Set same locale again — should be a no-op.
    usePreferencesStore.setState({locale: "en"});
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(setCookieMock).not.toHaveBeenCalled();
  });

  it("catches locale sync failures without unhandled rejection", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    setCookieMock.mockRejectedValue(new Error("server down"));

    usePreferencesStore.setState({hasHydrated: true, locale: "en"});
    render(<PreferencesSubscriptions />);
    await new Promise((resolve) => setTimeout(resolve, 0));

    usePreferencesStore.setState({locale: "fr"});
    await new Promise((resolve) => setTimeout(resolve, 20));

    // The error should be logged (not thrown as unhandled rejection).
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[PreferencesSubscriptions] locale sync failed",
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });

  it("applies incoming cross-tab BroadcastChannel messages to store state", async () => {
    if (typeof BroadcastChannel === "undefined") return; // skip in environments without BroadcastChannel

    usePreferencesStore.setState({hasHydrated: true, locale: "en", themePreset: "default"});

    render(<PreferencesSubscriptions />);

    // Simulate an incoming message from another tab.
    const channel = new BroadcastChannel("zustand-preferences-sync");
    const payload = {
      primaryColor: "#06b6d4",
      secondaryColor: "#ec4899",
      tertiaryColor: "#8b5cf6",
      theme: "dark" as const,
      fontType: "normal" as const,
      locale: "fr" as const,
      compactMode: false,
      animationsEnabled: true,
      themePreset: "ocean" as const,
      customThemeColors: null,
    };
    // eslint-disable-next-line unicorn/require-post-message-target-origin -- BroadcastChannel has no targetOrigin.
    channel.postMessage(payload);
    channel.close();

    // Allow the message event to propagate.
    await new Promise((resolve) => setTimeout(resolve, 50));

    const state = usePreferencesStore.getState();
    expect(state.locale).toBe("fr");
    expect(state.themePreset).toBe("ocean");
    expect(state.theme).toBe("dark");
  });
});

import {render} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {usePreferencesStore} from "@/stores/preferencesStore";
import PreferencesSubscriptions from "./PreferencesSubscriptions";

describe("PreferencesSubscriptions", () => {
  beforeEach(() => {
    usePreferencesStore.setState({hasHydrated: true, locale: "en", themePreset: "default"});
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
});

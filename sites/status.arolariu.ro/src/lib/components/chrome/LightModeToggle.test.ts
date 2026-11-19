import {fireEvent, render, screen} from "@testing-library/svelte";
import {afterEach, describe, expect, it, vi} from "vitest";
import LightModeToggle from "./LightModeToggle.svelte";

describe("LightModeToggle", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.removeItem("status-theme");
    document.documentElement.removeAttribute("data-theme");
  });

  it("can change and persist a theme on hosts without a media-query listener", async () => {
    vi.stubGlobal("matchMedia", () => ({matches: false}));
    localStorage.setItem("status-theme", "dark");
    render(LightModeToggle);
    const button = screen.getByRole("button", {name: /currently dark/u});

    await fireEvent.click(button);
    await fireEvent.click(button);

    expect(button).toHaveAccessibleName(/currently auto/u);
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(localStorage.getItem("status-theme")).toBe("auto");
  });

  it("cycles the persisted preference and follows system changes only while set to auto", async () => {
    const root = document.documentElement;
    const system = Object.assign(new EventTarget(), {matches: false});
    vi.stubGlobal("matchMedia", () => system);
    localStorage.setItem("status-theme", "dark");
    root.setAttribute("data-theme", "dark");
    const {unmount} = render(LightModeToggle);
    const button = screen.getByRole("button", {name: /currently dark/});

    await fireEvent.click(button);
    system.matches = true;
    system.dispatchEvent(new Event("change"));

    expect(button).toHaveAccessibleName(/currently light/);
    expect(localStorage.getItem("status-theme")).toBe("light");
    expect(root).toHaveAttribute("data-theme", "light");

    await fireEvent.click(button);

    expect(button).toHaveAccessibleName(/currently auto/);
    expect(localStorage.getItem("status-theme")).toBe("auto");
    expect(root).toHaveAttribute("data-theme", "dark");

    system.matches = false;
    system.dispatchEvent(new Event("change"));

    expect(root).toHaveAttribute("data-theme", "light");

    await fireEvent.click(button);

    expect(button).toHaveAccessibleName(/currently dark/);
    expect(localStorage.getItem("status-theme")).toBe("dark");
    expect(root).toHaveAttribute("data-theme", "dark");

    await fireEvent.click(button);
    await fireEvent.click(button);
    unmount();
    system.matches = true;
    system.dispatchEvent(new Event("change"));

    expect(localStorage.getItem("status-theme")).toBe("auto");
    expect(root).toHaveAttribute("data-theme", "light");
  });
});

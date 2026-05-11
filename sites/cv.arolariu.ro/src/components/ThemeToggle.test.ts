/**
 * @fileoverview Behaviour test for the ThemeToggle component.
 *
 * Asserts:
 *  - Renders a single <button> with the accessible-name "Toggle theme".
 *  - Clicking the button flips `useTheme().current` to the opposite value.
 *
 * Notes:
 *  - useTheme is a Svelte 5 runes-class singleton. The first test to
 *    run will see whatever value localStorage's mock returns; we
 *    explicitly set the theme before each assertion to avoid order
 *    dependence with other tests in the suite.
 */

import {render, fireEvent} from "@testing-library/svelte";
import {beforeEach, describe, expect, it} from "vitest";

import {useTheme} from "@/hooks/useTheme.svelte";
import ThemeToggle from "./ThemeToggle.svelte";

describe("ThemeToggle", () => {
  beforeEach(() => {
    // Pin theme to "dark" so the click-to-toggle assertion is deterministic.
    useTheme().set("dark");
  });

  it("renders a Toggle Theme button", () => {
    const {getByRole} = render(ThemeToggle);
    const button = getByRole("button", {name: /toggle theme/i});
    expect(button).toBeTruthy();
  });

  it("clicking the button toggles the theme from dark to light", async () => {
    expect(useTheme().current).toBe("dark");
    const {getByRole} = render(ThemeToggle);
    await fireEvent.click(getByRole("button", {name: /toggle theme/i}));
    expect(useTheme().current).toBe("light");
  });

  it("a second click toggles back from light to dark", async () => {
    useTheme().set("light");
    const {getByRole} = render(ThemeToggle);
    await fireEvent.click(getByRole("button", {name: /toggle theme/i}));
    expect(useTheme().current).toBe("dark");
  });
});

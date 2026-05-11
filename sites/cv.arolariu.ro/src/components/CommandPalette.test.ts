/**
 * @fileoverview Render tests for the CommandPalette component.
 *
 * Asserts the migration to the native <dialog> element:
 *  - The element is `<dialog>`, not `<div role="dialog">`.
 *  - It carries an accessible name (aria-label or aria-labelledby).
 *  - Initially closed (no `open` attribute) so it does not steal focus on mount.
 */

import {render} from "@testing-library/svelte";
import {describe, expect, it} from "vitest";

import CommandPalette from "./CommandPalette.svelte";

describe("CommandPalette", () => {
  it("uses the native <dialog> element", () => {
    const {container} = render(CommandPalette);
    const dialog = container.querySelector("dialog");
    expect(dialog).not.toBeNull();
  });

  it("dialog has an accessible name", () => {
    const {container} = render(CommandPalette);
    const dialog = container.querySelector("dialog");
    const ariaLabel = dialog?.getAttribute("aria-label");
    const labelledBy = dialog?.getAttribute("aria-labelledby");
    expect(ariaLabel ?? labelledBy).toBeTruthy();
  });

  it("dialog starts closed", () => {
    const {container} = render(CommandPalette);
    const dialog = container.querySelector("dialog");
    expect(dialog?.hasAttribute("open")).toBe(false);
  });

  it("renders each command button with a stable id attribute (keyed each blocks)", () => {
    const {container} = render(CommandPalette);
    const buttons = container.querySelectorAll("dialog button[id^='cmd-']");
    // Sanity: at least one filtered command button should be rendered on mount
    // (the palette renders the full command list when searchQuery is empty).
    expect(buttons.length).toBeGreaterThan(0);

    // Every button must have a unique id; this is the signal that the
    // {#each ... (cmd.id)} key is in effect, because the template binds
    // id="cmd-{cmd.id}".
    const ids = Array.from(buttons, (b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

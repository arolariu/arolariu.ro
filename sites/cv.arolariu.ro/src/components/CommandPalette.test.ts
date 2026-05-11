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
});

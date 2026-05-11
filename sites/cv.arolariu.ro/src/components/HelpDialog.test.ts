/**
 * @fileoverview Render tests for the HelpDialog component.
 *
 * Asserts the migration to the native <dialog> element:
 *  - The element is `<dialog>`, not `<div role="dialog">`.
 *  - It carries an accessible name.
 *  - Initially closed.
 */

import {render} from "@testing-library/svelte";
import {describe, expect, it} from "vitest";

import HelpDialog from "./HelpDialog.svelte";

describe("HelpDialog", () => {
  it("uses the native <dialog> element", () => {
    const {container} = render(HelpDialog);
    const dialog = container.querySelector("dialog");
    expect(dialog).not.toBeNull();
  });

  it("dialog has an accessible name", () => {
    const {container} = render(HelpDialog);
    const dialog = container.querySelector("dialog");
    const ariaLabel = dialog?.getAttribute("aria-label");
    const labelledBy = dialog?.getAttribute("aria-labelledby");
    expect(ariaLabel ?? labelledBy).toBeTruthy();
  });

  it("dialog starts closed", () => {
    const {container} = render(HelpDialog);
    const dialog = container.querySelector("dialog");
    expect(dialog?.hasAttribute("open")).toBe(false);
  });
});

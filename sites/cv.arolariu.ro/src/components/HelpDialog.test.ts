/**
 * @fileoverview Render tests for the HelpDialog component.
 *
 * Asserts the migration to the native <dialog> element:
 *  - The element is `<dialog>`, not `<div role="dialog">`.
 *  - It carries an accessible name.
 *  - Initially closed.
 */

import {fireEvent, render, screen, within} from "@testing-library/svelte";
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

  it("switches help sections without closing and gives initial focus to Close", async () => {
    render(HelpDialog, {props: {open: true}});
    const dialog = await screen.findByRole("dialog", {name: "Technical Information"});
    const help = within(dialog);
    const close = help.getByLabelText("Close", {selector: "button"});
    expect(close).toHaveFocus();
    expect(help.getByText("Lighthouse Score")).toBeInTheDocument();

    await fireEvent.click(help.getByRole("button", {name: "Keyboard Shortcuts"}));

    expect(help.getByText("Open command palette")).toBeInTheDocument();
    expect(help.queryByText("Lighthouse Score")).not.toBeInTheDocument();
    expect(dialog).toHaveAttribute("open");

    await fireEvent.click(help.getByRole("button", {name: "Features"}));

    expect(help.getByText("Career Timeline")).toBeInTheDocument();
    expect(help.queryByText("Open command palette")).not.toBeInTheDocument();

    await fireEvent.click(close);

    expect(dialog).not.toHaveAttribute("open");
  });

  it("closes on a backdrop click but not on a click inside the dialog", async () => {
    render(HelpDialog, {props: {open: true}});
    const dialog = await screen.findByRole("dialog", {name: "Technical Information"});

    await fireEvent.click(within(dialog).getByRole("heading", {name: "Technical Information"}));

    expect(dialog).toHaveAttribute("open");

    await fireEvent.click(dialog);

    expect(dialog).not.toHaveAttribute("open");
  });
});

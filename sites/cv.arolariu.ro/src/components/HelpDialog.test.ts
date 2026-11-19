import {fireEvent, render, screen, within} from "@testing-library/svelte";
import {describe, expect, it} from "vitest";

import HelpDialog from "./HelpDialog.svelte";

describe("HelpDialog", () => {
  it("keeps the native dialog in sync when its parent opens and closes it", async () => {
    const {container, rerender} = render(HelpDialog);
    const dialog = container.querySelector("dialog");
    expect(dialog).not.toBeNull();
    expect(dialog).not.toHaveAttribute("open");

    await rerender({open: true});

    expect(screen.getByRole("dialog", {name: "Technical Information"})).toBe(dialog);

    await rerender({open: false});

    expect(dialog).not.toHaveAttribute("open");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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

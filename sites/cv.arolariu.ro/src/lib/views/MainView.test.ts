import {fireEvent, render, screen, within} from "@testing-library/svelte";
import {describe, expect, it} from "vitest";

import MainView from "./MainView.svelte";

describe("MainView", () => {
  it("loads the help dialog on demand and lets the visitor close and reopen it", async () => {
    const {container} = render(MainView);
    const help = screen.getByRole("button", {name: "Help"});
    expect(container.querySelector("dialog[aria-labelledby='help-dialog-title']")).not.toBeInTheDocument();

    await fireEvent.click(help);

    const dialog = await screen.findByRole("dialog", {name: "Technical Information"});
    expect(dialog).toHaveAttribute("open");
    await fireEvent.click(within(dialog).getByLabelText("Close", {selector: "button"}));
    expect(dialog).not.toBeInTheDocument();

    await fireEvent.click(help);

    expect(await screen.findByRole("dialog", {name: "Technical Information"})).toHaveAttribute("open");
  });
});

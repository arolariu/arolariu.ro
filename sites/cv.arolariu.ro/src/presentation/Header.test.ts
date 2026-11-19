/**
 * @fileoverview Render test for the Header chrome component.
 *
 * Asserts:
 *  - Brand <h1> always renders with the author name.
 *  - showNavLinks=true exposes the four in-page nav anchors;
 *    showNavLinks=false hides them.
 *  - ThemeToggle is present (its accessible name "Toggle theme").
 *  - actionsConfig items render as buttons with their labels.
 */

import * as navigation from "$app/navigation";
import {fireEvent, render, screen} from "@testing-library/svelte";
import {createRawSnippet} from "svelte";
import {describe, expect, it, vi} from "vitest";

import Header from "./Header.svelte";

describe("Header", () => {
  it("always renders the brand <h1>", () => {
    const {container} = render(Header);
    const h1 = container.querySelector("h1");
    expect(h1).not.toBeNull();
    expect(h1?.textContent).toMatch(/Olariu/);
  });

  it("renders the four in-page nav anchors when showNavLinks=true (default)", () => {
    const {container} = render(Header);
    const nav = container.querySelector("nav");
    expect(nav).not.toBeNull();
    const anchors = nav?.querySelectorAll("a[href^='#']") ?? [];
    expect(anchors.length).toBeGreaterThanOrEqual(4);
    const hrefs = Array.from(anchors, (a) => a.getAttribute("href"));
    expect(hrefs).toContain("#about");
    expect(hrefs).toContain("#experience");
    expect(hrefs).toContain("#skills");
    expect(hrefs).toContain("#contact");
  });

  it("hides the in-page nav when showNavLinks=false", () => {
    const {container} = render(Header, {props: {showNavLinks: false}});
    expect(container.querySelector("nav")).toBeNull();
  });

  it("includes the theme toggle", () => {
    const {getByRole} = render(Header);
    expect(getByRole("button", {name: /toggle theme/i})).toBeTruthy();
  });

  it("dispatches the selected action and blocks a loading action until it is ready", async () => {
    const print = vi.fn();
    const download = vi.fn();
    const {rerender} = render(Header, {
      props: {
        variant: "inverse",
        showNavLinks: false,
        actionsConfig: [
          {icon: "print", label: "Print", loading: false, disabled: false, onClick: print},
          {icon: "download", label: "Download PDF", loading: true, disabled: false, onClick: download},
        ],
      },
    });
    const printButton = screen.getByRole("button", {name: "Print"});
    const downloadButton = screen.getByRole("button", {name: "Download PDF"});
    expect(downloadButton).toBeDisabled();

    await fireEvent.click(printButton);

    expect(print).toHaveBeenCalledOnce();
    expect(download).not.toHaveBeenCalled();

    await rerender({
      actionsConfig: [{icon: "download", label: "Download PDF", loading: false, disabled: false, onClick: download}],
    });

    const readyDownload = screen.getByRole("button", {name: "Download PDF"});
    expect(readyDownload).toBeEnabled();
    await fireEvent.click(readyDownload);
    expect(download).toHaveBeenCalledOnce();
    expect(print).toHaveBeenCalledOnce();
  });

  it("returns to the format menu through the Back button without navigating on mount", async () => {
    const goto = vi.spyOn(navigation, "goto");
    render(Header);
    expect(goto).not.toHaveBeenCalled();

    await fireEvent.click(screen.getByRole("button", {name: "Back to Menu"}));

    expect(goto).toHaveBeenCalledExactlyOnceWith("/");
  });

  it("uses the supplied action snippet only until structured actions are provided", async () => {
    const actions = createRawSnippet(() => ({render: () => '<button type="button">Print legacy CV</button>'}));
    const {rerender} = render(Header, {props: {actions}});
    expect(screen.getByRole("button", {name: "Print legacy CV"})).toBeVisible();

    await rerender({actionsConfig: [{icon: "copy", label: "Copy CV", loading: false, disabled: false, onClick: vi.fn()}]});

    expect(screen.getByRole("button", {name: "Copy CV"})).toBeVisible();
    expect(screen.queryByRole("button", {name: "Print legacy CV"})).not.toBeInTheDocument();
  });
});

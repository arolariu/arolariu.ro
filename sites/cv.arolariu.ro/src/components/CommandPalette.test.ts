/**
 * @fileoverview Render tests for the CommandPalette component.
 *
 * Asserts the migration to the native <dialog> element:
 *  - The element is `<dialog>`, not `<div role="dialog">`.
 *  - It carries an accessible name (aria-label or aria-labelledby).
 *  - Initially closed (no `open` attribute) so it does not steal focus on mount.
 */

import * as navigation from "$app/navigation";
import {fireEvent, render, screen, waitFor} from "@testing-library/svelte";
import {describe, expect, it, vi} from "vitest";

import {useTheme} from "../hooks/useTheme.svelte";
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

  it("does not navigate on Enter with no results and resets the search on reopening", async () => {
    const goto = vi.spyOn(navigation, "goto");
    render(CommandPalette);
    await fireEvent.keyDown(document, {ctrlKey: true, key: "k"});
    const input = screen.getByRole("textbox", {name: "Search commands"});
    await fireEvent.input(input, {target: {value: "zzzxq-no-match"}});

    await fireEvent.keyDown(input, {key: "Enter"});

    expect(screen.getByText('No commands found for "zzzxq-no-match"')).toBeInTheDocument();
    expect(goto).not.toHaveBeenCalled();

    await fireEvent.keyDown(input, {key: "Escape"});

    expect(screen.queryByRole("dialog", {name: "Command palette"})).not.toBeInTheDocument();

    await fireEvent.keyDown(document, {ctrlKey: true, key: "k"});

    expect(screen.getByRole("textbox", {name: "Search commands"})).toHaveValue("");
    expect(screen.getByRole("button", {name: /Go to Home/u})).toBeInTheDocument();
  });

  it("wraps to the download command when ArrowUp precedes Enter on PDF results", async () => {
    const goto = vi.spyOn(navigation, "goto");
    render(CommandPalette);
    await fireEvent.keyDown(document, {metaKey: true, key: "k"});
    const input = screen.getByRole("textbox", {name: "Search commands"});
    await fireEvent.input(input, {target: {value: "pdf"}});
    expect(screen.queryByRole("button", {name: /Go to Home/u})).not.toBeInTheDocument();
    expect(screen.getByRole("button", {name: /View PDF/u})).toBeInTheDocument();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    await fireEvent.keyDown(input, {key: "ArrowUp"});
    await fireEvent.keyDown(input, {key: "Enter"});

    expect(click).toHaveBeenCalledOnce();
    expect(goto).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", {name: "Command palette"})).not.toBeInTheDocument();
  });

  it("navigates to the next matching section on ArrowDown and Enter", async () => {
    const goto = vi.spyOn(navigation, "goto");
    render(CommandPalette);
    await fireEvent.click(screen.getByRole("button", {name: /Open command palette/u}));
    const input = screen.getByRole("textbox", {name: "Search commands"});
    await fireEvent.input(input, {target: {value: "SECTION"}});
    expect(screen.queryByRole("button", {name: /Go to Home/u})).not.toBeInTheDocument();
    expect(screen.getByRole("button", {name: /About Section/u})).toBeInTheDocument();

    await fireEvent.keyDown(input, {key: "ArrowDown"});
    await fireEvent.keyDown(input, {key: "Enter"});

    expect(goto).toHaveBeenCalledExactlyOnceWith("/human#skills");
    expect(screen.queryByRole("dialog", {name: "Command palette"})).not.toBeInTheDocument();
  });

  it.each([
    ["Go to Home", "/"],
    ["View CV", "/human"],
    ["View PDF", "/pdf"],
    ["View JSON", "/json"],
  ])("navigates to the matching page for %s", async (label, destination) => {
    const goto = vi.spyOn(navigation, "goto");
    render(CommandPalette);
    await fireEvent.keyDown(document, {ctrlKey: true, key: "k"});
    const command = screen.getByRole("button", {name: new RegExp(`^${label}\\b`, "u")});

    await fireEvent.click(command);

    expect(goto).toHaveBeenCalledExactlyOnceWith(destination);
  });

  it.each([
    ["About Section", "/human#about"],
    ["Experience Section", "/human#experience"],
    ["Contact Section", "/human#contact"],
  ])("closes after navigating to the anchor for %s", async (label, destination) => {
    const goto = vi.spyOn(navigation, "goto");
    render(CommandPalette);
    await fireEvent.keyDown(document, {ctrlKey: true, key: "k"});
    const command = screen.getByRole("button", {name: new RegExp(`^${label}\\b`, "u")});

    await fireEvent.click(command);

    expect(goto).toHaveBeenCalledExactlyOnceWith(destination);
    expect(screen.queryByRole("dialog", {name: "Command palette"})).not.toBeInTheDocument();
  });

  it("uses the hovered result for Enter rather than opening the first contact result", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(CommandPalette);
    await fireEvent.keyDown(document, {ctrlKey: true, key: "k"});
    const input = screen.getByRole("textbox", {name: "Search commands"});
    await fireEvent.input(input, {target: {value: "profile"}});
    const linkedin = screen.getByRole("button", {name: /Open LinkedIn/u});
    const github = screen.getByRole("button", {name: /Open GitHub/u});
    await fireEvent.mouseEnter(github);

    expect(linkedin).not.toHaveTextContent("Enter");
    expect(github).toHaveTextContent("Enter");
    await fireEvent.keyDown(input, {key: "Enter"});

    expect(open).toHaveBeenCalledExactlyOnceWith("https://github.com/arolariu", "_blank");
    expect(screen.queryByRole("dialog", {name: "Command palette"})).not.toBeInTheDocument();
  });

  it("prints from keyword search and closes the palette without navigating", async () => {
    const print = vi.fn<() => void>();
    const goto = vi.spyOn(navigation, "goto");
    vi.stubGlobal("print", print);
    try {
      render(CommandPalette);
      await fireEvent.keyDown(document, {ctrlKey: true, key: "k"});
      const input = screen.getByRole("textbox", {name: "Search commands"});
      await fireEvent.input(input, {target: {value: "hard copy"}});
      expect(screen.getByRole("button", {name: /Print Page/u})).toBeVisible();
      expect(print).not.toHaveBeenCalled();

      await fireEvent.keyDown(input, {key: "Enter"});

      expect(print).toHaveBeenCalledOnce();
      expect(goto).not.toHaveBeenCalled();
      expect(screen.queryByRole("dialog", {name: "Command palette"})).not.toBeInTheDocument();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("retains the search when interacting inside the dialog but resets it on backdrop dismissal", async () => {
    render(CommandPalette);
    await fireEvent.keyDown(document, {ctrlKey: true, key: "k"});
    const dialog = screen.getByRole("dialog", {name: "Command palette"});
    const input = screen.getByRole("textbox", {name: "Search commands"});
    await fireEvent.input(input, {target: {value: "theme"}});

    await fireEvent.click(input);

    expect(dialog).toHaveAttribute("open");
    expect(input).toHaveValue("theme");

    await fireEvent.click(dialog);

    expect(dialog).not.toHaveAttribute("open");
    await fireEvent.keyDown(document, {ctrlKey: true, key: "k"});
    expect(input).toHaveValue("");
  });

  it("applies and persists a light theme, then offers the reverse action when reopened", async () => {
    const theme = useTheme();
    const previousTheme = theme.current;
    theme.set("dark");
    try {
      render(CommandPalette);
      await fireEvent.keyDown(document, {ctrlKey: true, key: "k"});

      await fireEvent.click(screen.getByRole("button", {name: /Toggle Theme.*Switch to light mode/u}));

      expect(document.documentElement).toHaveAttribute("data-theme", "light");
      expect(localStorage.getItem("theme")).toBe("light");
      expect(screen.queryByRole("dialog", {name: "Command palette"})).not.toBeInTheDocument();
      await fireEvent.keyDown(document, {ctrlKey: true, key: "k"});
      expect(screen.getByRole("button", {name: /Toggle Theme.*Switch to dark mode/u})).toBeVisible();
    } finally {
      theme.set(previousTheme);
    }
  });

  it("uses the same shortcut to close the palette and ignores further navigation until opened", async () => {
    const goto = vi.spyOn(navigation, "goto");
    render(CommandPalette);
    await fireEvent.keyDown(document, {metaKey: true, key: "k"});
    const input = screen.getByRole("textbox", {name: "Search commands"});
    await fireEvent.input(input, {target: {value: "experience"}});

    await fireEvent.keyDown(input, {metaKey: true, key: "k"});
    await fireEvent.keyDown(document, {key: "Enter"});

    expect(screen.queryByRole("dialog", {name: "Command palette"})).not.toBeInTheDocument();
    expect(goto).not.toHaveBeenCalled();
  });

  it("copies the server response as formatted JSON and closes the palette", async () => {
    const data = {basics: {name: "Sample candidate"}, skills: ["TypeScript"]};
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(data));
    await navigator.clipboard.writeText("");
    render(CommandPalette);
    await fireEvent.keyDown(document, {ctrlKey: true, key: "k"});

    await fireEvent.click(screen.getByRole("button", {name: /Copy JSON to Clipboard/u}));

    await waitFor(() => expect(screen.queryByRole("dialog", {name: "Command palette"})).not.toBeInTheDocument());
    expect(fetch).toHaveBeenCalledExactlyOnceWith("/rest/json");
    expect(await navigator.clipboard.readText()).toBe(JSON.stringify(data, null, 2));
  });

  it("preserves the clipboard and leaves the palette open when the response is malformed", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("<html>Unavailable</html>"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    await navigator.clipboard.writeText("previous text");
    render(CommandPalette);
    await fireEvent.keyDown(document, {ctrlKey: true, key: "k"});

    await fireEvent.click(screen.getByRole("button", {name: /Copy JSON to Clipboard/u}));

    await waitFor(() => expect(consoleError).toHaveBeenCalledExactlyOnceWith("Failed to copy JSON"));
    expect(fetch).toHaveBeenCalledExactlyOnceWith("/rest/json");
    expect(await navigator.clipboard.readText()).toBe("previous text");
    expect(screen.getByRole("dialog", {name: "Command palette"})).toBeVisible();
  });

  it.each([
    ["LinkedIn", "https://www.linkedin.com/in/olariu-alexandru/"],
    ["GitHub", "https://github.com/arolariu"],
  ] as const)("opens %s in a new tab without changing the CV route", async (label, destination) => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const goto = vi.spyOn(navigation, "goto");
    render(CommandPalette);
    await fireEvent.keyDown(document, {ctrlKey: true, key: "k"});

    await fireEvent.click(screen.getByRole("button", {name: new RegExp(`Open ${label}`, "u")}));

    expect(open).toHaveBeenCalledExactlyOnceWith(destination, "_blank");
    expect(goto).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", {name: "Command palette"})).not.toBeInTheDocument();
  });
});

import {fireEvent, render, screen, within} from "@testing-library/svelte";
import {createRawSnippet} from "svelte";
import {describe, expect, it, vi} from "vitest";
import InfoButton from "./InfoButton.svelte";
import KeyboardHelpOverlay from "./KeyboardHelpOverlay.svelte";
import Popover from "./Popover.svelte";

describe("anchored popover", () => {
  it("only describes its trigger while open and dismisses on outside click or Escape", async () => {
    const text = "Uptime is the share of successful probes.";
    render(InfoButton, {props: {text}});
    const trigger = screen.getByRole("button", {name: `Info: ${text}`});
    expect(trigger).not.toHaveAttribute("aria-describedby");

    await fireEvent.click(trigger);
    const tooltip = screen.getByRole("tooltip");
    await fireEvent.click(tooltip);

    expect(tooltip).toBeInTheDocument();
    expect(trigger).toHaveAccessibleDescription(text);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await fireEvent.click(document.body);

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(trigger).not.toHaveAttribute("aria-describedby");

    await fireEvent.click(trigger);
    await fireEvent.keyDown(screen.getByRole("tooltip"), {key: "Escape"});

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});

describe("modal popover", () => {
  it("focuses keyboard help, contains keyboard tabbing, and returns focus when closed", async () => {
    const opener = document.createElement("button");
    opener.textContent = "Open keyboard help";
    document.body.append(opener);
    try {
      opener.focus();
      const onClose = vi.fn<() => void>();
      const {rerender} = render(KeyboardHelpOverlay, {props: {open: true, onClose}});
      const dialog = await screen.findByRole("dialog", {name: "Keyboard shortcuts"});
      expect(dialog).toHaveFocus();
      expect(dialog).toHaveAttribute("aria-modal", "true");
      const close = within(dialog).getByRole("button", {name: "Close help"});
      close.focus();

      for (const shiftKey of [false, true]) {
        const tab = new KeyboardEvent("keydown", {key: "Tab", shiftKey, bubbles: true, cancelable: true});
        await fireEvent(close, tab);

        expect(tab.defaultPrevented).toBe(true);
        expect(close).toHaveFocus();
      }

      await fireEvent.keyDown(close, {key: "Escape"});

      expect(onClose).toHaveBeenCalledOnce();

      await rerender({open: false});

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(opener).toHaveFocus();
    } finally {
      opener.remove();
    }
  });

  it("honors the caller's opt-outs for Escape and document-level dismissal", async () => {
    const onClose = vi.fn<() => void>();
    const children = createRawSnippet(() => ({render: () => "<p>Pending status acknowledgement</p>"}));
    render(Popover, {
      props: {open: true, modal: true, onClose, closeOnEscape: false, closeOnOutsideClick: false, surfaceClass: "", children},
    });
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveFocus();
    const tab = new KeyboardEvent("keydown", {key: "Tab", cancelable: true, bubbles: true});

    await fireEvent.keyDown(dialog, {key: "Escape"});
    await fireEvent(dialog, tab);
    await fireEvent.click(document.body);

    expect(tab.defaultPrevented).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
    expect(dialog).toHaveTextContent("Pending status acknowledgement");
  });

  it("leaves interior tabbing to the browser and wraps at the last control", async () => {
    const children = createRawSnippet(() => ({render: () => "<div><button>Previous</button><button>Next</button></div>"}));
    const onClose = vi.fn<() => void>();
    render(Popover, {props: {open: true, modal: true, onClose, surfaceClass: "", children}});
    const dialog = within(await screen.findByRole("dialog"));
    const previous = dialog.getByRole("button", {name: "Previous"});
    const next = dialog.getByRole("button", {name: "Next"});
    previous.focus();

    const interiorTab = new KeyboardEvent("keydown", {key: "Tab", cancelable: true, bubbles: true});
    await fireEvent(previous, interiorTab);

    expect(interiorTab.defaultPrevented).toBe(false);

    next.focus();
    const finalTab = new KeyboardEvent("keydown", {key: "Tab", cancelable: true, bubbles: true});
    await fireEvent(next, finalTab);

    expect(finalTab.defaultPrevented).toBe(true);
    expect(previous).toHaveFocus();
    expect(onClose).not.toHaveBeenCalled();
  });
});

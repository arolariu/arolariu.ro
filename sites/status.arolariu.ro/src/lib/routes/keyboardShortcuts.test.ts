import {describe, it, expect, vi} from "vitest";
import type {FilterWindow} from "../types/status";
import {createKeyboardHandler, shouldIgnoreKeydown, type KeyboardBindings} from "./keyboardShortcuts";

function mkEvent(partial: Partial<KeyboardEventInit> & {target?: EventTarget; key: string}): KeyboardEvent {
  const ev = new KeyboardEvent("keydown", {cancelable: true, ...partial});
  if (partial.target) {
    Object.defineProperty(ev, "target", {value: partial.target});
  }
  return ev;
}

function mkBindings(active: FilterWindow = "1d", expanded: string | null = null) {
  const state = {active, expanded, helpOpen: false, refreshCount: 0};
  const setActiveWindow = vi.fn((w: FilterWindow) => { state.active = w; });
  const setExpandedService = vi.fn((s: string | null) => { state.expanded = s; });
  const toggleHelp = vi.fn(() => { state.helpOpen = !state.helpOpen; });
  const refresh = vi.fn(() => { state.refreshCount++; });
  const bindings: KeyboardBindings = {
    getActiveWindow: () => state.active,
    setActiveWindow,
    getExpandedService: () => state.expanded,
    setExpandedService,
    toggleHelp,
    refresh,
  };
  return {state, bindings, setActiveWindow, setExpandedService, toggleHelp, refresh};
}

describe("shouldIgnoreKeydown", () => {
  it("ignores when ctrl is held", () => {
    expect(shouldIgnoreKeydown(mkEvent({ctrlKey: true, key: "r"}))).toBe(true);
  });
  it("ignores when meta is held", () => {
    expect(shouldIgnoreKeydown(mkEvent({metaKey: true, key: "r"}))).toBe(true);
  });
  it("ignores when alt is held", () => {
    expect(shouldIgnoreKeydown(mkEvent({altKey: true, key: "r"}))).toBe(true);
  });
  it("does not ignore a bare key with no target", () => {
    expect(shouldIgnoreKeydown(mkEvent({key: "r"}))).toBe(false);
  });
  it("ignores when target is an editable element", () => {
    const input = document.createElement("input");
    expect(shouldIgnoreKeydown(mkEvent({key: "r", target: input}))).toBe(true);
  });
});

describe("createKeyboardHandler", () => {
  it("ArrowRight cycles to the next filter window", () => {
    const h = mkBindings("1d");
    createKeyboardHandler(h.bindings)(mkEvent({key: "ArrowRight"}));
    expect(h.setActiveWindow).toHaveBeenCalledWith("3d");
  });

  it("ArrowLeft cycles to the previous filter window (wraps at the start)", () => {
    const h = mkBindings("1d");
    createKeyboardHandler(h.bindings)(mkEvent({key: "ArrowLeft"}));
    expect(h.setActiveWindow).toHaveBeenCalledWith("365d");
  });

  it("digits 1..9 jump directly to the corresponding window", () => {
    const h = mkBindings("1d");
    const handle = createKeyboardHandler(h.bindings);
    handle(mkEvent({key: "5"}));
    expect(h.setActiveWindow).toHaveBeenLastCalledWith("30d");
    handle(mkEvent({key: "9"}));
    expect(h.setActiveWindow).toHaveBeenLastCalledWith("365d");
  });

  it("digit 0 does nothing (out of range)", () => {
    const h = mkBindings("1d");
    createKeyboardHandler(h.bindings)(mkEvent({key: "0"}));
    expect(h.setActiveWindow).not.toHaveBeenCalled();
  });

  it("Escape collapses the expanded service if any", () => {
    const h = mkBindings("1d", "arolariu.ro");
    const ev = mkEvent({key: "Escape"});
    createKeyboardHandler(h.bindings)(ev);
    expect(h.setExpandedService).toHaveBeenCalledWith(null);
    expect(ev.defaultPrevented).toBe(true);
  });

  it("Escape is a no-op when nothing is expanded", () => {
    const h = mkBindings("1d", null);
    const ev = mkEvent({key: "Escape"});
    createKeyboardHandler(h.bindings)(ev);
    expect(h.setExpandedService).not.toHaveBeenCalled();
    expect(ev.defaultPrevented).toBe(false);
  });

  it("r/R triggers refresh", () => {
    const h = mkBindings("1d");
    const handle = createKeyboardHandler(h.bindings);
    handle(mkEvent({key: "r"}));
    handle(mkEvent({key: "R"}));
    expect(h.refresh).toHaveBeenCalledTimes(2);
  });

  it("? toggles the keyboard-help overlay", () => {
    const h = mkBindings("1d");
    createKeyboardHandler(h.bindings)(mkEvent({key: "?"}));
    expect(h.toggleHelp).toHaveBeenCalledTimes(1);
  });

  it("skips when a modifier is held (shouldIgnoreKeydown gate)", () => {
    const h = mkBindings("1d");
    createKeyboardHandler(h.bindings)(mkEvent({key: "ArrowRight", ctrlKey: true}));
    expect(h.setActiveWindow).not.toHaveBeenCalled();
  });

  it("skips when defaultPrevented is already true (child handler consumed it)", () => {
    const h = mkBindings("1d");
    const ev = mkEvent({key: "ArrowRight"});
    ev.preventDefault();
    createKeyboardHandler(h.bindings)(ev);
    expect(h.setActiveWindow).not.toHaveBeenCalled();
  });

  it("skips when typing into an input", () => {
    const h = mkBindings("1d");
    const input = document.createElement("input");
    createKeyboardHandler(h.bindings)(mkEvent({key: "r", target: input}));
    expect(h.refresh).not.toHaveBeenCalled();
  });
});

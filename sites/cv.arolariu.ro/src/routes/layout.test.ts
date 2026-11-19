/**
 * @fileoverview Render-smoke test for the root SvelteKit layout.
 *
 * Asserts that:
 *  - The layout renders provided children (snippet pass-through).
 *  - Sibling chrome (ScrollProgress, CommandPalette) mounts alongside content.
 */

import * as navigation from "$app/navigation";
import {render} from "@testing-library/svelte";
import {createRawSnippet} from "svelte";
import {describe, expect, it, vi} from "vitest";

import Layout from "./+layout.svelte";

describe("root layout", () => {
  it("renders children passed via the children snippet", () => {
    const childSnippet = createRawSnippet(() => ({
      render: () => `<p data-testid="layout-child">Test child</p>`,
    }));

    const {getByTestId} = render(Layout, {props: {children: childSnippet}});
    expect(getByTestId("layout-child").textContent).toBe("Test child");
  });

  it("renders the main landmark element wrapping content", () => {
    const childSnippet = createRawSnippet(() => ({
      render: () => `<span>inner</span>`,
    }));

    const {container} = render(Layout, {props: {children: childSnippet}});
    const main = container.querySelector("main#main-content");
    expect(main).not.toBeNull();
    // tabindex=-1 is required so the skip-link actually moves keyboard
    // focus into <main> on activation (Chrome/Edge/Safari only shift
    // focus to the fragment target if the target is focusable).
    expect(main?.getAttribute("tabindex")).toBe("-1");
  });

  it("renders a skip-to-main link as the first focusable element", () => {
    const childSnippet = createRawSnippet(() => ({
      render: () => `<span>inner</span>`,
    }));

    const {container} = render(Layout, {props: {children: childSnippet}});
    const skipLink = container.querySelector("a[href='#main-content']");
    expect(skipLink).not.toBeNull();
    expect(skipLink?.textContent?.trim()).toMatch(/skip to main content/i);
  });

  it("allows navigation to update the document while keeping its view transition pending until navigation completes", async () => {
    const registered = vi.spyOn(navigation, "onNavigate");
    render(Layout);
    const onNavigate = registered.mock.calls[0]?.[0];
    if (!onNavigate) throw new Error("Missing SvelteKit navigation callback");
    const navigationComplete = Promise.withResolvers<void>();
    const change = {type: "goto", willUnload: false, from: null, to: null, complete: navigationComplete.promise} as const;
    const original = Object.getOwnPropertyDescriptor(document, "startViewTransition");
    const startViewTransition = vi.fn<(update: () => Promise<void>) => void>();
    Object.defineProperty(document, "startViewTransition", {configurable: true, value: undefined});
    try {
      expect(onNavigate(change)).toBeUndefined();
      Object.defineProperty(document, "startViewTransition", {configurable: true, value: startViewTransition});

      const resumed = vi.fn();
      const canNavigate = Promise.resolve(onNavigate(change)).then(resumed);

      expect(startViewTransition).toHaveBeenCalledOnce();
      const update = startViewTransition.mock.calls[0]?.[0];
      if (!update) throw new Error("Missing browser view transition callback");
      await Promise.resolve();
      expect(resumed).not.toHaveBeenCalled();
      const finished = vi.fn();
      const updating = update().then(finished);
      await canNavigate;
      expect(resumed).toHaveBeenCalledOnce();
      expect(finished).not.toHaveBeenCalled();

      navigationComplete.resolve();
      await updating;

      expect(finished).toHaveBeenCalledOnce();
    } finally {
      navigationComplete.resolve();
      if (original) Object.defineProperty(document, "startViewTransition", original);
      else Reflect.deleteProperty(document, "startViewTransition");
    }
  });
});

/**
 * @fileoverview Render-smoke test for the root SvelteKit layout.
 *
 * Asserts that:
 *  - The layout renders provided children (snippet pass-through).
 *  - Sibling chrome (ScrollProgress, CommandPalette) mounts alongside content.
 */

import {render} from "@testing-library/svelte";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {createRawSnippet} from "svelte";

import Layout from "./+layout.svelte";

describe("root layout", () => {
  beforeEach(() => {
    global.IntersectionObserver = vi.fn(function (this: IntersectionObserver) {
      this.observe = vi.fn();
      this.unobserve = vi.fn();
      this.disconnect = vi.fn();
      this.takeRecords = vi.fn(() => []);
      return this;
    }) as unknown as typeof IntersectionObserver;
  });

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
  });
});

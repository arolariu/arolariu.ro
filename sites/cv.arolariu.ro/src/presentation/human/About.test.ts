/**
 * @fileoverview Render-smoke tests for the About section.
 *
 * Verifies the biography paragraphs render and the section heading
 * is present. The biography data is pulled from `data/biography.ts`
 * and asserted on a count basis (five-point structure).
 */

import {render} from "@testing-library/svelte";
import {beforeEach, describe, expect, it, vi} from "vitest";

import About from "./About.svelte";

describe("About", () => {
  beforeEach(() => {
    global.IntersectionObserver = vi.fn(function (this: IntersectionObserver) {
      this.observe = vi.fn();
      this.unobserve = vi.fn();
      this.disconnect = vi.fn();
      this.takeRecords = vi.fn(() => []);
      return this;
    }) as unknown as typeof IntersectionObserver;
  });

  it("renders an About heading", () => {
    const {getByRole} = render(About);
    const heading = getByRole("heading", {name: /about/i});
    expect(heading).toBeTruthy();
  });

  it("renders the biography paragraphs", () => {
    const {container} = render(About);
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs.length).toBeGreaterThanOrEqual(5);
  });
});

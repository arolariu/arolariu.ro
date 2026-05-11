/**
 * @fileoverview Render-smoke tests for the Experience timeline.
 *
 * Asserts that the Professional Experience heading renders, at least
 * one timeline item (button[aria-expanded] card) is present, and the
 * most recent Microsoft role surfaces somewhere in the rendered output.
 * Intentionally loose on counts — the exact number of roles is data
 * the test does not import, so this is a structural smoke test, not
 * a content-completeness test.
 */

import {render} from "@testing-library/svelte";
import {beforeEach, describe, expect, it, vi} from "vitest";

import Experience from "./Experience.svelte";

describe("Experience", () => {
  beforeEach(() => {
    global.IntersectionObserver = vi.fn(function (this: IntersectionObserver) {
      this.observe = vi.fn();
      this.unobserve = vi.fn();
      this.disconnect = vi.fn();
      this.takeRecords = vi.fn(() => []);
      return this;
    }) as unknown as typeof IntersectionObserver;
  });

  it("renders the Professional Experience heading", () => {
    const {getByRole} = render(Experience);
    const heading = getByRole("heading", {name: /professional\s+experience/i});
    expect(heading).toBeTruthy();
  });

  it("renders one timeline item per experience entry", () => {
    const {container} = render(Experience);
    const cards = container.querySelectorAll("button[aria-expanded]");
    expect(cards.length).toBeGreaterThan(0);
  });

  it("includes the most recent Microsoft role (M365 AI mentioned somewhere)", () => {
    const {getAllByText} = render(Experience);
    expect(getAllByText(/M365 AI/i).length).toBeGreaterThan(0);
  });
});

/**
 * @fileoverview Render-smoke tests for the Testimonials section.
 *
 * Verifies the section heading + that the testimonial count rendered
 * matches `testimonialsAsArray`.
 */

import {render} from "@testing-library/svelte";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {testimonialsAsArray} from "@/data/testimonials";

import Testimonials from "./Testimonials.svelte";

describe("Testimonials", () => {
  beforeEach(() => {
    global.IntersectionObserver = vi.fn(function (this: IntersectionObserver) {
      this.observe = vi.fn();
      this.unobserve = vi.fn();
      this.disconnect = vi.fn();
      this.takeRecords = vi.fn(() => []);
      return this;
    }) as unknown as typeof IntersectionObserver;
  });

  it("renders the 'Colleagues Say' heading", () => {
    const {getByRole} = render(Testimonials);
    const heading = getByRole("heading", {name: /colleagues\s+say/i});
    expect(heading).toBeTruthy();
  });

  it("renders one blockquote per testimonial entry", () => {
    const {container} = render(Testimonials);
    const quotes = container.querySelectorAll("blockquote");
    expect(quotes).toHaveLength(testimonialsAsArray.length);
  });
});

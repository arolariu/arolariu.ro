/**
 * @fileoverview Render-smoke tests for the Testimonials section.
 *
 * Verifies the section heading + that the testimonial count rendered
 * matches `testimonialsAsArray`.
 */

import {render} from "@testing-library/svelte";
import {describe, expect, it} from "vitest";

import {testimonialsAsArray} from "@/data/testimonials";

import Testimonials from "./Testimonials.svelte";

describe("Testimonials", () => {
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

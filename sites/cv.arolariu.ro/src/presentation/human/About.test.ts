/**
 * @fileoverview Render-smoke tests for the About section.
 *
 * Asserts the section heading renders and at least five `<p>` paragraphs
 * appear in the output. The biography source data lives in
 * `data/biography.ts`, but this test deliberately does not import it —
 * it's a structural smoke test verifying the component renders enough
 * paragraph content, not a content-completeness test against the source.
 */

import {render} from "@testing-library/svelte";
import {describe, expect, it} from "vitest";

import About from "./About.svelte";

describe("About", () => {
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

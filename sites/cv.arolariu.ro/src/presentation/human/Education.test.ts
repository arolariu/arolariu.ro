/**
 * @fileoverview Render-smoke tests for the Education & Certifications section.
 *
 * Verifies both the academic background subsection and the grouped
 * certifications subsection (Microsoft + GitHub) render their headings
 * and eyebrow labels.
 */

import {render} from "@testing-library/svelte";
import {beforeEach, describe, expect, it, vi} from "vitest";

import Education from "./Education.svelte";

describe("Education", () => {
  beforeEach(() => {
    global.IntersectionObserver = vi.fn(function (this: IntersectionObserver) {
      this.observe = vi.fn();
      this.unobserve = vi.fn();
      this.disconnect = vi.fn();
      this.takeRecords = vi.fn(() => []);
      return this;
    }) as unknown as typeof IntersectionObserver;
  });

  it("renders the Education & Certifications level-2 heading", () => {
    const {getByRole} = render(Education);
    const heading = getByRole("heading", {name: /education.*certifications/i, level: 2});
    expect(heading).toBeTruthy();
  });

  it("renders the Academic Background subheading", () => {
    const {getByRole} = render(Education);
    expect(getByRole("heading", {name: /academic\s+background/i, level: 3})).toBeTruthy();
  });

  it("renders the Professional Certifications subheading", () => {
    const {getByRole} = render(Education);
    expect(getByRole("heading", {name: /professional\s+certifications/i, level: 3})).toBeTruthy();
  });

  it("renders the Microsoft and GitHub credential eyebrows", () => {
    const {getAllByText} = render(Education);
    expect(getAllByText(/Microsoft.*credentials/i).length).toBeGreaterThan(0);
    expect(getAllByText(/GitHub.*credentials/i).length).toBeGreaterThan(0);
  });
});

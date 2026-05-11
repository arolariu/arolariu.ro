/**
 * @fileoverview Render-smoke tests for the Contact section.
 *
 * Verifies the section heading + the three contact-info card titles
 * (Location / Email / Website) + the contact form is present.
 */

import {render} from "@testing-library/svelte";
import {beforeEach, describe, expect, it, vi} from "vitest";

import Contact from "./Contact.svelte";

describe("Contact", () => {
  beforeEach(() => {
    global.IntersectionObserver = vi.fn(function (this: IntersectionObserver) {
      this.observe = vi.fn();
      this.unobserve = vi.fn();
      this.disconnect = vi.fn();
      this.takeRecords = vi.fn(() => []);
      return this;
    }) as unknown as typeof IntersectionObserver;
  });

  it("renders the 'Get In Touch' level-2 heading", () => {
    const {getByRole} = render(Contact);
    const heading = getByRole("heading", {name: /get\s+in\s+touch/i, level: 2});
    expect(heading).toBeTruthy();
  });

  it("renders the three contact-info card titles", () => {
    const {getAllByText} = render(Contact);
    expect(getAllByText(/^Location$/i).length).toBeGreaterThan(0);
    expect(getAllByText(/^Email$/i).length).toBeGreaterThan(0);
    expect(getAllByText(/^Website$/i).length).toBeGreaterThan(0);
  });

  it("renders the message form (name + email + message inputs)", () => {
    const {container} = render(Contact);
    const inputs = container.querySelectorAll("input, textarea");
    expect(inputs.length).toBeGreaterThanOrEqual(3);
  });
});

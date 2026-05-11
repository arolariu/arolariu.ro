/**
 * @fileoverview Render-smoke test for the site Footer.
 *
 * Asserts:
 *  - Three external social links (GitHub, LinkedIn, Website) are present,
 *    each opening in a new tab with secure rel attrs.
 *  - Each link carries a non-empty accessible name (aria-label).
 *  - The copyright string from the data layer is rendered.
 */

import {render} from "@testing-library/svelte";
import {describe, expect, it} from "vitest";

import Footer from "./Footer.svelte";

describe("Footer", () => {
  it("renders three external social links", () => {
    const {container} = render(Footer);
    const externalLinks = container.querySelectorAll('a[target="_blank"]');
    expect(externalLinks.length).toBe(3);
    for (const link of externalLinks) {
      expect(link.getAttribute("rel")).toMatch(/noopener/);
      expect(link.getAttribute("rel")).toMatch(/noreferrer/);
    }
  });

  it("each link carries a non-empty aria-label", () => {
    const {container} = render(Footer);
    const links = container.querySelectorAll("a[aria-label]");
    expect(links.length).toBeGreaterThanOrEqual(3);
    for (const link of links) {
      const label = link.getAttribute("aria-label");
      expect(label).toBeTruthy();
      expect(label?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("renders the copyright text", () => {
    const {container} = render(Footer);
    const copyParagraph = container.querySelector("footer p");
    expect(copyParagraph).not.toBeNull();
    expect((copyParagraph?.textContent ?? "").trim().length).toBeGreaterThan(0);
  });
});

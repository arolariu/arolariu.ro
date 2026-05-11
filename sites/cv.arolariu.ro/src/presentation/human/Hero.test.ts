/**
 * @fileoverview Render-smoke tests for the Hero section.
 *
 * Verifies the section renders without throwing in jsdom (the
 * IntersectionObserver mock guards against the setup-file's
 * arrow-function mock that can't be `new`-invoked) and that key
 * editorial content (author name, taglines, CTAs) is present.
 */

import {render} from "@testing-library/svelte";
import {beforeEach, describe, expect, it, vi} from "vitest";

import Hero from "./Hero.svelte";

describe("Hero", () => {
  beforeEach(() => {
    global.IntersectionObserver = vi.fn(function (this: IntersectionObserver) {
      this.observe = vi.fn();
      this.unobserve = vi.fn();
      this.disconnect = vi.fn();
      this.takeRecords = vi.fn(() => []);
      return this;
    }) as unknown as typeof IntersectionObserver;
  });

  it("renders the author's name in the level-1 heading", () => {
    const {getByRole} = render(Hero);
    const heading = getByRole("heading", {name: /Alexandru-Razvan\s+Olariu/i, level: 1});
    expect(heading).toBeTruthy();
  });

  it("renders all three role taglines at least once", () => {
    const {getAllByText} = render(Hero);
    expect(getAllByText(/software engineer/i).length).toBeGreaterThan(0);
    expect(getAllByText(/solution architect/i).length).toBeGreaterThan(0);
    expect(getAllByText(/mentor/i).length).toBeGreaterThan(0);
  });

  it("exposes the two CTAs as links", () => {
    const {getAllByRole} = render(Hero);
    const links = getAllByRole("link");
    const labels = links.map((l) => l.textContent?.trim().toLowerCase() ?? "");
    expect(labels.some((l) => /get in touch/.test(l))).toBe(true);
    expect(labels.some((l) => /view my work/.test(l))).toBe(true);
  });

  it("renders the avatar with intrinsic dimensions and async decoding", () => {
    const {container} = render(Hero);
    const img = container.querySelector("img[src='/author.jpeg']");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("width")).toBe("199");
    expect(img?.getAttribute("height")).toBe("199");
    expect(img?.getAttribute("decoding")).toBe("async");
    expect(img?.getAttribute("fetchpriority")).toBe("high");
  });
});

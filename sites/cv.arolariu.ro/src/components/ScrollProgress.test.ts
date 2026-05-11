/**
 * @fileoverview Render test for ScrollProgress (route-gated visibility).
 *
 * Asserts:
 *  - On routes other than /human, ScrollProgress renders nothing.
 *  - On /human, ScrollProgress renders a <div role="progressbar"> with
 *    ARIA value-min/max set to 0/100.
 *
 * Setup: mutate the $app/state mock's `page.url` before render. The
 * mock exports a mutable `page` object (per Phase 2 follow-up typing).
 */

import {render} from "@testing-library/svelte";
import {beforeEach, describe, expect, it} from "vitest";

import {page} from "../__mocks__/$app/state";
import ScrollProgress from "./ScrollProgress.svelte";

describe("ScrollProgress", () => {
  beforeEach(() => {
    page.url = new URL("https://cv.arolariu.ro/");
  });

  it("renders nothing on routes other than /human", () => {
    page.url = new URL("https://cv.arolariu.ro/");
    const {container} = render(ScrollProgress);
    expect(container.querySelector("div[role='progressbar']")).toBeNull();
  });

  it("renders nothing on /json", () => {
    page.url = new URL("https://cv.arolariu.ro/json");
    const {container} = render(ScrollProgress);
    expect(container.querySelector("div[role='progressbar']")).toBeNull();
  });

  it("renders a progressbar with ARIA bounds on /human", () => {
    page.url = new URL("https://cv.arolariu.ro/human");
    const {container} = render(ScrollProgress);
    const bar = container.querySelector("div[role='progressbar']");
    expect(bar).not.toBeNull();
    expect(bar?.getAttribute("aria-label")).toBe("Page scroll progress");
    expect(bar?.getAttribute("aria-valuemin")).toBe("0");
    expect(bar?.getAttribute("aria-valuemax")).toBe("100");
  });
});

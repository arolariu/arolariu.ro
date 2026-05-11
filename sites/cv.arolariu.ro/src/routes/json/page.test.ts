/**
 * @fileoverview Render-smoke test for the /json route.
 *
 * Asserts that JsonView mounts and surfaces its four key surfaces:
 *  - The four code-sample tab labels (curl, JavaScript, Python, PowerShell).
 *  - At least one <pre>/<code> block (the JSON dump).
 *  - At least one interactive control (copy/download/tab switch button).
 */

import {render} from "@testing-library/svelte";
import {beforeEach, describe, expect, it, vi} from "vitest";

import Page from "./+page.svelte";

describe("/json route", () => {
  beforeEach(() => {
    global.IntersectionObserver = vi.fn(function (this: IntersectionObserver) {
      this.observe = vi.fn();
      this.unobserve = vi.fn();
      this.disconnect = vi.fn();
      this.takeRecords = vi.fn(() => []);
      return this;
    }) as unknown as typeof IntersectionObserver;
  });

  it("mounts without throwing", () => {
    const {container} = render(Page);
    expect(container.firstChild).not.toBeNull();
  });

  it("renders all four code-sample tab labels", () => {
    const {getAllByText} = render(Page);
    expect(getAllByText(/^curl$/i).length).toBeGreaterThan(0);
    expect(getAllByText(/^JavaScript$/).length).toBeGreaterThan(0);
    expect(getAllByText(/^Python$/).length).toBeGreaterThan(0);
    expect(getAllByText(/^PowerShell$/).length).toBeGreaterThan(0);
  });

  it("renders at least one code block containing the JSON dump", () => {
    const {container} = render(Page);
    const codeBlocks = container.querySelectorAll("pre, code");
    expect(codeBlocks.length).toBeGreaterThan(0);
  });

  it("renders at least one button (copy/download/tab)", () => {
    const {container} = render(Page);
    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBeGreaterThan(0);
  });
});

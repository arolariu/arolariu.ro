import {render} from "@testing-library/svelte";
import {beforeEach, describe, expect, it, vi} from "vitest";

import PdfView from "./PdfView.svelte";

describe("PdfView (editorial frame)", () => {
  beforeEach(() => {
    // The setup-file mock uses an arrow function and cannot be `new`-invoked,
    // which breaks any IntersectionObserver wiring. Use a real function so it
    // is constructor-callable.
    global.IntersectionObserver = vi.fn(function (this: IntersectionObserver) {
      this.observe = vi.fn();
      this.unobserve = vi.fn();
      this.disconnect = vi.fn();
      this.takeRecords = vi.fn(() => []);
      return this;
    }) as unknown as typeof IntersectionObserver;
  });

  it("renders the editorial hero with title 'Printable CV'", () => {
    const {getByRole} = render(PdfView);
    const heading = getByRole("heading", {name: /printable\s+cv/i, level: 1});
    expect(heading).toBeTruthy();
  });

  it("renders the eyebrow pill with PDF format metadata", () => {
    const {getByText} = render(PdfView);
    expect(getByText(/PDF.*A4.*ONE\s*PAGE/i)).toBeTruthy();
  });

  it("renders the metadata sidebar with all 5 keyed rows", () => {
    const {container} = render(PdfView);
    const dt = container.querySelectorAll("aside dl dt");
    const dd = container.querySelectorAll("aside dl dd");
    expect(dt).toHaveLength(5);
    expect(dd).toHaveLength(5);
    const labels = Array.from(dt, (el) => el.textContent?.trim().toLowerCase());
    expect(labels).toEqual(expect.arrayContaining(["size", "pages", "updated", "format", "ats"]));
  });

  it("marks the ATS row with a data attribute for visual emphasis", () => {
    const {container} = render(PdfView);
    const atsRow = container.querySelector("[data-pdf-ats]");
    expect(atsRow).toBeTruthy();
  });

  it("renders the 3 sidebar action buttons (Download / Open / Print)", () => {
    const {container} = render(PdfView);
    // Sidebar action buttons live inside the <aside>, not the assistance panel.
    const sidebarButtons = container.querySelectorAll("aside button");
    const labels = Array.from(sidebarButtons, (b) => b.textContent?.trim() ?? "");
    expect(labels.some((l) => /download/i.test(l))).toBe(true);
    expect(labels.some((l) => /open/i.test(l))).toBe(true);
    expect(labels.some((l) => /print/i.test(l))).toBe(true);
  });
});

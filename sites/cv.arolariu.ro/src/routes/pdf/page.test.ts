/**
 * @fileoverview Render-smoke test for the /pdf route.
 *
 * Asserts that PdfView mounts and surfaces the native PDF preview
 * plus the metadata sidebar constants (file size, format, ATS
 * status). These come from src/lib/pdf/pdfViewerState.ts and are
 * the most stable non-stylistic anchors on the page. The download
 * filename constant is verified indirectly via the PDF object's
 * data/aria-label attributes since the filename itself is only
 * applied to a dynamically-created `<a download>` element.
 */

import {render} from "@testing-library/svelte";
import {beforeEach, describe, expect, it, vi} from "vitest";

import Page from "./+page.svelte";

describe("/pdf route", () => {
  beforeEach(() => {
    // PdfView (via AnimatedSection) constructs `new IntersectionObserver(...)`.
    // The global stub in vitest.setup.ts is an arrow function and cannot be
    // called with `new`, so override with a constructor-friendly form here.
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

  it("renders the PDF preview object referencing the CV asset", () => {
    // The download filename (PDF_DOWNLOAD_FILENAME) is only ever used as the
    // `download` attribute on a dynamically-created `<a>` and never rendered
    // as visible text. The stable on-page anchor that identifies the same CV
    // artifact is the native `<object>` element's aria-label/title and its
    // `data` attribute pointing at the CV asset.
    const {container} = render(Page);
    const obj = container.querySelector('object[type="application/pdf"]');
    expect(obj).not.toBeNull();
    expect(obj?.getAttribute("data")).toMatch(/cv\.pdf$/);
    expect(obj?.getAttribute("aria-label")).toMatch(/Alexandru-Razvan Olariu/);
  });

  it("renders the file-size and format-display metadata", () => {
    const {getAllByText} = render(Page);
    expect(getAllByText(/114 KB/).length).toBeGreaterThan(0);
    expect(getAllByText(/A4 PDF/).length).toBeGreaterThan(0);
  });

  it("renders the ATS-compatible status", () => {
    const {getAllByText} = render(Page);
    expect(getAllByText(/Compatible/).length).toBeGreaterThan(0);
  });
});

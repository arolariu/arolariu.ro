import {act, fireEvent, render, screen, within} from "@testing-library/svelte";
import {afterEach, describe, expect, it, vi} from "vitest";

import {PDF_ASSET_URL, PDF_DOWNLOAD_FILENAME, PDF_NATIVE_ASSISTANCE_DELAY_MS} from "../pdf/pdfViewerState";
import PdfView from "./PdfView.svelte";

describe("PdfView (editorial frame)", () => {
  afterEach(() => vi.useRealTimers());

  it("identifies the printable CV and displays its five metadata rows", () => {
    const {container} = render(PdfView);

    expect(screen.getByRole("heading", {name: /printable\s+cv/i, level: 1})).toBeInTheDocument();
    expect(screen.getByText(/PDF.*A4.*ONE\s*PAGE/i)).toBeInTheDocument();
    const dt = container.querySelectorAll("aside dl dt");
    const dd = container.querySelectorAll("aside dl dd");
    expect(dt).toHaveLength(5);
    expect(dd).toHaveLength(5);
    const labels = Array.from(dt, (el) => el.textContent?.trim().toLowerCase());
    expect(labels).toEqual(expect.arrayContaining(["size", "pages", "updated", "format", "ats"]));
    expect(container.querySelector("[data-pdf-ats]")).toHaveTextContent(/ats/i);
  });

  it("sends download, open, and print actions to the browser with the same PDF", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(PdfView);
    const actions = within(screen.getByRole("complementary"));

    await fireEvent.click(actions.getByRole("button", {name: "Download"}));
    await fireEvent.click(actions.getByRole("button", {name: "Open in tab"}));
    await fireEvent.click(actions.getByRole("button", {name: "Print"}));

    expect(click).toHaveBeenCalledOnce();
    const download = click.mock.contexts[0];
    expect(download).toBeInstanceOf(HTMLAnchorElement);
    expect(download).toHaveAttribute("href", PDF_ASSET_URL);
    expect(download).toHaveAttribute("download", PDF_DOWNLOAD_FILENAME);
    expect(open.mock.calls).toEqual([
      [PDF_ASSET_URL, "_blank", "noopener,noreferrer"],
      [PDF_ASSET_URL, "_blank", "noopener,noreferrer"],
    ]);
  });

  it("offers help after a slow load, retries a failed viewer, and clears help on success", async () => {
    vi.useFakeTimers({toFake: ["setTimeout", "clearTimeout"]});
    const {container} = render(PdfView);
    const original = container.querySelector("object");
    if (!original) throw new Error("Missing native PDF preview");
    expect(screen.getByRole("status", {busy: true})).toHaveTextContent("Loading native PDF preview");

    await act(() => vi.advanceTimersByTimeAsync(PDF_NATIVE_ASSISTANCE_DELAY_MS));

    expect(screen.getByRole("status")).toHaveTextContent("Still loading the PDF preview?");

    await fireEvent.error(original);

    expect(screen.getByRole("status")).toHaveTextContent("Native PDF preview unavailable");

    await fireEvent.click(screen.getByRole("button", {name: "Retry Preview"}));

    const retry = container.querySelector("object");
    if (!retry) throw new Error("Missing retry PDF preview");
    expect(retry).not.toBe(original);
    expect(screen.getByRole("status", {busy: true})).toBeInTheDocument();

    await fireEvent.load(retry);
    await act(() => vi.advanceTimersByTimeAsync(PDF_NATIVE_ASSISTANCE_DELAY_MS));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(retry).toHaveAttribute("data", PDF_ASSET_URL);
  });

  it("updates native viewer guidance on a touch-device resize without reloading the document", async () => {
    const width = vi.spyOn(window, "innerWidth", "get").mockReturnValue(1024);
    vi.spyOn(navigator, "maxTouchPoints", "get").mockReturnValue(1);
    const {container} = render(PdfView);
    const original = container.querySelector("object");
    expect(original).toHaveAttribute("data", PDF_ASSET_URL);
    expect(screen.getByText("A traditional resume optimized for printing and ATS pipelines.")).toBeVisible();
    width.mockReturnValue(390);

    await fireEvent.resize(window);

    expect(screen.getByText("Trying your browser's native PDF viewer first.")).toBeVisible();
    expect(container.querySelector("object")).toBe(original);
  });
});

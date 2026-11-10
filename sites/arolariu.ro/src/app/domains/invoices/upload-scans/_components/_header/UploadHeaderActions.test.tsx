/**
 * @fileoverview Tests for the upload-scans header navigation actions.
 * @module app/domains/invoices/upload-scans/_components/_header/UploadHeaderActions.test
 */

import {render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import UploadHeaderActions from "./UploadHeaderActions";

describe("UploadHeaderActions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Base UI logs each development warning once per module, so this must run before other renders.
  it("does not report a Base UI native button mismatch", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<UploadHeaderActions />);

    const messages = consoleError.mock.calls.map((call) => call.map(String).join(" "));
    expect(messages.filter((message) => message.includes("expected a native <button>"))).toEqual([]);
  });

  it.each([
    ["buttons.viewScans", "/domains/invoices/view-scans"],
    ["buttons.myInvoices", "/domains/invoices/view-invoices"],
  ])("renders the %s action as a native navigation link", (labelKey, href) => {
    render(<UploadHeaderActions />);

    const link = screen.getByRole("link", {name: new RegExp(labelKey.replace(".", "\\."))});
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", href);
    expect(link).not.toHaveAttribute("role");
    expect(link).not.toHaveAttribute("type");
  });

  it.each(["buttons.viewScans", "buttons.myInvoices"])("shows the full %s label once instead of a truncated mobile variant", (labelKey) => {
    render(<UploadHeaderActions />);

    const label = `pages.invoices.uploadScans.${labelKey}`;
    const link = screen.getByRole("link", {name: new RegExp(labelKey.replace(".", "\\."))});
    expect(link.textContent).toBe(label);
  });
});

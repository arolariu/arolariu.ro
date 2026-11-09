/**
 * @fileoverview Tests for the view-scans header navigation actions.
 * @module app/domains/invoices/view-scans/_components/ScansHeader.test
 */

import {render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import ScansHeader from "./ScansHeader";

describe("ScansHeader", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Base UI logs each development warning once per module, so this must run before other renders.
  it("does not report a Base UI native button mismatch", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<ScansHeader />);

    const messages = consoleError.mock.calls.map((call) => call.map(String).join(" "));
    expect(messages.filter((message) => message.includes("expected a native <button>"))).toEqual([]);
  });

  it.each([
    [/header\.uploadMore/, "/domains/invoices/upload-scans"],
    [/header\.myInvoices/, "/domains/invoices/view-invoices"],
  ])("renders the %s action as a native navigation link", (name, href) => {
    render(<ScansHeader />);

    const link = screen.getByRole("link", {name});
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", href);
    expect(link).not.toHaveAttribute("role");
    expect(link).not.toHaveAttribute("type");
  });
});

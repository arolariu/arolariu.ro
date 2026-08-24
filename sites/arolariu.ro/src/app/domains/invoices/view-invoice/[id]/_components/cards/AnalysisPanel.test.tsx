/**
 * @fileoverview Unit tests for AnalysisPanel component.
 * @module app/domains/invoices/view-invoice/[id]/_components/cards/AnalysisPanel.test
 *
 * @remarks
 * TDD suite that verifies the panel uses the honest queued model and never
 * renders fabricated progress, stage lists, percentages, or completion copy.
 */

import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../../../tests/helpers";
import {InvoiceContextProvider} from "../../_context/InvoiceContext";
import {AnalysisPanel} from "./AnalysisPanel";

// ── Mock external boundaries ───────────────────────────────────────────────────

vi.mock("../../../../_actions/invoices", () => ({
  analyzeInvoice: vi.fn(),
}));

// ── Typed mock references ──────────────────────────────────────────────────────

const {analyzeInvoice} = await import("../../../../_actions/invoices");
const mockAnalyzeInvoice = vi.mocked(analyzeInvoice);

// ── Fixtures: invoice with no items so the panel renders ──────────────────────

const TEST_INVOICE = TestDataBuilder.build("invoice", {items: []});

function Wrapper(): React.JSX.Element {
  return (
    <InvoiceContextProvider invoice={TEST_INVOICE} merchant={null}>
      <AnalysisPanel />
    </InvoiceContextProvider>
  );
}

// ── Suite ──────────────────────────────────────────────────────────────────────

describe("AnalysisPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── 1. Queued state after submission ──────────────────────────────────────────

  it("shows queued state after submission and never claims completion", async () => {
    mockAnalyzeInvoice.mockReturnValueOnce(TestDataBuilder.actionSuccess("queue-42"));

    render(<Wrapper />);

    // Click re-analyze (key path "...buttons.reanalyze" contains "reanalyze").
    await userEvent.click(screen.getByRole("button", {name: /reanalyze/i}));

    // QueuedAnalysisNotice title key path "dialogs.invoices.queuedAnalysisNotice.title"
    // uniquely identifies the queued state panel via the sibling component test pattern.
    expect(await screen.findByText(/queuedAnalysisNotice\.title/i)).toBeInTheDocument();

    // Must NOT render a progressbar.
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();

    // Must NOT claim analysis is complete or finished.
    expect(screen.queryByText(/complete|finished|analysis is done/i)).not.toBeInTheDocument();
  });

  // ── 2. Panel hidden when invoice has items ────────────────────────────────────

  it("returns null when invoice already has items", () => {
    const invoiceWithItems = TestDataBuilder.build("invoice");
    render(
      <InvoiceContextProvider invoice={invoiceWithItems} merchant={null}>
        <AnalysisPanel />
      </InvoiceContextProvider>,
    );
    // Panel should not render anything (invoice.items.length > 0).
    expect(screen.queryByRole("button", {name: /reanalyze/i})).not.toBeInTheDocument();
  });

  // ── 3. Error state shown inline ────────────────────────────────────────────────

  it("shows an inline error alert when submission fails", async () => {
    mockAnalyzeInvoice.mockReturnValueOnce(
      TestDataBuilder.actionFailure({code: "SERVER_ERROR", message: "Backend unavailable"}),
    );

    render(<Wrapper />);
    await userEvent.click(screen.getByRole("button", {name: /reanalyze/i}));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});

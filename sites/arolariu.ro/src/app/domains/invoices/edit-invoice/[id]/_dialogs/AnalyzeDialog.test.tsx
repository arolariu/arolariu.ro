/**
 * @fileoverview Unit tests for AnalyzeDialog component.
 * @module app/domains/invoices/edit-invoice/[id]/_dialogs/AnalyzeDialog.test
 *
 * @remarks
 * TDD suite that verifies the dialog uses the honest queued model and never
 * renders fabricated progress or completion messaging.
 */

import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {DialogProvider, useDialogs} from "@/app/domains/invoices/_contexts/DialogContext";
import {TestDataBuilder} from "../../../../../../../tests/helpers";
import AnalyzeDialog from "./AnalyzeDialog";

// ── Mock external boundaries ───────────────────────────────────────────────────

vi.mock("../../../_actions/invoices", () => ({
  analyzeInvoice: vi.fn(),
}));

// ── Typed mock references ──────────────────────────────────────────────────────

const {analyzeInvoice} = await import("../../../_actions/invoices");
const mockAnalyzeInvoice = vi.mocked(analyzeInvoice);

// ── Fixtures ───────────────────────────────────────────────────────────────────

const TEST_INVOICE = TestDataBuilder.build("invoice", {items: []});

// ── Test harness: provides DialogProvider and opens the dialog ─────────────────

function OpenAnalyzeDialog(): React.JSX.Element {
  const {openDialog} = useDialogs();
  return (
    <>
      <button
        type="button"
        onClick={() => openDialog("EDIT_INVOICE__ANALYSIS", "view", {invoice: TEST_INVOICE})}>
        Open
      </button>
      <AnalyzeDialog />
    </>
  );
}

function Wrapper(): React.JSX.Element {
  return (
    <DialogProvider>
      <OpenAnalyzeDialog />
    </DialogProvider>
  );
}

// ── Suite ──────────────────────────────────────────────────────────────────────

describe("AnalyzeDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── 1. Queued state after submission — the core contract ───────────────────────

  it("shows queued state after submission and never claims completion", async () => {
    mockAnalyzeInvoice.mockReturnValueOnce(TestDataBuilder.actionSuccess("queue-42"));

    render(<Wrapper />);

    // Open the dialog.
    await userEvent.click(screen.getByRole("button", {name: /open/i}));

    // Submit via the Start Analysis button (key path "...buttons.startAnalysis" uniquely identifies it).
    await userEvent.click(screen.getByRole("button", {name: /startAnalysis/i}));

    // QueuedAnalysisNotice title key path "dialogs.invoices.queuedAnalysisNotice.title" uniquely
    // identifies the queued state panel; the sibling component tests use this same pattern.
    expect(await screen.findByText(/queuedAnalysisNotice\.title/i)).toBeInTheDocument();

    // Must NOT render a progressbar.
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();

    // Must NOT claim analysis is complete or finished.
    expect(screen.queryByText(/complete|finished|analysis is done/i)).not.toBeInTheDocument();
  });

  // ── 2. Error state shown inline — no fabricated success ───────────────────────

  it("shows an inline error alert when submission fails", async () => {
    mockAnalyzeInvoice.mockReturnValueOnce(
      TestDataBuilder.actionFailure({code: "SERVER_ERROR", message: "Backend unavailable"}),
    );

    render(<Wrapper />);
    await userEvent.click(screen.getByRole("button", {name: /open/i}));
    await userEvent.click(screen.getByRole("button", {name: /startAnalysis/i}));

    // An error alert must appear.
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    // Still no progressbar.
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  // ── 3. Controls rendered when idle ────────────────────────────────────────────

  it("renders analysis controls when dialog is open and idle", async () => {
    render(<Wrapper />);
    await userEvent.click(screen.getByRole("button", {name: /open/i}));

    // Profile radios from InvoiceAnalysisControls should be present.
    expect(screen.getAllByRole("radio").length).toBeGreaterThan(0);
  });
});

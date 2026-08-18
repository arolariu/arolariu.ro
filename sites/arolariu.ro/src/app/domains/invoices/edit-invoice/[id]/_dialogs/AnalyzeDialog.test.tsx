/**
 * @fileoverview Real-module integration tests for the durable analysis dialog lifecycle.
 * @module app/domains/invoices/edit-invoice/[id]/_dialogs/AnalyzeDialog.test
 */

import {useDialogs} from "@/app/domains/invoices/_contexts/DialogContext";
import {mockInvoice} from "@/data/mocks";
import {ANALYSIS_API_URL, getAnalysisApiRequests, installAnalysisFetchHandler} from "@/../tests/helpers/analysisBoundary";
import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {useState} from "react";
import {beforeEach, describe, expect, it} from "vitest";
import {AnalysisTestProvider} from "../../../../../../../tests/helpers/analysis";
import {DialogProvider} from "../../../_contexts/DialogContext";
import AnalyzeDialog from "./AnalyzeDialog";

const firstInvoiceIdentifier = "11111111-1111-4111-8111-111111111111";
const secondInvoiceIdentifier = "33333333-3333-4333-8333-333333333333";
const firstInvoice = {...mockInvoice, id: firstInvoiceIdentifier};
const secondInvoice = {...mockInvoice, id: secondInvoiceIdentifier};

function acceptedResponse(invoiceIdentifier: string): Response {
  return new Response(
    JSON.stringify({
      runId: `aaaaaaaa-aaaa-4aaa-8aaa-${invoiceIdentifier.replaceAll(/-/gu, "").slice(-12)}`,
      targetType: "invoice",
      targetId: invoiceIdentifier,
      status: "queued",
      profile: "comprehensive",
      acceptedCapabilities: [
        "documentExtraction",
        "merchantResolution",
        "invoiceSummary",
        "productClassification",
        "allergenAssessment",
        "invoiceClassification",
        "recipeGeneration",
      ],
      acceptedAt: "2026-08-17T19:40:42.187Z",
    }),
    {status: 202, statusText: "Accepted"},
  );
}

function DialogScenario(): React.JSX.Element {
  const {currentDialog, closeDialog, openDialog} = useDialogs();
  const [invoice, setInvoice] = useState(firstInvoice);
  const isAnalyzeDialogOpen = currentDialog.type === "EDIT_INVOICE__ANALYSIS";

  return (
    <>
      <button
        type='button'
        aria-label='Open invoice analysis'
        onClick={() => openDialog("EDIT_INVOICE__ANALYSIS", "view", {invoice})}>
        Open
      </button>
      <button
        type='button'
        aria-label='Switch analysis target'
        onClick={() => {
          closeDialog();
          setInvoice(secondInvoice);
        }}>
        Switch
      </button>
      {isAnalyzeDialogOpen ? <AnalyzeDialog /> : null}
    </>
  );
}

function renderDialogScenario(): void {
  render(
    <AnalysisTestProvider>
      <DialogProvider>
        <DialogScenario />
      </DialogProvider>
    </AnalysisTestProvider>,
  );
}

describe("AnalyzeDialog", () => {
  beforeEach(() => {
    installAnalysisFetchHandler((requestAtBoundary) => {
      const targetIdentifier = requestAtBoundary.url.includes(secondInvoiceIdentifier) ? secondInvoiceIdentifier : firstInvoiceIdentifier;
      return acceptedResponse(targetIdentifier);
    });
  });

  it("moves focus into the dialog and resets form state when reopened", async () => {
    // Arrange
    const user = userEvent.setup();
    renderDialogScenario();

    // Act
    await user.click(screen.getByRole("button", {name: "Open invoice analysis"}));

    // Assert
    const dialog = await screen.findByRole("dialog");
    const activeElement = document.activeElement;
    expect(activeElement).toBeInstanceOf(HTMLElement);
    if (activeElement instanceof HTMLElement) {
      expect(dialog).toContainElement(activeElement);
    }
    await user.click(screen.getByRole("radio", {name: "Fast"}));
    expect(screen.getByRole("radio", {name: "Fast"})).toBeChecked();
    await user.click(screen.getByRole("button", {name: "Close"}));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Act
    await user.click(screen.getByRole("button", {name: "Open invoice analysis"}));

    // Assert
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("radio", {name: "Comprehensive"})).toBeChecked();
  });

  it("uses a fresh target scope after the dialog target changes", async () => {
    // Arrange
    const user = userEvent.setup();
    renderDialogScenario();

    // Act
    await user.click(screen.getByRole("button", {name: "Switch analysis target"}));
    await user.click(screen.getByRole("button", {name: "Open invoice analysis"}));
    await user.click(screen.getByRole("button", {name: "Start analysis"}));

    // Assert
    await waitFor(() => {
      expect(getAnalysisApiRequests()).toEqual([
        expect.objectContaining({
          url: `${ANALYSIS_API_URL}/rest/v1/invoices/${secondInvoiceIdentifier}/analyze`,
          init: expect.objectContaining({method: "POST"}),
        }),
      ]);
    });
  });
});

/**
 * @fileoverview Real-module integration tests for the honest invoice analysis panel.
 * @module app/domains/invoices/view-invoice/[id]/_components/cards/AnalysisPanel.test
 */

import {ANALYSIS_API_URL, getAnalysisApiRequests, installAnalysisFetchHandler} from "@/../tests/helpers/analysisBoundary";
import {mockInvoice} from "@/data/mocks";
import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it} from "vitest";
import {AnalysisTestProvider} from "../../../../../../../../tests/helpers/analysis";
import {InvoiceContextProvider} from "../../_context/InvoiceContext";
import {AnalysisPanel} from "./AnalysisPanel";

const invoiceIdentifier = "11111111-1111-4111-8111-111111111111";
const invoice = {...mockInvoice, id: invoiceIdentifier};
const acceptedResponse = {
  runId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
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
} as const;

function renderPanel(): void {
  render(
    <AnalysisTestProvider>
      <InvoiceContextProvider
        invoice={invoice}
        merchant={null}>
        <AnalysisPanel />
      </InvoiceContextProvider>
    </AnalysisTestProvider>,
  );
}

describe("AnalysisPanel", () => {
  beforeEach(() => {
    installAnalysisFetchHandler(() => new Response(JSON.stringify(acceptedResponse), {status: 202, statusText: "Accepted"}));
  });

  it("announces accepted enqueueing without showing fake worker progress", async () => {
    // Arrange
    const user = userEvent.setup();
    renderPanel();

    // Act
    await user.click(screen.getByRole("button", {name: "Start analysis"}));

    // Assert
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Analysis started. Results will appear after the page refreshes.");
    });
    expect(getAnalysisApiRequests()).toEqual([
      expect.objectContaining({
        url: `${ANALYSIS_API_URL}/rest/v1/invoices/${invoiceIdentifier}/analyze`,
        init: expect.objectContaining({method: "POST"}),
      }),
    ]);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByText(/preparing document|running OCR|finalizing results|%/iu)).not.toBeInTheDocument();
  });

  it("reports enqueue rejection without claiming analysis completion", async () => {
    // Arrange
    const user = userEvent.setup();
    installAnalysisFetchHandler(() => new Response(null, {status: 503, statusText: "Service Unavailable"}));
    renderPanel();

    // Act
    await user.click(screen.getByRole("button", {name: "Start analysis"}));

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Analysis could not be started")).toBeInTheDocument();
    });
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});

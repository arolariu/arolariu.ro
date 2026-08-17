/**
 * @fileoverview Real-module tests for linked-merchant analysis controls.
 * @module app/domains/invoices/view-invoice/[id]/_components/cards/MerchantInfoCard.test
 */

import {ANALYSIS_API_URL, getAnalysisApiRequests, installAnalysisFetchHandler} from "@/../tests/helpers/analysisBoundary";
import {mockInvoice, mockMerchant} from "@/data/mocks";
import {useInvoicesStore} from "@/stores/invoicesStore";
import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {AnalysisTestProvider} from "../../../../../../../../tests/helpers/analysis";
import {InvoiceContextProvider} from "../../_context/InvoiceContext";
import {MerchantInfoCard} from "./MerchantInfoCard";

const invoiceIdentifier = "11111111-1111-4111-8111-111111111111";
const merchantIdentifier = "22222222-2222-4222-8222-222222222222";
const merchant = {...mockMerchant, id: merchantIdentifier};
const invoice = {...mockInvoice, id: invoiceIdentifier, merchantReference: merchantIdentifier};
const acceptedResponse = {
  runId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  targetType: "merchant",
  targetId: merchantIdentifier,
  status: "queued",
  profile: "comprehensive",
  acceptedCapabilities: ["merchantClassification", "descriptionGeneration"],
  acceptedAt: "2026-08-17T19:40:42.187Z",
} as const;

function renderMerchantCard(linkedMerchant: typeof merchant | null): void {
  render(
    <AnalysisTestProvider>
      <InvoiceContextProvider
        invoice={invoice}
        merchant={linkedMerchant}>
        <MerchantInfoCard />
      </InvoiceContextProvider>
    </AnalysisTestProvider>,
  );
}

describe("MerchantInfoCard analysis integration", () => {
  beforeEach(() => {
    useInvoicesStore.getState().setEntities([invoice]);
    installAnalysisFetchHandler(() => new Response(JSON.stringify(acceptedResponse), {status: 202, statusText: "Accepted"}));
  });

  afterEach(() => {
    useInvoicesStore.getState().clearEntities();
  });

  it("does not expose merchant analysis without a linked merchant", () => {
    // Act
    renderMerchantCard(null);

    // Assert
    expect(screen.queryByRole("heading", {name: "Merchant analysis"})).not.toBeInTheDocument();
    expect(screen.queryByRole("button", {name: "Start analysis"})).not.toBeInTheDocument();
  });

  it("submits the linked merchant identifier through the real analysis form", async () => {
    // Arrange
    const user = userEvent.setup();
    renderMerchantCard(merchant);

    // Act
    await user.click(screen.getByRole("button", {name: "Start analysis"}));

    // Assert
    await waitFor(() => {
      expect(getAnalysisApiRequests()).toEqual([
        expect.objectContaining({
          url: `${ANALYSIS_API_URL}/rest/v1/merchants/${merchantIdentifier}/analyze`,
          init: expect.objectContaining({method: "POST"}),
        }),
      ]);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Analysis started. Results will appear after the page refreshes.");
  });
});

/**
 * @fileoverview Integration tests for linked-merchant analysis controls.
 * @module app/domains/invoices/view-invoice/[id]/_components/cards/MerchantInfoCard.test
 */

import {mockInvoice, mockMerchant} from "@/data/mocks";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {fetchWithTimeout} from "@/lib/utils.server";
import {useInvoicesStore} from "@/stores/invoicesStore";
import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
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
const stubFetchBffUser = vi.mocked(fetchBFFUserFromAuthService);
const stubFetchWithTimeout = vi.mocked(fetchWithTimeout);

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
    vi.clearAllMocks();
    useInvoicesStore.getState().setEntities([invoice]);
    stubFetchBffUser.mockResolvedValue({userIdentifier: "user-1", userJwt: "jwt-1", user: null});
    stubFetchWithTimeout.mockResolvedValue(new Response(JSON.stringify(acceptedResponse), {status: 202, statusText: "Accepted"}));
  });

  afterEach(() => {
    useInvoicesStore.getState().clearEntities();
  });

  it("does not expose merchant analysis without a linked merchant", () => {
    // Act
    renderMerchantCard(null);

    // Assert
    expect(screen.queryByRole("heading", {name: "forms.invoices.analysis.merchant.title"})).not.toBeInTheDocument();
    expect(screen.queryByRole("button", {name: "forms.invoices.analysis.buttons.start"})).not.toBeInTheDocument();
  });

  it("submits the linked merchant identifier through the real analysis form", async () => {
    // Arrange
    const user = userEvent.setup();
    renderMerchantCard(merchant);

    // Act
    await user.click(screen.getByRole("button", {name: "forms.invoices.analysis.buttons.start"}));

    // Assert
    await waitFor(() => {
      expect(stubFetchWithTimeout).toHaveBeenCalledWith(
        `/rest/v1/merchants/${merchantIdentifier}/analyze`,
        expect.objectContaining({method: "POST"}),
        15_000,
      );
    });
    expect(screen.getByRole("status")).toHaveTextContent("forms.invoices.analysis.status.queued");
  });
});

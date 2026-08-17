/**
 * @fileoverview Integration tests for the honest invoice analysis panel.
 * @module app/domains/invoices/view-invoice/[id]/_components/cards/AnalysisPanel.test
 */

import {mockInvoice} from "@/data/mocks";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {fetchWithTimeout} from "@/lib/utils.server";
import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
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
const stubFetchBffUser = vi.mocked(fetchBFFUserFromAuthService);
const stubFetchWithTimeout = vi.mocked(fetchWithTimeout);

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
    vi.clearAllMocks();
    stubFetchBffUser.mockResolvedValue({userIdentifier: "user-1", userJwt: "jwt-1", user: null});
    stubFetchWithTimeout.mockResolvedValue(new Response(JSON.stringify(acceptedResponse), {status: 202, statusText: "Accepted"}));
  });

  it("announces accepted enqueueing without showing fake worker progress", async () => {
    // Arrange
    const user = userEvent.setup();
    renderPanel();

    // Act
    await user.click(screen.getByRole("button", {name: "forms.invoices.analysis.buttons.start"}));

    // Assert
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("forms.invoices.analysis.status.queued");
    });
    expect(stubFetchWithTimeout).toHaveBeenCalledWith(
      `/rest/v1/invoices/${invoiceIdentifier}/analyze`,
      expect.objectContaining({method: "POST"}),
      15_000,
    );
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByText(/preparing document|running OCR|finalizing results|%/iu)).not.toBeInTheDocument();
  });

  it("reports enqueue rejection without claiming analysis completion", async () => {
    // Arrange
    const user = userEvent.setup();
    stubFetchWithTimeout.mockResolvedValue(new Response(null, {status: 503, statusText: "Service Unavailable"}));
    renderPanel();

    // Act
    await user.click(screen.getByRole("button", {name: "forms.invoices.analysis.buttons.start"}));

    // Assert
    await waitFor(() => {
      expect(screen.getByText("toasts.invoices.analysis.failed.title")).toBeInTheDocument();
    });
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});

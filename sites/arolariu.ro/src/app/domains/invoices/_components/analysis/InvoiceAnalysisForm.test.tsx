/**
 * @fileoverview Real-module tests for the invoice analysis form.
 * @module app/domains/invoices/_components/analysis/InvoiceAnalysisForm.test
 */

import {
  ANALYSIS_API_URL,
  getAnalysisApiRequests,
  installAnalysisFetchHandler,
  type AnalysisFetchRequest,
} from "@/../tests/helpers/analysisBoundary";
import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it} from "vitest";
import {AnalysisTestProvider} from "../../../../../../tests/helpers/analysis";
import {InvoiceAnalysisForm} from "./InvoiceAnalysisForm";

const invoiceIdentifier = "11111111-1111-4111-8111-111111111111";
const response = {
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

function getOnlyApiRequest(): AnalysisFetchRequest {
  const requestAtBoundary = getAnalysisApiRequests()[0];
  if (!requestAtBoundary) {
    throw new Error("Expected the form to submit through the real API boundary.");
  }

  return requestAtBoundary;
}

describe("InvoiceAnalysisForm", () => {
  beforeEach(() => {
    installAnalysisFetchHandler(() => new Response(JSON.stringify(response), {status: 202, statusText: "Accepted"}));
  });

  it("uses accessible fieldsets, defaults to comprehensive, and announces accepted analysis", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <AnalysisTestProvider>
        <InvoiceAnalysisForm invoiceIdentifier={invoiceIdentifier} />
      </AnalysisTestProvider>,
    );

    // Assert
    expect(screen.getByRole("group", {name: "Analysis profile"})).toBeInTheDocument();
    expect(screen.getByRole("group", {name: "Invoice analysis capabilities"})).toBeInTheDocument();
    expect(screen.getByRole("radio", {name: "Comprehensive"})).toBeChecked();

    // Act
    await user.click(screen.getByRole("button", {name: "Start analysis"}));

    // Assert
    await waitFor(() => {
      expect(getOnlyApiRequest()).toMatchObject({
        url: `${ANALYSIS_API_URL}/rest/v1/invoices/${invoiceIdentifier}/analyze`,
        init: expect.objectContaining({method: "POST"}),
      });
    });
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("status")).toHaveTextContent("Analysis started. Results will appear after the page refreshes.");
  });

  it("does not render simulated stages or percentage progress", () => {
    // Arrange
    render(
      <AnalysisTestProvider>
        <InvoiceAnalysisForm invoiceIdentifier={invoiceIdentifier} />
      </AnalysisTestProvider>,
    );

    // Assert
    expect(screen.queryByText(/preparing document|running OCR|finalizing results/iu)).not.toBeInTheDocument();
    expect(screen.queryByText(/%/u)).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("preserves a valid profile when a hostile DOM value is dispatched", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <AnalysisTestProvider>
        <InvoiceAnalysisForm invoiceIdentifier={invoiceIdentifier} />
      </AnalysisTestProvider>,
    );
    const fastProfile = screen.getByRole("radio", {name: "Fast"});
    await user.click(fastProfile);

    // Act
    fireEvent.change(fastProfile, {target: {value: "unexpected-profile"}});
    await user.click(screen.getByRole("button", {name: "Start analysis"}));

    // Assert
    await waitFor(() => {
      expect(getAnalysisApiRequests()).toHaveLength(1);
    });
    expect(getOnlyApiRequest().init?.body).toBe(JSON.stringify({profile: "fast", overrides: {}}));
  });

  it("enforces dependent capability closure and disables the final enabled control", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <AnalysisTestProvider>
        <InvoiceAnalysisForm invoiceIdentifier={invoiceIdentifier} />
      </AnalysisTestProvider>,
    );
    await user.click(screen.getByRole("radio", {name: "Fast"}));

    // Act
    await user.click(screen.getByRole("checkbox", {name: "Document extraction"}));
    await user.click(screen.getByRole("checkbox", {name: "Merchant resolution"}));
    await user.click(screen.getByRole("checkbox", {name: "Product classification"}));

    // Assert
    expect(screen.getByRole("checkbox", {name: "Allergen assessment"})).not.toBeChecked();
    expect(screen.getByRole("checkbox", {name: "Recipe generation"})).not.toBeChecked();
    expect(screen.getByRole("checkbox", {name: "Invoice classification"})).toBeDisabled();
  });
});

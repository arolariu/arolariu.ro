/**
 * @fileoverview Unit tests for the invoice analysis form.
 * @module app/domains/invoices/_components/analysis/InvoiceAnalysisForm.test
 */

import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {fetchWithTimeout} from "@/lib/utils.server";
import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
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
const stubFetchBffUser = vi.mocked(fetchBFFUserFromAuthService);
const stubFetchWithTimeout = vi.mocked(fetchWithTimeout);
const labels = {
  allergenAssessment: "forms.invoices.analysis.capabilities.allergenAssessment",
  capabilities: "forms.invoices.analysis.invoice.capabilitiesLegend",
  documentExtraction: "forms.invoices.analysis.capabilities.documentExtraction",
  fast: "forms.invoices.analysis.profiles.fast",
  invoiceClassification: "forms.invoices.analysis.capabilities.invoiceClassification",
  merchantResolution: "forms.invoices.analysis.capabilities.merchantResolution",
  profile: "forms.invoices.analysis.invoice.profileLegend",
  productClassification: "forms.invoices.analysis.capabilities.productClassification",
  recipeGeneration: "forms.invoices.analysis.capabilities.recipeGeneration",
  start: "forms.invoices.analysis.buttons.start",
} as const;

describe("InvoiceAnalysisForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubFetchBffUser.mockResolvedValue({userIdentifier: "user-1", userJwt: "jwt-1", user: null});
    stubFetchWithTimeout.mockResolvedValue(new Response(JSON.stringify(response), {status: 202, statusText: "Accepted"}));
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
    expect(screen.getByRole("group", {name: labels.profile})).toBeInTheDocument();
    expect(screen.getByRole("group", {name: labels.capabilities})).toBeInTheDocument();
    expect(screen.getByRole("radio", {name: "forms.invoices.analysis.profiles.comprehensive"})).toBeChecked();

    // Act
    await user.click(screen.getByRole("button", {name: labels.start}));

    // Assert
    await waitFor(() => {
      expect(stubFetchWithTimeout).toHaveBeenCalledWith(
        `/rest/v1/invoices/${invoiceIdentifier}/analyze`,
        expect.objectContaining({method: "POST"}),
        15_000,
      );
    });
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("status")).toHaveTextContent("forms.invoices.analysis.status.queued");
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
    const fastProfile = screen.getByRole("radio", {name: labels.fast});
    await user.click(fastProfile);

    // Act
    fireEvent.change(fastProfile, {target: {value: "unexpected-profile"}});
    await user.click(screen.getByRole("button", {name: labels.start}));

    // Assert
    await waitFor(() => {
      expect(stubFetchWithTimeout).toHaveBeenCalledOnce();
    });
    const requestOptions = stubFetchWithTimeout.mock.calls[0]?.[1];
    expect(typeof requestOptions?.body).toBe("string");
    if (typeof requestOptions?.body === "string") {
      expect(JSON.parse(requestOptions.body) as unknown).toEqual({profile: "fast", overrides: {}});
    }
  });

  it("enforces dependent capability closure and disables the final enabled control", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <AnalysisTestProvider>
        <InvoiceAnalysisForm invoiceIdentifier={invoiceIdentifier} />
      </AnalysisTestProvider>,
    );
    await user.click(screen.getByRole("radio", {name: labels.fast}));

    // Act
    await user.click(screen.getByRole("checkbox", {name: labels.documentExtraction}));
    await user.click(screen.getByRole("checkbox", {name: labels.merchantResolution}));
    await user.click(screen.getByRole("checkbox", {name: labels.productClassification}));

    // Assert
    expect(screen.getByRole("checkbox", {name: labels.allergenAssessment})).not.toBeChecked();
    expect(screen.getByRole("checkbox", {name: labels.recipeGeneration})).not.toBeChecked();
    expect(screen.getByRole("checkbox", {name: labels.invoiceClassification})).toBeDisabled();
  });
});

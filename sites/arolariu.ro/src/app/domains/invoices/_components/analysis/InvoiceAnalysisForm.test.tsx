/**
 * @fileoverview Unit tests for the invoice analysis form.
 * @module app/domains/invoices/_components/analysis/InvoiceAnalysisForm.test
 */

import type {AnalysisAcceptedResponse} from "@/types/invoices";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {InvoiceAnalysisForm} from "./InvoiceAnalysisForm";

vi.mock("../../_actions/invoices", () => ({
  analyzeInvoice: vi.fn(),
}));

vi.mock("next-intl-selector", () => ({
  useTranslations:
    () =>
    (
      selector: (messages: {
        forms: {
          invoices: {
            analysis: {
              buttons: {start: string; submitting: string};
              capabilities: {
                allergenAssessment: string;
                documentExtraction: string;
                invoiceClassification: string;
                invoiceSummary: string;
                merchantResolution: string;
                productClassification: string;
                recipeGeneration: string;
              };
              descriptions: {invoice: string; profiles: string};
              invoice: {capabilitiesLegend: string; profileLegend: string; title: string};
              profiles: {balanced: string; comprehensive: string; fast: string};
              status: {queued: string; submitting: string};
            };
          };
        };
        toasts: {
          invoices: {
            analysis: {
              failed: {description: string; title: string};
              started: {description: string; title: string};
            };
          };
        };
      }) => string,
    ) =>
      selector({
        forms: {
          invoices: {
            analysis: {
              buttons: {start: "Start analysis", submitting: "Submitting request"},
              capabilities: {
                allergenAssessment: "Allergen assessment",
                documentExtraction: "Document extraction",
                invoiceClassification: "Invoice classification",
                invoiceSummary: "Invoice summary",
                merchantResolution: "Merchant resolution",
                productClassification: "Product classification",
                recipeGeneration: "Recipe generation",
              },
              descriptions: {invoice: "Choose what the queued analysis should include.", profiles: "Choose a published profile."},
              invoice: {capabilitiesLegend: "Invoice analysis capabilities", profileLegend: "Analysis profile", title: "Invoice analysis"},
              profiles: {balanced: "Balanced", comprehensive: "Comprehensive", fast: "Fast"},
              status: {
                queued: "Analysis started. Results appear after the page refreshes.",
                submitting: "Submitting analysis request.",
              },
            },
          },
        },
        toasts: {
          invoices: {
            analysis: {
              failed: {description: "Please try again.", title: "Analysis could not be started"},
              started: {description: "The request is queued.", title: "Analysis started"},
            },
          },
        },
      }),
}));

const {analyzeInvoice} = await import("../../_actions/invoices");
const mockAnalyzeInvoice = vi.mocked(analyzeInvoice);

const invoiceIdentifier = "11111111-1111-4111-8111-111111111111";
const response: AnalysisAcceptedResponse = {
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
};

describe("InvoiceAnalysisForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAnalyzeInvoice.mockResolvedValue({success: true, data: response});
  });

  it("uses accessible fieldsets, defaults to comprehensive, and announces accepted analysis", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<InvoiceAnalysisForm invoiceIdentifier={invoiceIdentifier} />);

    // Assert
    expect(screen.getByRole("group", {name: "Analysis profile"})).toBeInTheDocument();
    expect(screen.getByRole("group", {name: "Invoice analysis capabilities"})).toBeInTheDocument();
    expect(screen.getByRole("radio", {name: "Comprehensive"})).toBeChecked();

    // Act
    await user.click(screen.getByRole("button", {name: "Start analysis"}));

    // Assert
    expect(mockAnalyzeInvoice).toHaveBeenCalledWith({
      invoiceIdentifier,
      request: {profile: "comprehensive", overrides: {}},
    });
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("status")).toHaveTextContent("Analysis started. Results appear after the page refreshes.");
  });

  it("does not render simulated stages or percentage progress", () => {
    // Arrange
    render(<InvoiceAnalysisForm invoiceIdentifier={invoiceIdentifier} />);

    // Assert
    expect(screen.queryByText(/preparing document|running OCR|finalizing results/iu)).not.toBeInTheDocument();
    expect(screen.queryByText(/%/u)).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});

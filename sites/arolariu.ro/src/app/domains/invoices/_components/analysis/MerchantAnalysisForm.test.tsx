/**
 * @fileoverview Unit tests for the merchant analysis form.
 * @module app/domains/invoices/_components/analysis/MerchantAnalysisForm.test
 */

import type {AnalysisAcceptedResponse} from "@/types/invoices";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {MerchantAnalysisForm} from "./MerchantAnalysisForm";

vi.mock("../../_actions/merchants", () => ({
  analyzeMerchant: vi.fn(),
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
              descriptions: {merchant: string; profiles: string};
              merchant: {capabilitiesLegend: string; profileLegend: string; title: string};
              merchantCapabilities: {descriptionGeneration: string; naceClassification: string};
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
              descriptions: {merchant: "Choose the merchant details to analyze.", profiles: "Choose a published profile."},
              merchant: {
                capabilitiesLegend: "Merchant analysis capabilities",
                profileLegend: "Analysis profile",
                title: "Merchant analysis",
              },
              merchantCapabilities: {
                descriptionGeneration: "Generate merchant description",
                naceClassification: "NACE classification",
              },
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

const {analyzeMerchant} = await import("../../_actions/merchants");
const mockAnalyzeMerchant = vi.mocked(analyzeMerchant);

const merchantIdentifier = "22222222-2222-4222-8222-222222222222";
const response: AnalysisAcceptedResponse = {
  runId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  targetType: "merchant",
  targetId: merchantIdentifier,
  status: "queued",
  profile: "comprehensive",
  acceptedCapabilities: ["merchantClassification", "descriptionGeneration"],
  acceptedAt: "2026-08-17T19:40:42.187Z",
};

describe("MerchantAnalysisForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAnalyzeMerchant.mockResolvedValue({success: true, data: response});
  });

  it("exposes only NACE and description overrides with accessible fieldsets", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<MerchantAnalysisForm merchantIdentifier={merchantIdentifier} />);

    // Assert
    expect(screen.getByRole("group", {name: "Analysis profile"})).toBeInTheDocument();
    expect(screen.getByRole("group", {name: "Merchant analysis capabilities"})).toBeInTheDocument();
    expect(screen.getByRole("checkbox", {name: "NACE classification"})).toBeChecked();
    expect(screen.getByRole("checkbox", {name: "Generate merchant description"})).toBeChecked();
    expect(screen.queryByRole("checkbox", {name: "Document extraction"})).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", {name: "Product classification"})).not.toBeInTheDocument();

    // Act
    await user.click(screen.getByRole("checkbox", {name: "NACE classification"}));
    await user.click(screen.getByRole("button", {name: "Start analysis"}));

    // Assert
    expect(mockAnalyzeMerchant).toHaveBeenCalledWith({
      merchantIdentifier,
      request: {
        profile: "comprehensive",
        overrides: {merchantClassification: {enabled: false}},
      },
    });
    expect(screen.getByRole("status")).toHaveTextContent("Analysis started. Results appear after the page refreshes.");
  });
});

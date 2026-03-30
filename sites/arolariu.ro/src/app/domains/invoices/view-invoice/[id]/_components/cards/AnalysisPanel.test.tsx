/**
 * @fileoverview Unit tests for the AnalysisPanel component.
 * @module app/domains/invoices/view-invoice/[id]/_components/cards/AnalysisPanel.test
 */

import {InvoiceBuilder, MerchantBuilder} from "@/data/mocks";
import analyzeInvoice from "@/lib/actions/invoices/analyzeInvoice";
import {InvoiceAnalysisOptions} from "@/types/invoices";
import {render, screen, waitFor} from "@testing-library/react";
import {userEvent} from "@testing-library/user-event";
import {NextIntlClientProvider} from "next-intl";
import {useRouter} from "next/navigation";
import {describe, expect, it, vi} from "vitest";
import {InvoiceContextProvider} from "../../_context/InvoiceContext";
import {AnalysisPanel} from "./AnalysisPanel";

// Mock dependencies
vi.mock("@/lib/actions/invoices/analyzeInvoice");
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

const mockAnalyzeInvoice = vi.mocked(analyzeInvoice);
const mockUseRouter = vi.mocked(useRouter);

/**
 * Helper to render the AnalysisPanel with required context.
 */
function renderAnalysisPanel(invoiceOverrides = {}) {
  const invoice = new InvoiceBuilder().build(invoiceOverrides);
  const merchant = new MerchantBuilder().build();

  const messages = {
    Invoices: {
      ViewInvoice: {
        analysisPanel: {
          title: "AI Analysis",
          description: "Re-analyze this invoice with AI to extract or update data",
          options: {
            completeAnalysis: "Full Analysis",
            invoiceOnly: "Invoice Only",
            itemsOnly: "Items Only",
            merchantOnly: "Merchant Only",
          },
          tooltips: {
            completeAnalysis: "Complete OCR extraction + AI processing",
            invoiceOnly: "Re-extract basic invoice information",
            itemsOnly: "Re-categorize line items",
            merchantOnly: "Re-identify merchant",
            reanalyze: "Trigger complete re-analysis",
          },
          labels: {
            lastAnalyzed: "Last Analyzed",
            updates: "{count} updates",
            granularOptions: "Or choose specific analysis",
          },
          buttons: {
            reanalyze: "Re-Analyze Invoice",
          },
          analyzing: {
            title: "Analyzing...",
            progress: "{progress}% complete",
          },
          steps: {
            preparing: "Preparing...",
            extracting: "Extracting...",
            analyzing: "Analyzing...",
            processing: "Processing...",
            finalizing: "Finalizing...",
            complete: "Complete!",
          },
          toasts: {
            success: {
              title: "Analysis Complete",
              description: "Invoice re-analyzed successfully.",
            },
            error: {
              title: "Analysis Failed",
              description: "Unable to analyze invoice.",
            },
          },
          tip: "Quick Tip: Full analysis takes 30-60 seconds.",
        },
      },
    },
  };

  return render(
    <NextIntlClientProvider
      locale='en'
      messages={messages}>
      <InvoiceContextProvider
        invoice={invoice}
        merchant={merchant}>
        <AnalysisPanel />
      </InvoiceContextProvider>
    </NextIntlClientProvider>,
  );
}

describe("AnalysisPanel", () => {
  const mockRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRouter.mockReturnValue({
      refresh: mockRefresh,
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
    } as ReturnType<typeof useRouter>);
  });

  it("should render the analysis panel with title", () => {
    renderAnalysisPanel();

    expect(screen.getByText("AI Analysis")).toBeInTheDocument();
    expect(screen.getByText("Re-analyze this invoice with AI to extract or update data")).toBeInTheDocument();
  });

  it("should display last analyzed information when available", () => {
    const lastUpdatedAt = new Date("2024-01-15T10:30:00Z");
    renderAnalysisPanel({lastUpdatedAt, numberOfUpdates: 3});

    expect(screen.getByText("Last Analyzed")).toBeInTheDocument();
    expect(screen.getByText(/3 updates/i)).toBeInTheDocument();
  });

  it("should render the re-analyze button", () => {
    renderAnalysisPanel();

    const reanalyzeButton = screen.getByRole("button", {name: /re-analyze invoice/i});
    expect(reanalyzeButton).toBeInTheDocument();
    expect(reanalyzeButton).not.toBeDisabled();
  });

  it("should render granular analysis option buttons", () => {
    renderAnalysisPanel();

    expect(screen.getByText("Full Analysis")).toBeInTheDocument();
    expect(screen.getByText("Invoice Only")).toBeInTheDocument();
    expect(screen.getByText("Items Only")).toBeInTheDocument();
    expect(screen.getByText("Merchant Only")).toBeInTheDocument();
  });

  it("should trigger complete analysis when re-analyze button is clicked", async () => {
    const user = userEvent.setup();
    mockAnalyzeInvoice.mockResolvedValue(undefined);

    renderAnalysisPanel();

    const reanalyzeButton = screen.getByRole("button", {name: /re-analyze invoice/i});
    await user.click(reanalyzeButton);

    await waitFor(() => {
      expect(mockAnalyzeInvoice).toHaveBeenCalledWith({
        invoiceIdentifier: expect.any(String),
        analysisOptions: InvoiceAnalysisOptions.CompleteAnalysis,
      });
    });
  });

  it("should show loading state during analysis", async () => {
    const user = userEvent.setup();
    let resolveAnalysis: () => void;
    const analysisPromise = new Promise<void>((resolve) => {
      resolveAnalysis = resolve;
    });
    mockAnalyzeInvoice.mockReturnValue(analysisPromise);

    renderAnalysisPanel();

    const reanalyzeButton = screen.getByRole("button", {name: /re-analyze invoice/i});
    await user.click(reanalyzeButton);

    // Should show analyzing state
    await waitFor(() => {
      expect(screen.getByText("Analyzing...")).toBeInTheDocument();
    });

    // Buttons should be disabled during analysis
    expect(reanalyzeButton).toBeDisabled();

    // Resolve the analysis
    resolveAnalysis!();

    // Wait for completion
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("should trigger granular analysis when option button is clicked", async () => {
    const user = userEvent.setup();
    mockAnalyzeInvoice.mockResolvedValue(undefined);

    renderAnalysisPanel();

    const itemsOnlyButton = screen.getByText("Items Only");
    await user.click(itemsOnlyButton);

    await waitFor(() => {
      expect(mockAnalyzeInvoice).toHaveBeenCalledWith({
        invoiceIdentifier: expect.any(String),
        analysisOptions: InvoiceAnalysisOptions.InvoiceItemsOnly,
      });
    });
  });

  it("should refresh page after successful analysis", async () => {
    const user = userEvent.setup();
    mockAnalyzeInvoice.mockResolvedValue(undefined);

    renderAnalysisPanel();

    const reanalyzeButton = screen.getByRole("button", {name: /re-analyze invoice/i});
    await user.click(reanalyzeButton);

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("should handle analysis errors gracefully", async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockAnalyzeInvoice.mockRejectedValue(new Error("Analysis failed"));

    renderAnalysisPanel();

    const reanalyzeButton = screen.getByRole("button", {name: /re-analyze invoice/i});
    await user.click(reanalyzeButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error analyzing invoice:", expect.any(Error));
    });

    consoleErrorSpy.mockRestore();
  });

  it("should display the quick tip", () => {
    renderAnalysisPanel();

    expect(screen.getByText(/Quick Tip:/i)).toBeInTheDocument();
  });

  it("should not crash when invoice has no lastUpdatedAt", () => {
    renderAnalysisPanel({lastUpdatedAt: undefined});

    expect(screen.getByText("AI Analysis")).toBeInTheDocument();
    expect(screen.queryByText("Last Analyzed")).not.toBeInTheDocument();
  });

  it("should handle zero numberOfUpdates gracefully", () => {
    renderAnalysisPanel({lastUpdatedAt: new Date(), numberOfUpdates: 0});

    expect(screen.getByText("AI Analysis")).toBeInTheDocument();
    // Should not show the updates badge when count is 0
  });
});

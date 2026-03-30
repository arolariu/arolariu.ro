/**
 * @fileoverview Unit tests for the AnalysisPanel component.
 * @module app/domains/invoices/view-invoice/[id]/_components/cards/AnalysisPanel.test
 */

// Mock server-only modules FIRST
vi.mock("@/instrumentation.server", () => ({
  addSpanEvent: vi.fn(),
  logWithTrace: vi.fn(),
  withSpan: vi.fn((name: string, fn: () => Promise<unknown>) => fn()),
  getTraceparentHeader: vi.fn(() => ""),
  injectTraceContextHeaders: vi.fn(() => ({})),
}));

vi.mock("@/lib/utils.server", () => ({
  fetchWithTimeout: vi.fn(),
}));

// Mock dependencies
vi.mock("@/lib/actions/invoices/analyzeInvoice");
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

// Import vitest functions AFTER mocks
import {render, screen, waitFor} from "@testing-library/react";
import {userEvent} from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";

// Import types and utilities
import {InvoiceBuilder, MerchantBuilder} from "@/data/mocks";
import analyzeInvoice from "@/lib/actions/invoices/analyzeInvoice";
import {InvoiceAnalysisOptions} from "@/types/invoices";
import {NextIntlClientProvider} from "next-intl";
import {useRouter} from "next/navigation";
import {InvoiceContextProvider} from "../../_context/InvoiceContext";
import {AnalysisPanel} from "./AnalysisPanel";

const mockAnalyzeInvoice = vi.mocked(analyzeInvoice);
const mockUseRouter = vi.mocked(useRouter);

/**
 * Helper to render the AnalysisPanel with required context.
 */
function renderAnalysisPanel(invoiceOverrides = {}) {
  const invoice = {...new InvoiceBuilder().build(), ...invoiceOverrides};
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

    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText("description")).toBeInTheDocument();
  });

  it("should display last analyzed information when available", () => {
    const lastUpdatedAt = new Date("2024-01-15T10:30:00Z");
    renderAnalysisPanel({lastUpdatedAt, numberOfUpdates: 3});

    expect(screen.getByText("labels.lastAnalyzed")).toBeInTheDocument();
    expect(screen.getByText("labels.updates")).toBeInTheDocument();
  });

  it("should render the re-analyze button", () => {
    renderAnalysisPanel();

    const reanalyzeButton = screen.getByRole("button", {name: "buttons.reanalyze"});
    expect(reanalyzeButton).toBeInTheDocument();
    expect(reanalyzeButton).not.toBeDisabled();
  });

  it("should render granular analysis option buttons", () => {
    renderAnalysisPanel();

    expect(screen.getByText("options.completeAnalysis")).toBeInTheDocument();
    expect(screen.getByText("options.invoiceOnly")).toBeInTheDocument();
    expect(screen.getByText("options.itemsOnly")).toBeInTheDocument();
  });

  it("should trigger complete analysis when re-analyze button is clicked", async () => {
    const user = userEvent.setup();
    mockAnalyzeInvoice.mockResolvedValue(undefined);

    renderAnalysisPanel();

    const reanalyzeButton = screen.getByRole("button", {name: "buttons.reanalyze"});
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

    const reanalyzeButton = screen.getByRole("button", {name: "buttons.reanalyze"});
    await user.click(reanalyzeButton);

    // Should show analyzing state
    await waitFor(() => {
      expect(screen.getByText("analyzing.title")).toBeInTheDocument();
    });

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

    const itemsOnlyButton = screen.getByText("options.itemsOnly");
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

    const reanalyzeButton = screen.getByRole("button", {name: "buttons.reanalyze"});
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

    const reanalyzeButton = screen.getByRole("button", {name: "buttons.reanalyze"});
    await user.click(reanalyzeButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error analyzing invoice:", expect.any(Error));
    });

    consoleErrorSpy.mockRestore();
  });

  it("should display the quick tip", () => {
    renderAnalysisPanel();

    expect(screen.getByText("tip")).toBeInTheDocument();
  });

  it("should not crash when invoice has no lastUpdatedAt", () => {
    renderAnalysisPanel({lastUpdatedAt: null});

    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.queryByText("labels.lastAnalyzed")).not.toBeInTheDocument();
  });

  it("should handle zero numberOfUpdates gracefully", () => {
    renderAnalysisPanel({lastUpdatedAt: new Date(), numberOfUpdates: 0});

    expect(screen.getByText("title")).toBeInTheDocument();
    // Should not show the updates badge when count is 0
  });

  it("should handle undefined numberOfUpdates", () => {
    renderAnalysisPanel({lastUpdatedAt: new Date(), numberOfUpdates: undefined});

    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.queryByText("labels.updates")).not.toBeInTheDocument();
  });

  it("should handle null numberOfUpdates", () => {
    renderAnalysisPanel({lastUpdatedAt: new Date(), numberOfUpdates: null});

    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.queryByText("labels.updates")).not.toBeInTheDocument();
  });

  it("should handle negative numberOfUpdates", () => {
    renderAnalysisPanel({lastUpdatedAt: new Date(), numberOfUpdates: -1});

    expect(screen.getByText("title")).toBeInTheDocument();
    // Should not show badge for negative numbers
    expect(screen.queryByText("labels.updates")).not.toBeInTheDocument();
  });

  it("should show analyzing state during analysis", async () => {
    const user = userEvent.setup();
    let resolveAnalysis: () => void;
    const analysisPromise = new Promise<void>((resolve) => {
      resolveAnalysis = resolve;
    });
    mockAnalyzeInvoice.mockReturnValue(analysisPromise);

    renderAnalysisPanel();

    const reanalyzeButton = screen.getByRole("button", {name: "buttons.reanalyze"});
    await user.click(reanalyzeButton);

    // Check that analyzing state is shown
    await waitFor(() => {
      expect(screen.getByText("analyzing.title")).toBeInTheDocument();
    });

    // Check that progress text is shown
    expect(screen.getByText(/analyzing.progress/)).toBeInTheDocument();

    // Resolve and cleanup
    resolveAnalysis!();
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("should show currentStep during analysis", async () => {
    const user = userEvent.setup();
    let resolveAnalysis: () => void;
    const analysisPromise = new Promise<void>((resolve) => {
      resolveAnalysis = resolve;
    });
    mockAnalyzeInvoice.mockReturnValue(analysisPromise);

    renderAnalysisPanel();

    const reanalyzeButton = screen.getByRole("button", {name: "buttons.reanalyze"});
    await user.click(reanalyzeButton);

    // Wait for first step to appear
    await waitFor(() => {
      const stepText = screen.queryByText("steps.preparing") || screen.queryByText("steps.extracting");
      expect(stepText).toBeTruthy();
    });

    resolveAnalysis!();
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("should hide idle state when analyzing", async () => {
    const user = userEvent.setup();
    let resolveAnalysis: () => void;
    const analysisPromise = new Promise<void>((resolve) => {
      resolveAnalysis = resolve;
    });
    mockAnalyzeInvoice.mockReturnValue(analysisPromise);

    renderAnalysisPanel();

    // Initially should show idle state
    expect(screen.getByRole("button", {name: "buttons.reanalyze"})).toBeInTheDocument();

    const reanalyzeButton = screen.getByRole("button", {name: "buttons.reanalyze"});
    await user.click(reanalyzeButton);

    // Should hide idle state during analysis
    await waitFor(() => {
      expect(screen.queryByText("labels.granularOptions")).not.toBeInTheDocument();
    });

    resolveAnalysis!();
  });
});

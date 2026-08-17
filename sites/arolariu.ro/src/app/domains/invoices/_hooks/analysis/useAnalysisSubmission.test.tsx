/**
 * @fileoverview Unit tests for honest asynchronous analysis submission.
 * @module app/domains/invoices/_hooks/analysis/useAnalysisSubmission.test
 */

import type {AnalysisAcceptedResponse} from "@/types/invoices";
import {act, renderHook} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {scheduleHardRefresh, useAnalysisSubmission} from "./useAnalysisSubmission";

vi.mock("../../_actions/invoices", () => ({
  analyzeInvoice: vi.fn(),
}));

vi.mock("../../_actions/merchants", () => ({
  analyzeMerchant: vi.fn(),
}));

vi.mock("next-intl-selector", () => ({
  useTranslations:
    () =>
    (
      selector: (messages: {
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
        toasts: {
          invoices: {
            analysis: {
              failed: {description: "Please try submitting the analysis again.", title: "Analysis could not be started"},
              started: {description: "Your analysis request has been queued.", title: "Analysis started"},
            },
          },
        },
      }),
}));

const {analyzeInvoice} = await import("../../_actions/invoices");
const mockAnalyzeInvoice = vi.mocked(analyzeInvoice);

const invoiceIdentifier = "11111111-1111-4111-8111-111111111111";
const acceptedInvoiceResponse: AnalysisAcceptedResponse = {
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

describe("useAnalysisSubmission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAnalyzeInvoice.mockResolvedValue({success: true, data: acceptedInvoiceResponse});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores the accepted run acknowledgement after the invoice action succeeds", async () => {
    // Arrange
    const {result} = renderHook(() => useAnalysisSubmission({refresh: vi.fn()}));

    // Act
    let acknowledgement: AnalysisAcceptedResponse | null = null;
    await act(async () => {
      acknowledgement = await result.current.submitInvoice({
        invoiceIdentifier,
        request: {profile: "comprehensive", overrides: {}},
      });
    });

    // Assert
    expect(acknowledgement).toEqual(acceptedInvoiceResponse);
    expect(result.current.acceptedRunId).toBe(acceptedInvoiceResponse.runId);
    expect(result.current.isSubmitting).toBe(false);
  });

  it("does not enter the success path when the action returns a failure result", async () => {
    // Arrange
    mockAnalyzeInvoice.mockResolvedValue({
      success: false,
      error: {code: "SERVER_ERROR", message: "The raw backend message must remain private."},
    });
    const {result} = renderHook(() => useAnalysisSubmission({refresh: vi.fn()}));

    // Act
    let acknowledgement: AnalysisAcceptedResponse | null = acceptedInvoiceResponse;
    await act(async () => {
      acknowledgement = await result.current.submitInvoice({
        invoiceIdentifier,
        request: {profile: "comprehensive", overrides: {}},
      });
    });

    // Assert
    expect(acknowledgement).toBeNull();
    expect(result.current.acceptedRunId).toBeNull();
  });

  it("prevents a concurrent second submission while an action is pending", async () => {
    // Arrange
    let resolveAction: ((value: {success: true; data: AnalysisAcceptedResponse}) => void) | undefined;
    mockAnalyzeInvoice.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveAction = resolve;
        }),
    );
    const {result} = renderHook(() => useAnalysisSubmission({refresh: vi.fn()}));

    // Act
    let firstSubmission: Promise<AnalysisAcceptedResponse | null> | undefined;
    let secondSubmission: Promise<AnalysisAcceptedResponse | null> | undefined;
    act(() => {
      firstSubmission = result.current.submitInvoice({
        invoiceIdentifier,
        request: {profile: "comprehensive", overrides: {}},
      });
      secondSubmission = result.current.submitInvoice({
        invoiceIdentifier,
        request: {profile: "comprehensive", overrides: {}},
      });
    });

    // Assert
    expect(await secondSubmission).toBeNull();
    expect(mockAnalyzeInvoice).toHaveBeenCalledOnce();

    await act(async () => {
      resolveAction?.({success: true, data: acceptedInvoiceResponse});
      await firstSubmission;
    });
  });

  it("schedules exactly one hard refresh thirty seconds after explicit acceptance", async () => {
    // Arrange
    vi.useFakeTimers();
    const refresh = vi.fn();
    const {result} = renderHook(() => useAnalysisSubmission({refresh}));

    // Act
    await act(async () => {
      await result.current.submitInvoice({
        invoiceIdentifier,
        request: {profile: "comprehensive", overrides: {}},
        refreshAfterAcceptance: true,
      });
    });
    await act(async () => {
      await result.current.submitInvoice({
        invoiceIdentifier,
        request: {profile: "comprehensive", overrides: {}},
        refreshAfterAcceptance: true,
      });
    });
    vi.advanceTimersByTime(30_000);

    // Assert
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("cancels a pending hard refresh when the submitting component unmounts", async () => {
    // Arrange
    vi.useFakeTimers();
    const refresh = vi.fn();
    const {result, unmount} = renderHook(() => useAnalysisSubmission({refresh}));

    // Act
    await act(async () => {
      await result.current.submitInvoice({
        invoiceIdentifier,
        request: {profile: "comprehensive", overrides: {}},
        refreshAfterAcceptance: true,
      });
    });
    unmount();
    vi.advanceTimersByTime(30_000);

    // Assert
    expect(refresh).not.toHaveBeenCalled();
  });

  it("allows tests to schedule a hard refresh without a browser reload", () => {
    // Arrange
    vi.useFakeTimers();
    const refresh = vi.fn();

    // Act
    scheduleHardRefresh(refresh);
    vi.advanceTimersByTime(30_000);

    // Assert
    expect(refresh).toHaveBeenCalledOnce();
  });
});

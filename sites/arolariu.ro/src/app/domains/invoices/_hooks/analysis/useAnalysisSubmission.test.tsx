/**
 * @fileoverview Unit tests for useAnalysisSubmission client hook.
 * @module app/domains/invoices/_hooks/analysis/useAnalysisSubmission.test
 */

import {act, renderHook} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../tests/helpers";
import {ANALYSIS_REFRESH_DELAY_MS, useAnalysisSubmission} from "./useAnalysisSubmission";

// ── Mock true server/client boundaries ────────────────────────────────────────

vi.mock("../../_actions/invoices", () => ({
  analyzeInvoice: vi.fn(),
}));

vi.mock("../../_actions/analysis", () => ({
  analyzeMerchant: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

// ── Grab typed references to the mocked modules ───────────────────────────────

const {analyzeInvoice} = await import("../../_actions/invoices");
const {analyzeMerchant} = await import("../../_actions/analysis");
const {useRouter} = await import("next/navigation");

const mockAnalyzeInvoice = vi.mocked(analyzeInvoice);
const mockAnalyzeMerchant = vi.mocked(analyzeMerchant);
const mockUseRouter = vi.mocked(useRouter);

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TEST_INVOICE_ID = "11111111-1111-4111-8111-111111111111";
const TEST_MERCHANT_ID = "22222222-2222-4222-8222-222222222222";
const TEST_MESSAGE_ID = "queue-msg-abc-123";

const invoiceRequest = {profile: "fast"} as const;
const merchantRequest = {profile: "balanced"} as const;

// ── Suite ─────────────────────────────────────────────────────────────────────

describe("useAnalysisSubmission", () => {
  const mockRouter = {refresh: vi.fn()};

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── 1. Initial state ────────────────────────────────────────────────────────

  describe("initial state", () => {
    it("starts idle with messageId null and errorMessage null", () => {
      const {result} = renderHook(() => useAnalysisSubmission({target: "invoice", identifier: TEST_INVOICE_ID}));

      expect(result.current.status).toBe("idle");
      expect(result.current.messageId).toBeNull();
      expect(result.current.errorMessage).toBeNull();
    });
  });

  // ── 2. Successful submit ────────────────────────────────────────────────────

  describe("successful submit", () => {
    it("transitions to queued with the returned messageId for invoice target", async () => {
      mockAnalyzeInvoice.mockReturnValueOnce(TestDataBuilder.actionSuccess(TEST_MESSAGE_ID));

      const {result} = renderHook(() => useAnalysisSubmission({target: "invoice", identifier: TEST_INVOICE_ID}));

      await act(async () => {
        await result.current.submit(invoiceRequest);
      });

      expect(result.current.status).toBe("queued");
      expect(result.current.messageId).toBe(TEST_MESSAGE_ID);
      expect(result.current.errorMessage).toBeNull();
    });

    it("transitions to queued with the returned messageId for merchant target", async () => {
      mockAnalyzeMerchant.mockReturnValueOnce(TestDataBuilder.actionSuccess(TEST_MESSAGE_ID));

      const {result} = renderHook(() => useAnalysisSubmission({target: "merchant", identifier: TEST_MERCHANT_ID}));

      await act(async () => {
        await result.current.submit(merchantRequest);
      });

      expect(result.current.status).toBe("queued");
      expect(result.current.messageId).toBe(TEST_MESSAGE_ID);
      expect(result.current.errorMessage).toBeNull();
    });
  });

  // ── 3. Failed submit ────────────────────────────────────────────────────────

  describe("failed submit", () => {
    it("transitions to error with non-null errorMessage on action failure result", async () => {
      mockAnalyzeInvoice.mockReturnValueOnce(TestDataBuilder.actionFailure({code: "UNKNOWN_ERROR", message: "Analysis pipeline error"}));

      const {result} = renderHook(() => useAnalysisSubmission({target: "invoice", identifier: TEST_INVOICE_ID}));

      await act(async () => {
        await result.current.submit(invoiceRequest);
      });

      expect(result.current.status).toBe("error");
      expect(result.current.errorMessage).not.toBeNull();
    });

    it("transitions to error with non-null errorMessage on thrown exception", async () => {
      mockAnalyzeInvoice.mockRejectedValueOnce(new Error("Network failure"));

      const {result} = renderHook(() => useAnalysisSubmission({target: "invoice", identifier: TEST_INVOICE_ID}));

      await act(async () => {
        await result.current.submit(invoiceRequest);
      });

      expect(result.current.status).toBe("error");
      expect(result.current.errorMessage).not.toBeNull();
    });
  });

  // ── 4. scheduleRefresh: true timer behaviour ────────────────────────────────

  describe("scheduleRefresh: true", () => {
    it("does not call router.refresh immediately after reaching queued", async () => {
      mockAnalyzeInvoice.mockReturnValueOnce(TestDataBuilder.actionSuccess(TEST_MESSAGE_ID));

      const {result} = renderHook(() => useAnalysisSubmission({target: "invoice", identifier: TEST_INVOICE_ID, scheduleRefresh: true}));

      await act(async () => {
        await result.current.submit(invoiceRequest);
      });

      expect(mockRouter.refresh).not.toHaveBeenCalled();
    });

    it("calls router.refresh exactly once after ANALYSIS_REFRESH_DELAY_MS, never again after 120s more", async () => {
      mockAnalyzeInvoice.mockReturnValueOnce(TestDataBuilder.actionSuccess(TEST_MESSAGE_ID));

      const {result} = renderHook(() => useAnalysisSubmission({target: "invoice", identifier: TEST_INVOICE_ID, scheduleRefresh: true}));

      await act(async () => {
        await result.current.submit(invoiceRequest);
      });

      expect(mockRouter.refresh).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(ANALYSIS_REFRESH_DELAY_MS);
      });

      expect(mockRouter.refresh).toHaveBeenCalledTimes(1);

      act(() => {
        vi.advanceTimersByTime(120_000);
      });

      expect(mockRouter.refresh).toHaveBeenCalledTimes(1);
    });
  });

  // ── 5. scheduleRefresh: false ───────────────────────────────────────────────

  describe("scheduleRefresh: false", () => {
    it("never calls router.refresh after 60s when scheduleRefresh is false", async () => {
      mockAnalyzeInvoice.mockReturnValueOnce(TestDataBuilder.actionSuccess(TEST_MESSAGE_ID));

      const {result} = renderHook(() => useAnalysisSubmission({target: "invoice", identifier: TEST_INVOICE_ID, scheduleRefresh: false}));

      await act(async () => {
        await result.current.submit(invoiceRequest);
      });

      act(() => {
        vi.advanceTimersByTime(60_000);
      });

      expect(mockRouter.refresh).not.toHaveBeenCalled();
    });
  });

  // ── 6. Pending refresh cleanup ──────────────────────────────────────────────

  describe("pending refresh cleanup", () => {
    it("does not call router.refresh after unmounting before the timer fires", async () => {
      mockAnalyzeInvoice.mockReturnValueOnce(TestDataBuilder.actionSuccess(TEST_MESSAGE_ID));

      const {result, unmount} = renderHook(() =>
        useAnalysisSubmission({target: "invoice", identifier: TEST_INVOICE_ID, scheduleRefresh: true}),
      );

      await act(async () => {
        await result.current.submit(invoiceRequest);
      });

      unmount();

      act(() => {
        vi.advanceTimersByTime(60_000);
      });

      expect(mockRouter.refresh).not.toHaveBeenCalled();
    });

    it("cancels the pending refresh when the target changes for the same identifier", async () => {
      mockAnalyzeInvoice.mockReturnValueOnce(TestDataBuilder.actionSuccess(TEST_MESSAGE_ID));

      type TestProps = Readonly<{target: "invoice" | "merchant"}>;
      const initialProps: TestProps = {target: "invoice"};
      const {result, rerender} = renderHook(
        ({target}: TestProps) =>
          useAnalysisSubmission({
            target,
            identifier: TEST_INVOICE_ID,
            scheduleRefresh: true,
          }),
        {initialProps},
      );

      await act(async () => {
        await result.current.submit(invoiceRequest);
      });

      rerender({target: "merchant"});

      act(() => {
        vi.advanceTimersByTime(ANALYSIS_REFRESH_DELAY_MS);
      });

      expect(mockRouter.refresh).not.toHaveBeenCalled();
    });
  });

  // ── 7. refreshNow() ─────────────────────────────────────────────────────────

  describe("refreshNow()", () => {
    it("calls router.refresh immediately", () => {
      const {result} = renderHook(() => useAnalysisSubmission({target: "invoice", identifier: TEST_INVOICE_ID}));

      act(() => {
        result.current.refreshNow();
      });

      expect(mockRouter.refresh).toHaveBeenCalledTimes(1);
    });

    it("cancels the pending scheduled refresh so it does not fire a second time", async () => {
      mockAnalyzeInvoice.mockReturnValueOnce(TestDataBuilder.actionSuccess(TEST_MESSAGE_ID));

      const {result} = renderHook(() => useAnalysisSubmission({target: "invoice", identifier: TEST_INVOICE_ID, scheduleRefresh: true}));

      await act(async () => {
        await result.current.submit(invoiceRequest);
      });

      act(() => {
        result.current.refreshNow();
      });

      // The immediate call
      expect(mockRouter.refresh).toHaveBeenCalledTimes(1);

      act(() => {
        vi.advanceTimersByTime(60_000);
      });

      // Scheduled refresh was cancelled — still exactly 1
      expect(mockRouter.refresh).toHaveBeenCalledTimes(1);
    });
  });

  // ── 8. Status is never "completed" ─────────────────────────────────────────

  describe("status value stays within the declared union", () => {
    const VALID_STATUSES = ["idle", "submitting", "queued", "error"] as const;

    it("status is never 'completed' after a successful submit", async () => {
      mockAnalyzeInvoice.mockReturnValueOnce(TestDataBuilder.actionSuccess(TEST_MESSAGE_ID));

      const {result} = renderHook(() => useAnalysisSubmission({target: "invoice", identifier: TEST_INVOICE_ID}));

      expect(VALID_STATUSES).toContain(result.current.status);

      await act(async () => {
        await result.current.submit(invoiceRequest);
      });

      expect(result.current.status).not.toBe("completed" as never);
      expect(VALID_STATUSES).toContain(result.current.status);
    });

    it("status is never 'completed' after a failed submit", async () => {
      mockAnalyzeInvoice.mockReturnValueOnce(TestDataBuilder.actionFailure({code: "UNKNOWN_ERROR", message: "Error"}));

      const {result} = renderHook(() => useAnalysisSubmission({target: "invoice", identifier: TEST_INVOICE_ID}));

      await act(async () => {
        await result.current.submit(invoiceRequest);
      });

      expect(result.current.status).not.toBe("completed" as never);
      expect(VALID_STATUSES).toContain(result.current.status);
    });
  });
});

/**
 * @fileoverview Real-module tests for honest asynchronous analysis submission.
 * @module app/domains/invoices/_hooks/analysis/useAnalysisSubmission.test
 */

import {getAnalysisApiRequests, installAnalysisFetchHandler, type AnalysisFetchRequest} from "@/../tests/helpers/analysisBoundary";
import type {AnalysisAcceptedResponse} from "@/types/invoices";
import {act, renderHook} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {AnalysisTestProvider} from "../../../../../../tests/helpers/analysis";
import {scheduleHardRefresh, useAnalysisSubmission} from "./useAnalysisSubmission";

const invoiceIdentifier = "11111111-1111-4111-8111-111111111111";
const merchantIdentifier = "22222222-2222-4222-8222-222222222222";
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
const acceptedMerchantResponse: AnalysisAcceptedResponse = {
  runId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  targetType: "merchant",
  targetId: merchantIdentifier,
  status: "queued",
  profile: "comprehensive",
  acceptedCapabilities: ["merchantClassification", "descriptionGeneration"],
  acceptedAt: "2026-08-17T19:40:42.187Z",
};

let apiHandler: (request: AnalysisFetchRequest) => Response | Promise<Response>;

function createAcceptedResponse(response: AnalysisAcceptedResponse): Response {
  return new Response(JSON.stringify(response), {status: 202, statusText: "Accepted"});
}

describe("useAnalysisSubmission", () => {
  beforeEach(() => {
    apiHandler = (requestAtBoundary) =>
      requestAtBoundary.url.includes("/merchants/")
        ? createAcceptedResponse(acceptedMerchantResponse)
        : createAcceptedResponse(acceptedInvoiceResponse);
    installAnalysisFetchHandler((requestAtBoundary) => apiHandler(requestAtBoundary));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stores the accepted acknowledgement returned by the real merchant action", async () => {
    // Arrange
    const {result} = renderHook(() => useAnalysisSubmission({refresh: vi.fn(), scopeKey: merchantIdentifier}), {
      wrapper: AnalysisTestProvider,
    });

    // Act
    let acknowledgement: AnalysisAcceptedResponse | null = null;
    await act(async () => {
      acknowledgement = await result.current.submitMerchant({
        merchantIdentifier,
        request: {profile: "comprehensive", overrides: {}},
      });
    });

    // Assert
    expect(acknowledgement).toEqual(acceptedMerchantResponse);
    expect(result.current.acceptedRunId).toBe(acceptedMerchantResponse.runId);
    expect(result.current.isSubmitting).toBe(false);
    expect(getAnalysisApiRequests()).toEqual([
      expect.objectContaining({
        url: expect.stringContaining(`/rest/v1/merchants/${merchantIdentifier}/analyze`),
        init: expect.objectContaining({method: "POST"}),
      }),
    ]);
  });

  it("clears an earlier acknowledgement before a failed resubmission", async () => {
    // Arrange
    const {result} = renderHook(() => useAnalysisSubmission({refresh: vi.fn(), scopeKey: invoiceIdentifier}), {
      wrapper: AnalysisTestProvider,
    });

    // Act
    await act(async () => {
      await result.current.submitInvoice({
        invoiceIdentifier,
        request: {profile: "comprehensive", overrides: {}},
      });
    });
    apiHandler = () => new Response(null, {status: 503, statusText: "Service Unavailable"});
    let acknowledgement: AnalysisAcceptedResponse | null = acceptedInvoiceResponse;
    let submission: Promise<AnalysisAcceptedResponse | null> | undefined;
    act(() => {
      submission = result.current.submitInvoice({
        invoiceIdentifier,
        request: {profile: "comprehensive", overrides: {}},
      });
    });
    expect(result.current.acceptedRunId).toBeNull();
    await act(async () => {
      if (!submission) {
        throw new Error("The resubmission was not started.");
      }

      acknowledgement = await submission;
    });

    // Assert
    expect(acknowledgement).toBeNull();
    expect(result.current.acceptedRunId).toBeNull();
  });

  it("prevents a concurrent second submission while a real action is pending", async () => {
    // Arrange
    let resolveAction: ((response: Response) => void) | undefined;
    apiHandler = () =>
      new Promise<Response>((resolve) => {
        resolveAction = resolve;
      });
    const {result} = renderHook(() => useAnalysisSubmission({refresh: vi.fn(), scopeKey: invoiceIdentifier}), {
      wrapper: AnalysisTestProvider,
    });

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
    await vi.waitFor(() => {
      expect(getAnalysisApiRequests()).toHaveLength(1);
    });

    await act(async () => {
      resolveAction?.(createAcceptedResponse(acceptedInvoiceResponse));
      await firstSubmission;
    });
  });

  it("invalidates acknowledgement and scheduled refresh when the analysis target changes", async () => {
    // Arrange
    vi.useFakeTimers();
    const refresh = vi.fn();
    const nextInvoiceIdentifier = "33333333-3333-4333-8333-333333333333";
    const {result, rerender} = renderHook(({scopeKey}) => useAnalysisSubmission({refresh, scopeKey}), {
      initialProps: {scopeKey: invoiceIdentifier},
      wrapper: AnalysisTestProvider,
    });

    // Act
    await act(async () => {
      await result.current.submitInvoice({
        invoiceIdentifier,
        request: {profile: "comprehensive", overrides: {}},
        refreshAfterAcceptance: true,
      });
    });
    expect(result.current.acceptedRunId).toBe(acceptedInvoiceResponse.runId);
    rerender({scopeKey: nextInvoiceIdentifier});
    await act(async () => {
      await Promise.resolve();
    });
    vi.advanceTimersByTime(30_000);

    // Assert
    expect(result.current.acceptedRunId).toBeNull();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("ignores an out-of-order prior-target result after the newer target is accepted", async () => {
    // Arrange
    const nextInvoiceIdentifier = "33333333-3333-4333-8333-333333333333";
    const nextResponse: AnalysisAcceptedResponse = {
      ...acceptedInvoiceResponse,
      runId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      targetId: nextInvoiceIdentifier,
    };
    let resolveFirst: ((response: Response) => void) | undefined;
    let resolveSecond: ((response: Response) => void) | undefined;
    let invocationCount = 0;
    apiHandler = () => {
      invocationCount += 1;
      return new Promise<Response>((resolve) => {
        if (invocationCount === 1) {
          resolveFirst = resolve;
        } else {
          resolveSecond = resolve;
        }
      });
    };
    const {result, rerender} = renderHook(({scopeKey}) => useAnalysisSubmission({refresh: vi.fn(), scopeKey}), {
      initialProps: {scopeKey: invoiceIdentifier},
      wrapper: AnalysisTestProvider,
    });

    // Act
    let firstSubmission: Promise<AnalysisAcceptedResponse | null> | undefined;
    act(() => {
      firstSubmission = result.current.submitInvoice({
        invoiceIdentifier,
        request: {profile: "comprehensive", overrides: {}},
      });
    });
    rerender({scopeKey: nextInvoiceIdentifier});
    let secondSubmission: Promise<AnalysisAcceptedResponse | null> | undefined;
    act(() => {
      secondSubmission = result.current.submitInvoice({
        invoiceIdentifier: nextInvoiceIdentifier,
        request: {profile: "comprehensive", overrides: {}},
      });
    });
    await vi.waitFor(() => {
      expect(getAnalysisApiRequests()).toHaveLength(2);
    });
    await act(async () => {
      resolveSecond?.(createAcceptedResponse(nextResponse));
      await secondSubmission;
    });
    await act(async () => {
      resolveFirst?.(createAcceptedResponse(acceptedInvoiceResponse));
      await firstSubmission;
    });

    // Assert
    expect(result.current.acceptedRunId).toBe(nextResponse.runId);
    expect(await firstSubmission).toBeNull();
  });

  it("replaces an accepted refresh timer when a newer attempt begins", async () => {
    // Arrange
    vi.useFakeTimers();
    const refresh = vi.fn();
    let resolveSecond: ((response: Response) => void) | undefined;
    let invocationCount = 0;
    apiHandler = () => {
      invocationCount += 1;
      if (invocationCount === 1) {
        return createAcceptedResponse(acceptedInvoiceResponse);
      }

      return new Promise<Response>((resolve) => {
        resolveSecond = resolve;
      });
    };
    const {result} = renderHook(() => useAnalysisSubmission({refresh, scopeKey: invoiceIdentifier}), {
      wrapper: AnalysisTestProvider,
    });

    // Act
    await act(async () => {
      await result.current.submitInvoice({
        invoiceIdentifier,
        request: {profile: "comprehensive", overrides: {}},
        refreshAfterAcceptance: true,
      });
    });
    act(() => {
      void result.current.submitInvoice({
        invoiceIdentifier,
        request: {profile: "comprehensive", overrides: {}},
        refreshAfterAcceptance: true,
      });
    });
    await vi.waitFor(() => {
      expect(getAnalysisApiRequests()).toHaveLength(2);
    });
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    await act(async () => {
      resolveSecond?.(createAcceptedResponse(acceptedInvoiceResponse));
      await Promise.resolve();
    });
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });

    // Assert
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("does not apply a rejection after the hook has unmounted", async () => {
    // Arrange
    let rejectAction: ((reason?: unknown) => void) | undefined;
    apiHandler = () =>
      new Promise<Response>((_resolve, reject) => {
        rejectAction = reject;
      });
    const {result, unmount} = renderHook(() => useAnalysisSubmission({refresh: vi.fn(), scopeKey: invoiceIdentifier}), {
      wrapper: AnalysisTestProvider,
    });

    // Act
    let submission: Promise<AnalysisAcceptedResponse | null> | undefined;
    act(() => {
      submission = result.current.submitInvoice({
        invoiceIdentifier,
        request: {profile: "comprehensive", overrides: {}},
      });
    });
    await vi.waitFor(() => {
      expect(getAnalysisApiRequests()).toHaveLength(1);
    });
    unmount();
    await act(async () => {
      rejectAction?.(new Error("network unavailable"));
      await submission;
    });

    // Assert
    expect(await submission).toBeNull();
    expect(document.body).not.toHaveTextContent("Analysis could not be started");
  });

  it("cancels a pending hard refresh when the submitting component unmounts", async () => {
    // Arrange
    vi.useFakeTimers();
    const refresh = vi.fn();
    const {result, unmount} = renderHook(() => useAnalysisSubmission({refresh, scopeKey: invoiceIdentifier}), {
      wrapper: AnalysisTestProvider,
    });

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

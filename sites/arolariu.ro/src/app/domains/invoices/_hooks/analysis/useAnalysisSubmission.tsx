"use client";

/**
 * @fileoverview Hook for submitting an invoice or merchant to the analysis pipeline.
 * @module app/domains/invoices/_hooks/analysis/useAnalysisSubmission
 *
 * @remarks
 * The backend analysis pipeline is **asynchronous**. `POST .../analyze` returns
 * `202 Accepted` with an Azure queue message id and nothing else.  There is
 * deliberately no AnalysisRun resource, no run-status endpoint, no polling
 * endpoint, and no completion push channel.
 *
 * A `202` means QUEUED, never COMPLETED.  The UI must not imply that analysis
 * has finished. The only honest states are `idle`, `submitting`, `queued`, and
 * `error`.  This hook exposes exactly those four states and no others.
 */

import {analyzeInvoice} from "../../_actions/invoices";
import {analyzeMerchant} from "../../_actions/analysis";
import type {InvoiceAnalysisRequest, MerchantAnalysisRequest} from "@/types/invoices/Analysis";
import {useRouter} from "next/navigation";
import {useCallback, useEffect, useRef, useState} from "react";

// ── Public constant ─────────────────────────────────────────────────────────

/**
 * Milliseconds to wait after reaching `queued` before triggering a router
 * refresh. Shared between the hook and the UI layer so both stay in sync.
 *
 * @remarks
 * The value (30 s) is a conservative heuristic.  The backend gives no
 * guarantee that the job is done by then; the refresh simply gives Next.js
 * RSC an opportunity to pick up any data changes that may have already landed.
 */
export const ANALYSIS_REFRESH_DELAY_MS = 30_000;

// ── Types ───────────────────────────────────────────────────────────────────

/**
 * The four honest states of an analysis submission.
 *
 * @remarks
 * `"completed"` is intentionally absent: the backend returns `202 Accepted`
 * (queued), never a synchronous completion signal.
 */
export type AnalysisSubmissionStatus = "idle" | "submitting" | "queued" | "error";

/**
 * Options accepted by {@link useAnalysisSubmission}.
 */
type HookInputType = Readonly<{
  /** Whether to target an invoice or a merchant analysis endpoint. */
  readonly target: "invoice" | "merchant";
  /** UUIDv4 of the invoice or merchant to analyse. */
  readonly identifier: string;
  /**
   * When `true`, the hook schedules a single `router.refresh()` call
   * {@link ANALYSIS_REFRESH_DELAY_MS} milliseconds after reaching `queued`.
   *
   * @defaultValue false
   */
  readonly scheduleRefresh?: boolean;
}>;

/**
 * Return shape of {@link useAnalysisSubmission}.
 */
type HookOutputType = Readonly<{
  /**
   * Current state of the submission.
   *
   * @remarks
   * This value is never `"completed"`. A 202 response means QUEUED, not
   * COMPLETED. The UI must not imply completion.
   */
  readonly status: AnalysisSubmissionStatus;
  /** The Azure queue message id returned by the backend, or `null` before a successful submit. */
  readonly messageId: string | null;
  /** Human-readable error description, or `null` when there is no error. */
  readonly errorMessage: string | null;
  /**
   * Submits the analysis request to the backend.
   *
   * @param request - Wire-ready invoice or merchant analysis request DTO.
   */
  readonly submit: (request: InvoiceAnalysisRequest | MerchantAnalysisRequest) => Promise<void>;
  /**
   * Triggers `router.refresh()` immediately and cancels any pending scheduled
   * refresh so the user does not receive a second surprise refresh.
   */
  readonly refreshNow: () => void;
  /** Resets state back to `idle` and cancels any pending scheduled refresh. */
  readonly reset: () => void;
}>;

/** Submits a request to the invoice analysis action with invoice-shaped overrides. */
async function submitInvoiceAnalysis(
  identifier: string,
  request: InvoiceAnalysisRequest | MerchantAnalysisRequest,
): ReturnType<typeof analyzeInvoice> {
  const {profile, ...overrides} = request as InvoiceAnalysisRequest;
  return analyzeInvoice({invoiceIdentifier: identifier, profile, overrides});
}

/** Submits a request to the merchant analysis action with merchant-shaped overrides. */
async function submitMerchantAnalysis(
  identifier: string,
  request: InvoiceAnalysisRequest | MerchantAnalysisRequest,
): ReturnType<typeof analyzeMerchant> {
  const {profile, ...overrides} = request as MerchantAnalysisRequest;
  return analyzeMerchant({merchantIdentifier: identifier, profile, overrides});
}

// ── Hook ────────────────────────────────────────────────────────────────────

/**
 * Manages submission of an invoice or merchant to the asynchronous analysis
 * pipeline and optionally schedules a single router refresh after a delay.
 *
 * @param options - Target, identifier, and optional refresh scheduling flag.
 * @returns State and callbacks for the submission lifecycle.
 *
 * @remarks
 * **A `202` means QUEUED, never COMPLETED.** The backend analysis pipeline is
 * asynchronous and exposes no status endpoint.  This hook deliberately has no
 * `"completed"` status, no progress number, and never polls.  The UI must not
 * imply that analysis has finished when status is `"queued"`.
 *
 * Timer cleanup is keyed on `identifier` and `target`: changing either (or
 * unmounting) cancels any pending refresh timer. At most one refresh is ever
 * scheduled per successful submission.
 *
 * @example
 * ```tsx
 * const {status, messageId, submit} = useAnalysisSubmission({
 *   target: "invoice",
 *   identifier: invoiceId,
 *   scheduleRefresh: true,
 * });
 *
 * // status is "idle" | "submitting" | "queued" | "error" — never "completed"
 * ```
 */
export function useAnalysisSubmission({target, identifier, scheduleRefresh = false}: HookInputType): HookOutputType {
  const router = useRouter();

  const [status, setStatus] = useState<AnalysisSubmissionStatus>("idle");
  const [messageId, setMessageId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /** Holds the id of the single scheduled refresh timer, if any. */
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Guards against state updates after the component has unmounted. */
  const mountedRef = useRef(true);

  // Cancel any pending refresh timer when identifier/target changes or on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [identifier, target]);

  // Track mount state to prevent setState after unmount.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshNow = useCallback((): void => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    router.refresh();
  }, [router]);

  const reset = useCallback((): void => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setStatus("idle");
    setMessageId(null);
    setErrorMessage(null);
  }, []);

  const scheduleQueuedRefresh = useCallback((): void => {
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (mountedRef.current) {
        router.refresh();
      }
    }, ANALYSIS_REFRESH_DELAY_MS);
  }, [router]);

  const submit = useCallback(
    async (request: InvoiceAnalysisRequest | MerchantAnalysisRequest): Promise<void> => {
      // Clear any stale timer from a previous submission.
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (!mountedRef.current) return;
      setStatus("submitting");
      setMessageId(null);
      setErrorMessage(null);

      try {
        const actionResult =
          target === "invoice" ? await submitInvoiceAnalysis(identifier, request) : await submitMerchantAnalysis(identifier, request);

        if (!mountedRef.current) return;

        if (actionResult.success) {
          setStatus("queued");
          setMessageId(actionResult.data);

          if (scheduleRefresh) {
            scheduleQueuedRefresh();
          }
        } else {
          setStatus("error");
          setErrorMessage(actionResult.error.message);
        }
      } catch (error: unknown) {
        if (!mountedRef.current) return;
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "Unknown submission error");
      }
    },
    [target, identifier, scheduleRefresh, scheduleQueuedRefresh],
  );

  return {status, messageId, errorMessage, submit, refreshNow, reset} as const;
}

"use client";

/**
 * @fileoverview Client hook for submitting durable asynchronous analysis runs.
 * @module app/domains/invoices/_hooks/analysis/useAnalysisSubmission
 */

import {analyzeInvoice} from "@/app/domains/invoices/_actions/invoices";
import {analyzeMerchant} from "@/app/domains/invoices/_actions/merchants";
import type {AnalysisAcceptedResponse, AnalyzeInvoiceRequest, AnalyzeMerchantRequest} from "@/types/invoices";
import {toast} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useCallback, useEffect, useRef, useState} from "react";

/**
 * Schedules one browser reload after an accepted analysis has had time to run.
 *
 * @param refresh - Browser refresh callback, injectable by callers and tests.
 * @param delayMs - Delay before refreshing in milliseconds.
 * @returns The timer handle that callers can cancel.
 */
export function scheduleHardRefresh(refresh: () => void = () => window.location.reload(), delayMs = 30_000): ReturnType<typeof setTimeout> {
  return setTimeout(refresh, delayMs);
}

/**
 * Input for an invoice analysis submission.
 */
type InvoiceAnalysisSubmissionInput = Readonly<{
  /** UUID of the invoice to enqueue. */
  readonly invoiceIdentifier: string;
  /** Valid invoice analysis profile and capability overrides. */
  readonly request: AnalyzeInvoiceRequest;
  /** Whether this explicit UI submission should reload after acknowledgement. */
  readonly refreshAfterAcceptance?: boolean;
}>;

/**
 * Input for a merchant analysis submission.
 */
type MerchantAnalysisSubmissionInput = Readonly<{
  /** UUID of the merchant to enqueue. */
  readonly merchantIdentifier: string;
  /** Valid merchant analysis profile and capability overrides. */
  readonly request: AnalyzeMerchantRequest;
  /** Whether this explicit UI submission should reload after acknowledgement. */
  readonly refreshAfterAcceptance?: boolean;
}>;

/**
 * State and operations exposed by {@link useAnalysisSubmission}.
 */
export interface AnalysisSubmissionState {
  /** Whether an enqueue request is currently in flight. */
  readonly isSubmitting: boolean;
  /** Run ID returned by the last accepted submission in this mounted island. */
  readonly acceptedRunId: string | null;
  /** Enqueues invoice analysis and returns its accepted acknowledgement, when any. */
  readonly submitInvoice: (input: InvoiceAnalysisSubmissionInput) => Promise<AnalysisAcceptedResponse | null>;
  /** Enqueues merchant analysis and returns its accepted acknowledgement, when any. */
  readonly submitMerchant: (input: MerchantAnalysisSubmissionInput) => Promise<AnalysisAcceptedResponse | null>;
}

/**
 * Optional browser dependencies for {@link useAnalysisSubmission}.
 */
export interface UseAnalysisSubmissionOptions {
  /** Callback used by an accepted explicit submission to reload the document. */
  readonly refresh?: () => void;
}

type AnalysisSubmissionAction<Input> = (input: Input) => ReturnType<typeof analyzeInvoice>;

const defaultRefresh = (): void => window.location.reload();

/**
 * Submits durable analysis runs without pretending that background processing is complete.
 *
 * @remarks
 * This Client Component hook treats a HTTP 202 acknowledgement as only an accepted
 * enqueue. It prevents concurrent submissions, keeps at most one delayed hard
 * refresh, and cancels that refresh when its owning island unmounts. Server action
 * failure results are handled as normal outcomes rather than promise rejections.
 *
 * @param options - Optional injectable browser refresh callback.
 * @returns Submission state and invoice/merchant enqueue operations.
 */
export function useAnalysisSubmission({refresh = defaultRefresh}: Readonly<UseAnalysisSubmissionOptions> = {}): AnalysisSubmissionState {
  const t = useTranslations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptedRunId, setAcceptedRunId] = useState<string | null>(null);
  const isMountedReference = useRef(true);
  const isSubmittingReference = useRef(false);
  const refreshTimerReference = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearScheduledRefresh = useCallback((): void => {
    if (refreshTimerReference.current !== null) {
      clearTimeout(refreshTimerReference.current);
      refreshTimerReference.current = null;
    }
  }, []);

  useEffect(() => {
    isMountedReference.current = true;

    return () => {
      isMountedReference.current = false;
      clearScheduledRefresh();
    };
  }, [clearScheduledRefresh]);

  const submit = useCallback(
    async <Input>(
      action: AnalysisSubmissionAction<Input>,
      input: Input,
      refreshAfterAcceptance: boolean,
    ): Promise<AnalysisAcceptedResponse | null> => {
      if (isSubmittingReference.current) {
        return null;
      }

      isSubmittingReference.current = true;
      setIsSubmitting(true);

      try {
        const result = await action(input);
        if (!result.success) {
          toast(
            t((messages) => messages.toasts.invoices.analysis.failed.title),
            {
              description: t((messages) => messages.toasts.invoices.analysis.failed.description),
            },
          );
          return null;
        }

        if (!isMountedReference.current) {
          return null;
        }

        setAcceptedRunId(result.data.runId);
        clearScheduledRefresh();
        if (refreshAfterAcceptance) {
          refreshTimerReference.current = scheduleHardRefresh(refresh);
        }
        toast(
          t((messages) => messages.toasts.invoices.analysis.started.title),
          {
            description: t((messages) => messages.toasts.invoices.analysis.started.description),
          },
        );
        return result.data;
      } catch {
        toast(
          t((messages) => messages.toasts.invoices.analysis.failed.title),
          {
            description: t((messages) => messages.toasts.invoices.analysis.failed.description),
          },
        );
        return null;
      } finally {
        isSubmittingReference.current = false;
        if (isMountedReference.current) {
          setIsSubmitting(false);
        }
      }
    },
    [clearScheduledRefresh, refresh, t],
  );

  const submitInvoice = useCallback(
    async ({
      invoiceIdentifier,
      request,
      refreshAfterAcceptance = false,
    }: InvoiceAnalysisSubmissionInput): Promise<AnalysisAcceptedResponse | null> =>
      submit(analyzeInvoice, {invoiceIdentifier, request}, refreshAfterAcceptance),
    [submit],
  );

  const submitMerchant = useCallback(
    async ({
      merchantIdentifier,
      request,
      refreshAfterAcceptance = false,
    }: MerchantAnalysisSubmissionInput): Promise<AnalysisAcceptedResponse | null> =>
      submit(analyzeMerchant, {merchantIdentifier, request}, refreshAfterAcceptance),
    [submit],
  );

  return {isSubmitting, acceptedRunId, submitInvoice, submitMerchant};
}

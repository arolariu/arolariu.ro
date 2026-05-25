"use client";

/**
 * @fileoverview Hook for invoice sharing operations: toggle public, revoke access, send share email.
 * @module app/domains/invoices/_hooks/useInvoiceShare
 */

import {sendEmail} from "@/lib/actions/email";
import patchInvoice from "@/lib/actions/invoices/patchInvoice";
import {LAST_GUID} from "@/lib/utils.generic";
import {useInvoicesStore} from "@/stores";
import type {EmailLocale} from "@/types/emails";
import type {Invoice} from "@/types/invoices";
import {toast} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {useCallback, useState} from "react";

/**
 * Arguments representable as share actions.
 */
type ShareAction =
  | Readonly<{type: "togglePublic"}>
  | Readonly<{type: "revoke"; userIdToRemove?: string}>
  | Readonly<{type: "sendEmail"; to: string; locale: EmailLocale; fromUsername?: string; replyTo?: string}>;

/**
 * Result of a bulk share operation.
 */
type BulkShareResult = Readonly<{
  successCount: number;
  failureCount: number;
  failedIds: readonly string[];
  updatedInvoices: readonly Invoice[];
}>;

/**
 * Hook output type.
 */
type HookOutputType = Readonly<{
  isSharing: boolean;
  performShare: {
    (invoiceId: string, action: ShareAction): Promise<Invoice | null>;
    (invoiceIds: readonly string[], action: ShareAction): Promise<BulkShareResult>;
  };
}>;

/**
 * Manages invoice sharing mutations and email invitation side effects (supports single + bulk operations).
 *
 * @param onComplete - Optional callback after sharing activity finishes
 * @returns Object containing sharing state and unified action callback
 */
export function useInvoiceShare(onComplete?: () => void): Readonly<HookOutputType> {
  const t = useTranslations("IMS--Hooks.useInvoiceShare");
  const upsertEntity = useInvoicesStore((state) => state.upsertEntity);
  const getEntityById = useInvoicesStore((state) => state.getEntityById);
  const [isSharing, setIsSharing] = useState<boolean>(false);

  /**
   * Internal worker function to compute and apply single-invoice mutations.
   */
  const shareAndMutate = useCallback(
    async (id: string, action: ShareAction): Promise<Invoice | null> => {
      const invoice = getEntityById(id);
      if (!invoice) {
        throw new Error("Invoice not found in store");
      }

      if (action.type === "togglePublic") {
        const nextSharedWith = invoice.sharedWith.includes(LAST_GUID)
          ? invoice.sharedWith
          : [...invoice.sharedWith, LAST_GUID];

        const result = await patchInvoice({
          invoiceId: id,
          payload: {sharedWith: nextSharedWith},
        });

        if (!result.success) {
          throw new Error(result.error || t("toggleError"));
        }
        upsertEntity(result.invoice);
        return result.invoice;
      }

      if (action.type === "revoke") {
        const target = action.userIdToRemove ?? LAST_GUID;
        const nextSharedWith = invoice.sharedWith.filter((uid) => uid !== target);

        const result = await patchInvoice({
          invoiceId: id,
          payload: {sharedWith: nextSharedWith},
        });

        if (!result.success) {
          throw new Error(result.error || t("revokeError"));
        }
        upsertEntity(result.invoice);
        return result.invoice;
      }

      if (action.type === "sendEmail") {
        const {to, locale, fromUsername, replyTo} = action;
        const fromName = fromUsername?.trim() || "Someone";

        const result = await sendEmail({
          templateKey: "invoice-shared",
          to,
          props: {
            fromUsername: fromName,
            toUsername: to.split("@")[0]?.trim() || "there",
            identifier: id,
            locale,
          },
          subjectVars: {fromName},
          ...(replyTo ? {replyTo} : {}),
        });

        if (!result.success) {
          throw new Error(result.error || "unknown");
        }
        return null;
      }

      return null;
    },
    [getEntityById, t, upsertEntity],
  );

  /**
   * Recursive sequencer to scale sequential multi-invoice sharing with precision.
   */
  const processBulkRecursive = useCallback(
    async (
      ids: readonly string[],
      index: number,
      action: ShareAction,
      acc: {successCount: number; failureCount: number; failedIds: string[]; updatedInvoices: Invoice[]},
    ): Promise<BulkShareResult> => {
      if (index >= ids.length) {
        return acc;
      }
      const id = ids[index];
      try {
        const updatedInvoice = await shareAndMutate(id, action);
        return await processBulkRecursive(ids, index + 1, action, {
          ...acc,
          successCount: acc.successCount + 1,
          updatedInvoices: updatedInvoice ? [...acc.updatedInvoices, updatedInvoice] : acc.updatedInvoices,
        });
      } catch (error) {
        console.error(`Failed bulk sharing action on invoice ${id}:`, error);
        return await processBulkRecursive(ids, index + 1, action, {
          ...acc,
          failureCount: acc.failureCount + 1,
          failedIds: [...acc.failedIds, id],
        });
      }
    },
    [shareAndMutate],
  );

  const performShare = useCallback(
    async (invoiceIdOrIds: string | readonly string[], action: ShareAction): Promise<any> => {
      setIsSharing(true);
      try {
        if (typeof invoiceIdOrIds === "string") {
          if (action.type === "sendEmail") {
            const {to} = action;
            await toast.promise(shareAndMutate(invoiceIdOrIds, action), {
              loading: t("emailSending", {email: to}),
              success: t("emailSuccess", {email: to}),
              error: (err: unknown) =>
                t("emailError", {
                  email: to,
                  error: err instanceof Error ? err.message : String(err),
                }),
            });
          } else {
            const updated = await shareAndMutate(invoiceIdOrIds, action);
            onComplete?.();
            return updated;
          }
        } else {
          const result = await processBulkRecursive(invoiceIdOrIds, 0, action, {
            successCount: 0,
            failureCount: 0,
            failedIds: [],
            updatedInvoices: [],
          });

          onComplete?.();
          return result;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        toast.error(t("error", {error: message}));
        console.error("Error executing share operation:", error);
      } finally {
        setIsSharing(false);
      }
    },
    [onComplete, processBulkRecursive, shareAndMutate, t],
  );

  return {isSharing, performShare};
}


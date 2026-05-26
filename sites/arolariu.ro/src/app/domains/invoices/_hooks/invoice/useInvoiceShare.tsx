"use client";

/**
* @fileoverview Hook for invoice sharing, revocation, and share-email flows.
* @module app/domains/invoices/_hooks/invoice/useInvoiceShare
*
* @remarks
* Provides a client-side facade over invoice sharing operations. The hook keeps
* a local loading flag, updates the invoice store after sharing mutations, and
* delegates invitation delivery to the email server action.
 */

import {sendEmail} from "@/lib/actions/email";
import {LAST_GUID} from "@/lib/utils.generic";
import {useInvoicesStore} from "@/stores";
import type {EmailLocale} from "@/types/emails";
import type {Invoice} from "@/types/invoices";
import {toast} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useCallback, useState} from "react";
import { patchInvoice } from "../../_actions/invoices";

/**
 * Discriminated union of supported invoice share actions.
 *
 * @remarks
 * `togglePublic` adds the public sentinel identifier, `revoke` removes either a
 * specific user or the public sentinel, and `sendEmail` sends an invitation
 * email without mutating the invoice.
 */
type ShareAction =
  | Readonly<{type: "togglePublic"}>
  | Readonly<{type: "revoke"; userIdToRemove?: string}>
  | Readonly<{type: "sendEmail"; to: string; locale: EmailLocale; fromUsername?: string; replyTo?: string}>;

/**
 * Result of a bulk share operation.
 *
 * @remarks
 * Tracks per-invoice success counts and the invoices returned by share
 * mutations. Email-only actions increment counts but do not add updated
 * invoices because no invoice mutation occurs.
 */
type BulkShareResult = Readonly<{
  successCount: number;
  failureCount: number;
  failedIds: readonly string[];
  updatedInvoices: readonly Invoice[];
}>;

/**
 * Hook output type for share operations.
 */
type HookOutputType = Readonly<{
  isSharing: boolean;
  shareInvoiceCallback: {
    (invoiceId: string, action: ShareAction): Promise<Invoice | null>;
    (invoiceIds: readonly string[], action: ShareAction): Promise<BulkShareResult>;
  };
}>;

/**
 * Manages invoice sharing mutations and email invitation side effects.
 *
 * @remarks
 * **Execution Context**: Client Component hook.
 *
 * **Supported Operations:**
 * - Toggle public access by adding the public sentinel identifier.
 * - Revoke public or user-specific access by removing an identifier.
 * - Send a localized invitation email without changing invoice state.
 * - Process a list of invoice IDs sequentially for bulk sharing actions.
 *
 * **Error Handling**: Single-operation errors are surfaced through toast
 * notifications and console logging. Bulk operations isolate per-invoice
 * failures and return aggregate counts.
 *
 * @param onComplete - Optional callback invoked after non-email single mutations and after bulk processing.
 * @returns Hook state containing sharing progress and the overloaded share callback.
 *
 * @example
 * ```tsx
 * const {isSharing, shareInvoiceCallback} = useInvoiceShare(() => closeDialog());
 *
 * await shareInvoiceCallback(invoice.id, {type: "togglePublic"});
 * ```
 *
 * @example
 * ```tsx
 * const result = await shareInvoiceCallback(selectedInvoiceIds, {
 *   type: "revoke",
 *   userIdToRemove: sharedUserId,
 * });
 *
 * if (result.failureCount > 0) {
 *   console.warn("Failed sharing updates:", result.failedIds);
 * }
 * ```
 */
export function useInvoiceShare(onComplete?: () => void): Readonly<HookOutputType> {
  const t = useTranslations();
  const shareInvoiceClientSide = useInvoicesStore((state) => state.upsertEntity);
  const getEntityById = useInvoicesStore((state) => state.getEntityById);
  const [isSharing, setIsSharing] = useState<boolean>(false);

  /**
   * Computes and applies one sharing operation for a single invoice.
   *
   * @param id - Invoice identifier to mutate or reference in an emails.
   * @param action - Sharing action to apply.
   * @returns The updated invoice for mutations, or null for email-only actions.
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
          throw new Error(result.error ? String(result.error) : t((m) => m.toasts.invoices.useInvoiceShare.toggleError));
        }
        shareInvoiceClientSide(result.data);
        return result.data;
      }

      if (action.type === "revoke") {
        const target = action.userIdToRemove ?? LAST_GUID;
        const nextSharedWith = invoice.sharedWith.filter((uid) => uid !== target);

        const result = await patchInvoice({
          invoiceId: id,
          payload: {sharedWith: nextSharedWith},
        });

        if (!result.success) {
          throw new Error(result.error ? String(result.error) : t((m) => m.toasts.invoices.useInvoiceShare.revokeError));
        }
        shareInvoiceClientSide(result.data);
        return result.data;
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
    [getEntityById, t, shareInvoiceClientSide],
  );

  /**
   * Processes bulk share actions sequentially with per-invoice failure tracking.
   *
   * @param ids - Invoice identifiers to process.
   * @param index - Current zero-based index in `ids`.
   * @param action - Sharing action applied to each invoice.
   * @param acc - Aggregated success, failure, failed ID, and updated invoice state.
   * @returns Aggregate share result after all invoice IDs have been attempted.
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
      if (!id) {
        return acc;
      }
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

  const shareInvoiceCallback = useCallback(
    async (invoiceIdOrIds: string | readonly string[], action: ShareAction): Promise<any> => {
      setIsSharing(true);
      try {
        if (typeof invoiceIdOrIds === "string") {
          if (action.type === "sendEmail") {
            const {to} = action;
            await toast.promise(shareAndMutate(invoiceIdOrIds, action), {
              loading: t((m) => m.toasts.invoices.useInvoiceShare.emailSending, {email: to}),
              success: t((m) => m.toasts.invoices.useInvoiceShare.emailSuccess, {email: to}),
              error: (err: unknown) =>
                t((m) => m.toasts.invoices.useInvoiceShare.emailError, {
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
        toast.error(`${t((m) => m.toasts.invoices.useInvoiceShare.revokeError)} ${message}`);
        console.error("Error executing share operation:", error);
      } finally {
        setIsSharing(false);
      }
    },
    [onComplete, processBulkRecursive, shareAndMutate, t],
  );

  return {isSharing, shareInvoiceCallback};
}

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
 * Arguments for sending an invoice share email.
 */
type SendShareEmailArgs = Readonly<{
  to: string;
  identifier: string;
  locale: EmailLocale;
  fromUsername?: string;
  replyTo?: string;
}>;

/**
 * Hook output type.
 */
type UseInvoiceShareOutput = Readonly<{
  isTogglingPublic: boolean;
  isRevoking: boolean;
  isSendingEmail: boolean;
  /** Adds LAST_GUID to sharedWith if not already present; returns the updated invoice. Throws on patch failure. NO toast — caller decides. */
  togglePublic: () => Promise<Invoice>;
  /** Removes a user from sharedWith (defaults to LAST_GUID = public sentinel); returns the updated invoice. Throws on patch failure. NO toast — caller decides. */
  revokeUserAccess: (userIdToRemove?: string) => Promise<Invoice>;
  /** Sends a share-invitation email wrapped in toast.promise (universal pattern across consumers). */
  sendShareEmail: (args: SendShareEmailArgs) => Promise<void>;
}>;

/**
 * Manages invoice sharing mutations and email invitation side effects.
 *
 * @param invoice - The invoice to share or unshare
 * @returns Object containing sharing state and action callbacks
 */
export function useInvoiceShare(invoice: Invoice): UseInvoiceShareOutput {
  const t = useTranslations("IMS--Hooks.useInvoiceShare");
  const upsertEntity = useInvoicesStore((state) => state.upsertEntity);

  const [isTogglingPublic, setIsTogglingPublic] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const togglePublic = useCallback(async (): Promise<Invoice> => {
    setIsTogglingPublic(true);
    try {
      const nextSharedWith = invoice.sharedWith.includes(LAST_GUID)
        ? invoice.sharedWith
        : [...invoice.sharedWith, LAST_GUID];

      const result = await patchInvoice({
        invoiceId: invoice.id,
        payload: {sharedWith: nextSharedWith},
      });

      if (!result.success) {
        throw new Error(result.error || t("toggleError"));
      }
      upsertEntity(result.invoice);
      return result.invoice;
    } finally {
      setIsTogglingPublic(false);
    }
  }, [invoice.id, invoice.sharedWith, t, upsertEntity]);

  const revokeUserAccess = useCallback(
    async (userIdToRemove?: string): Promise<Invoice> => {
      setIsRevoking(true);
      try {
        const target = userIdToRemove ?? LAST_GUID;
        const nextSharedWith = invoice.sharedWith.filter((id) => id !== target);

        const result = await patchInvoice({
          invoiceId: invoice.id,
          payload: {sharedWith: nextSharedWith},
        });

        if (!result.success) {
          throw new Error(result.error || t("revokeError"));
        }
        upsertEntity(result.invoice);
        return result.invoice;
      } finally {
        setIsRevoking(false);
      }
    },
    [invoice.id, invoice.sharedWith, t, upsertEntity],
  );

  const sendShareEmail = useCallback(
    async ({to, identifier, locale, fromUsername, replyTo}: SendShareEmailArgs): Promise<void> => {
      setIsSendingEmail(true);
      const fromName = fromUsername?.trim() || "Someone";
      try {
        await toast.promise(
          (async () => {
            const result = await sendEmail({
              templateKey: "invoice-shared",
              to,
              props: {
                fromUsername: fromName,
                toUsername: to.split("@")[0]?.trim() || "there",
                identifier,
                locale,
              },
              subjectVars: {fromName},
              ...(replyTo ? {replyTo} : {}),
            });
            if (!result.success) {
              throw new Error(result.error || "unknown");
            }
          })(),
          {
            loading: t("emailSending", {email: to}),
            success: t("emailSuccess", {email: to}),
            error: (err: unknown) =>
              t("emailError", {
                email: to,
                error: err instanceof Error ? err.message : String(err),
              }),
          },
        );
      } finally {
        setIsSendingEmail(false);
      }
    },
    [t],
  );

  return {
    isTogglingPublic,
    isRevoking,
    isSendingEmail,
    togglePublic,
    revokeUserAccess,
    sendShareEmail,
  };
}

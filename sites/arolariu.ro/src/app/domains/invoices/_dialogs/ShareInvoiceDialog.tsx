"use client";

import patchInvoice from "@/lib/actions/invoices/patchInvoice";
import {LAST_GUID} from "@/lib/utils.generic";
import type {Invoice} from "@/types/invoices";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  toast,
} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import React, {useCallback, useMemo, useState} from "react";
import {TbAlertTriangle, TbGlobe, TbLock} from "react-icons/tb";
import {useDialog} from "../_contexts/DialogContext";
import {copySvgToClipboard} from "../_utils";
import styles from "./ShareInvoiceDialog.module.scss";
import {PrivateMode} from "./ShareInvoiceDialog.Private";
import {AlreadyPublicMode, PublicMode} from "./ShareInvoiceDialog.Public";

// ============================================================================
// Types
// ============================================================================

/** Sharing mode determines the current view in the dialog */
type SharingMode = "selection" | "public" | "private";

// ============================================================================
// Sub-Components
// ============================================================================

/** Props for the selection mode component */
interface SelectionModeProps {
  readonly onSelectPublic: () => void;
  readonly onSelectPrivate: () => void;
  readonly t: ReturnType<typeof useTranslations>;
}

/**
 * Renders the initial selection screen for choosing sharing method.
 *
 * @remarks
 * Presents two options to the user:
 * - **Public Sharing**: Generate a link or QR code accessible by anyone
 * - **Private Sharing**: Send an email invitation to a specific recipient
 *
 * Includes a privacy notice explaining the implications of each choice.
 *
 * @param props - Component props
 * @returns The sharing method selection UI
 */
function SelectionMode({onSelectPublic, onSelectPrivate, t}: Readonly<SelectionModeProps>): React.JSX.Element {
  return (
    <div className={styles["selectionBody"]}>
      <p className={styles["selectionDescription"]}>{t("selection.description")}</p>

      <div className={styles["selectionGrid"]}>
        <Card
          className='hover:border-primary hover:bg-accent/50 cursor-pointer transition-colors'
          onClick={onSelectPublic}>
          <CardHeader className={styles["cardHeaderRow"]}>
            <div className={`${styles["iconCircle"]} ${styles["iconCircleOrange"]}`}>
              <TbGlobe className={styles["globeIcon"]} />
            </div>
            <div className={styles["cardContent"]}>
              <CardTitle className='text-base'>{t("selection.publicTitle")}</CardTitle>
              <CardDescription className='text-sm'>
                {t.rich("selection.publicDescription", {strong: (chunks) => <strong>{chunks}</strong>})}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card
          className='hover:border-primary hover:bg-accent/50 cursor-pointer transition-colors'
          onClick={onSelectPrivate}>
          <CardHeader className={styles["cardHeaderRow"]}>
            <div className={`${styles["iconCircle"]} ${styles["iconCircleGreen"]}`}>
              <TbLock className={styles["lockIcon"]} />
            </div>
            <div className={styles["cardContent"]}>
              <CardTitle className='text-base'>{t("selection.privateTitle")}</CardTitle>
              <CardDescription className='text-sm'>
                {t.rich("selection.privateDescription", {strong: (chunks) => <strong>{chunks}</strong>})}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>

      <Alert
        variant='default'
        className='mt-4'>
        <TbAlertTriangle className={styles["alertIcon"]} />
        <AlertTitle>{t("selection.privacyNoticeTitle")}</AlertTitle>
        <AlertDescription className='text-xs'>{t("selection.privacyNoticeDescription")}</AlertDescription>
      </Alert>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Dialog for sharing invoice access with privacy-aware workflow.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Privacy-First Design**:
 * The dialog first checks if the invoice is already public (via the sentinel
 * GUID `99999999-9999-9999-9999-999999999999` in `sharedWith`). If public,
 * it shows the current status with a revoke option. Otherwise, it presents
 * a choice between public and private sharing.
 *
 * **Sharing Modes**:
 * - **Already Public**: Invoice is currently public, show link/QR with revoke option
 * - **Selection**: Choose between public or private sharing (for private invoices)
 * - **Public**: Make invoice accessible to anyone with the link
 * - **Private**: Send email invitation to a specific recipient
 *
 * @returns Client-rendered dialog with privacy-aware sharing workflow
 *
 * @see {@link SharingCard} - Parent component that opens this dialog
 * @see {@link useDialog} - Dialog state management hook
 */
export default function ShareInvoiceDialog(): React.JSX.Element {
  const t = useTranslations("Domains.services.invoices.ui.shareInvoiceDialog");
  const [sharingMode, setSharingMode] = useState<SharingMode>("selection");
  const [copied, setCopied] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [isRevoking, setIsRevoking] = useState<boolean>(false);

  const router = useRouter();

  const {
    currentDialog: {payload},
    isOpen,
    close,
  } = useDialog("SHARED__INVOICE_SHARE");

  const {invoice} = payload as {invoice: Invoice};
  const shareUrl = `${globalThis.location.origin}/domains/invoices/view-invoice/${invoice.id}`;

  /** Check if the invoice is currently public */
  const isInvoicePublic = useMemo(() => {
    return invoice.sharedWith?.includes(LAST_GUID) ?? false;
  }, [invoice.sharedWith]);

  /** Reset state when dialog closes */
  const handleClose = useCallback(() => {
    setSharingMode("selection");
    setEmail("");
    setCopied(false);
    close();
  }, [close]);

  /** Go back to selection mode */
  const handleBack = useCallback(() => {
    setSharingMode("selection");
  }, []);

  /**
   * Makes the invoice public by adding LAST_GUID to sharedWith array.
   * Inlines the patchInvoice call directly.
   */
  const makeInvoicePublic = useCallback(async (): Promise<void> => {
    const newSharedWith = invoice.sharedWith?.includes(LAST_GUID) ? invoice.sharedWith : [...(invoice.sharedWith ?? []), LAST_GUID];

    const result = await patchInvoice({
      invoiceId: invoice.id,
      payload: {sharedWith: newSharedWith},
    });

    if (!result.success) {
      throw new Error(result.error);
    }
  }, [invoice.id, invoice.sharedWith]);

  /**
   * Makes the invoice public and copies the share link to clipboard.
   * Uses toast.promise for consistent loading/success/error states.
   */
  const handleCopyLink = useCallback(() => {
    const copyLinkAction = async () => {
      const wasPrivate = !isInvoicePublic;
      // If invoice is not already public, make it public first
      if (wasPrivate && sharingMode === "public") {
        await makeInvoicePublic();
      }
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      // Refresh the page data if sharing state changed
      if (wasPrivate) {
        router.refresh();
      }
    };

    toast.promise(copyLinkAction(), {
      loading: isInvoicePublic ? t("toasts.copyLink.loadingPublic") : t("toasts.copyLink.loadingMakePublic"),
      success: isInvoicePublic ? t("toasts.copyLink.successPublic") : t("toasts.copyLink.successMadePublic"),
      error: (err: Error) => t("toasts.copyLink.error", {message: err.message}),
    });
  }, [isInvoicePublic, makeInvoicePublic, router, sharingMode, shareUrl, t]);

  /**
   * Makes the invoice public and copies the QR code image to clipboard.
   * Uses toast.promise for consistent loading/success/error states.
   */
  const handleCopyQRCode = useCallback(() => {
    const copyQRCodeAction = async () => {
      const wasPrivate = !isInvoicePublic;
      // If invoice is not already public, make it public first
      if (wasPrivate && sharingMode === "public") {
        await makeInvoicePublic();
      }

      const qrCodeElement = document.querySelector("#invoice-qr-code");
      if (!qrCodeElement) {
        throw new Error(t("errors.qrNotFound"));
      }

      await copySvgToClipboard(qrCodeElement);

      // Refresh the page data if sharing state changed
      if (wasPrivate) {
        router.refresh();
      }
    };

    toast.promise(copyQRCodeAction(), {
      loading: isInvoicePublic ? t("toasts.copyQr.loadingPublic") : t("toasts.copyQr.loadingMakePublic"),
      success: isInvoicePublic ? t("toasts.copyQr.successPublic") : t("toasts.copyQr.successMadePublic"),
      error: (err: Error) => t("toasts.copyQr.error", {message: err.message}),
    });
  }, [isInvoicePublic, makeInvoicePublic, router, sharingMode, t]);

  /**
   * Sends an email invitation to share the invoice privately.
   * Uses toast.promise for consistent loading/success/error states.
   */
  const handleSendEmail = useCallback(
    (e: React.SubmitEvent) => {
      e.preventDefault();

      const sendEmailAction = async () => {
        // NOTE: User email should come from auth context when available
        const userEmail = "user@arolariu.ro";

        const response = await fetch(`/api/mail/invoices/share/${invoice.id}`, {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({toEmail: email, fromEmail: userEmail}),
        });

        if (!response.ok) {
          throw new Error(`Failed to send email: ${response.status}`);
        }

        setEmail("");
      };

      toast.promise(sendEmailAction(), {
        loading: t("toasts.sendEmail.loading", {email}),
        success: t("toasts.sendEmail.success", {email}),
        error: (err: Error) => t("toasts.sendEmail.error", {message: err.message}),
      });
    },
    [email, invoice.id, t],
  );

  /**
   * Revokes public access from the invoice by removing LAST_GUID from sharedWith.
   * Uses toast.promise for consistent loading/success/error states.
   * Button is disabled via `isRevoking` state until backend responds.
   */
  const handleRevokeAccess = useCallback(() => {
    setIsRevoking(true);

    const revokeAction = async () => {
      const newSharedWith = (invoice.sharedWith ?? []).filter((id) => id !== LAST_GUID);

      const result = await patchInvoice({
        invoiceId: invoice.id,
        payload: {sharedWith: newSharedWith},
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // Refresh the page data to reflect the new private state
      router.refresh();
      handleClose();
    };

    toast.promise(
      revokeAction().finally(() => setIsRevoking(false)),
      {
        loading: t("toasts.revoke.loading"),
        success: t("toasts.revoke.success"),
        error: (err: Error) => t("toasts.revoke.error", {message: err.message}),
      },
    );
  }, [invoice.id, invoice.sharedWith, router, handleClose, t]);

  /** Navigate to public sharing mode */
  const handleSelectPublic = useCallback(() => {
    setSharingMode("public");
  }, []);

  /** Navigate to private sharing mode */
  const handleSelectPrivate = useCallback(() => {
    setSharingMode("private");
  }, []);

  /**
   * Handle dialog state change from the Dialog component.
   * Note: Opening is handled via useDialog hook, this mainly handles close.
   */
  const handleOpenChange = useCallback(
    (nextOpenState: boolean) => {
      // The dialog only needs to handle closing since opening is managed by useDialog
      if (!nextOpenState) {
        handleClose();
      }
    },
    [handleClose],
  );

  /** Get the dialog description based on current state */
  const getDialogDescription = (): string => {
    if (isInvoicePublic) {
      return t("dialogDescription.currentlyPublic", {invoiceName: invoice.name});
    }
    switch (sharingMode) {
      case "selection":
        return t("dialogDescription.selection", {invoiceName: invoice.name});
      case "public":
        return t("dialogDescription.public", {invoiceName: invoice.name});
      case "private":
        return t("dialogDescription.private", {invoiceName: invoice.name});
      default:
        return "";
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{getDialogDescription()}</DialogDescription>
        </DialogHeader>

        {isInvoicePublic ? (
          <AlreadyPublicMode
            shareUrl={shareUrl}
            copied={copied}
            onCopyLink={handleCopyLink}
            onCopyQRCode={handleCopyQRCode}
            onRevokeAccess={handleRevokeAccess}
            isRevoking={isRevoking}
          />
        ) : (
          <>
            {sharingMode === "selection" && (
              <SelectionMode
                onSelectPublic={handleSelectPublic}
                onSelectPrivate={handleSelectPrivate}
                t={t}
              />
            )}
            {sharingMode === "public" && (
              <PublicMode
                shareUrl={shareUrl}
                onBack={handleBack}
                copied={copied}
                onCopyLink={handleCopyLink}
                onCopyQRCode={handleCopyQRCode}
              />
            )}
            {sharingMode === "private" && (
              <PrivateMode
                onBack={handleBack}
                email={email}
                onEmailChange={setEmail}
                onSendEmail={handleSendEmail}
              />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

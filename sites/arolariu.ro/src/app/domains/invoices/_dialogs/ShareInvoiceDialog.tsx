"use client";

import {LAST_GUID} from "@/lib/utils.generic";
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
import {useUser} from "@clerk/nextjs";
import {useLocale} from "next-intl";
import {useTranslations} from "next-intl-selector";
import {useRouter} from "next/navigation";
import React, {useCallback, useMemo, useState} from "react";
import {TbAlertTriangle, TbGlobe, TbLock} from "react-icons/tb";
import {useDialog} from "../_contexts/DialogContext";
import {useInvoiceShare} from "../_hooks/invoice";
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
      <p className={styles["selectionDescription"]}>{t((m) => m.dialogs.invoices.shareInvoiceDialog.selection.description)}</p>

      <div className={styles["selectionGrid"]}>
        <Card
          className={styles["cardHoverCursor"]}
          onClick={onSelectPublic}>
          <CardHeader className={styles["cardHeaderRow"]}>
            <div className={`${styles["iconCircle"]} ${styles["iconCircleOrange"]}`}>
              <TbGlobe className={styles["globeIcon"]} />
            </div>
            <div className={styles["cardContent"]}>
              <CardTitle className={styles["cardTitleBase"]}>
                {t((m) => m.dialogs.invoices.shareInvoiceDialog.selection.publicTitle)}
              </CardTitle>
              <CardDescription className={styles["cardDescSm"]}>
                {t.rich((m) => m.dialogs.invoices.shareInvoiceDialog.selection.publicDescription, {
                  // eslint-disable-next-line react/no-unstable-nested-components -- single-call site
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card
          className={styles["cardHoverCursor"]}
          onClick={onSelectPrivate}>
          <CardHeader className={styles["cardHeaderRow"]}>
            <div className={`${styles["iconCircle"]} ${styles["iconCircleGreen"]}`}>
              <TbLock className={styles["lockIcon"]} />
            </div>
            <div className={styles["cardContent"]}>
              <CardTitle className={styles["cardTitleBase"]}>
                {t((m) => m.dialogs.invoices.shareInvoiceDialog.selection.privateTitle)}
              </CardTitle>
              <CardDescription className={styles["cardDescSm"]}>
                {t.rich((m) => m.dialogs.invoices.shareInvoiceDialog.selection.privateDescription, {
                  // eslint-disable-next-line react/no-unstable-nested-components -- single-call site
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>

      <Alert
        variant='default'
        className={styles["alertMt"]}>
        <TbAlertTriangle className={styles["alertIcon"]} />
        <AlertTitle>{t((m) => m.dialogs.invoices.shareInvoiceDialog.selection.privacyNoticeTitle)}</AlertTitle>
        <AlertDescription className={styles["alertDescXs"]}>
          {t((m) => m.dialogs.invoices.shareInvoiceDialog.selection.privacyNoticeDescription)}
        </AlertDescription>
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
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const {user} = useUser();
  const [sharingMode, setSharingMode] = useState<SharingMode>("selection");
  const [copied, setCopied] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");

  const {
    currentDialog: {
      payload: {invoice},
    },
    isOpen,
    close,
  } = useDialog("SHARED__INVOICE_SHARE");

  const {shareInvoiceCallback, isSharing} = useInvoiceShare();
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
   * Makes the invoice public and copies the share link to clipboard.
   * Uses toast.promise for consistent loading/success/error states.
   */
  const handleCopyLink = useCallback(() => {
    const copyLinkAction = async () => {
      const wasPrivate = !isInvoicePublic;
      // If invoice is not already public, make it public first
      if (wasPrivate && sharingMode === "public") {
        await shareInvoiceCallback(invoice.id, {type: "togglePublic"});
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
      loading: isInvoicePublic
        ? t((m) => m.dialogs.invoices.shareInvoiceDialog.toasts.copyLink.loadingPublic)
        : t((m) => m.dialogs.invoices.shareInvoiceDialog.toasts.copyLink.loadingMakePublic),
      success: isInvoicePublic
        ? t((m) => m.dialogs.invoices.shareInvoiceDialog.toasts.copyLink.successPublic)
        : t((m) => m.dialogs.invoices.shareInvoiceDialog.toasts.copyLink.successMadePublic),
      error: (error: unknown) =>
        t((m) => m.dialogs.invoices.shareInvoiceDialog.toasts.copyLink.error, {
          message: error instanceof Error ? error.message : String(error),
        }),
    });
  }, [invoice.id, isInvoicePublic, shareInvoiceCallback, router, sharingMode, shareUrl, t]);

  /**
   * Makes the invoice public and copies the QR code image to clipboard.
   * Uses toast.promise for consistent loading/success/error states.
   */
  const handleCopyQRCode = useCallback(() => {
    const copyQRCodeAction = async () => {
      const wasPrivate = !isInvoicePublic;
      // If invoice is not already public, make it public first
      if (wasPrivate && sharingMode === "public") {
        await shareInvoiceCallback(invoice.id, {type: "togglePublic"});
      }

      const qrCodeElement = document.querySelector("#invoice-qr-code");
      if (!qrCodeElement) {
        throw new Error(t((m) => m.dialogs.invoices.shareInvoiceDialog.errors.qrNotFound));
      }

      await copySvgToClipboard(qrCodeElement);

      // Refresh the page data if sharing state changed
      if (wasPrivate) {
        router.refresh();
      }
    };

    toast.promise(copyQRCodeAction(), {
      loading: isInvoicePublic
        ? t((m) => m.dialogs.invoices.shareInvoiceDialog.toasts.copyQr.loadingPublic)
        : t((m) => m.dialogs.invoices.shareInvoiceDialog.toasts.copyQr.loadingMakePublic),
      success: isInvoicePublic
        ? t((m) => m.dialogs.invoices.shareInvoiceDialog.toasts.copyQr.successPublic)
        : t((m) => m.dialogs.invoices.shareInvoiceDialog.toasts.copyQr.successMadePublic),
      error: (error: unknown) =>
        t((m) => m.dialogs.invoices.shareInvoiceDialog.toasts.copyQr.error, {
          message: error instanceof Error ? error.message : String(error),
        }),
    });
  }, [invoice.id, isInvoicePublic, shareInvoiceCallback, router, sharingMode, t]);

  /**
   * Sends an email invitation to share the invoice privately through the shared hook.
   */
  const handleSendEmail = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!email) return;

      await shareInvoiceCallback(invoice.id, {
        type: "sendEmail",
        to: email,
        locale,
        fromUsername: user?.fullName ?? user?.username ?? undefined,
        ...(user?.emailAddresses[0]?.emailAddress ? {replyTo: user.emailAddresses[0].emailAddress} : {}),
      });
      setEmail("");
    },
    [email, invoice.id, locale, shareInvoiceCallback, user],
  );

  /**
   * Revokes public access from the invoice by removing LAST_GUID from sharedWith.
   * Uses toast.promise for consistent loading/success/error states.
   */
  const handleRevokeAccess = useCallback(() => {
    toast.promise(shareInvoiceCallback(invoice.id, {type: "revoke"}), {
      loading: t((m) => m.dialogs.invoices.shareInvoiceDialog.toasts.revoke.loading),
      success: t((m) => m.dialogs.invoices.shareInvoiceDialog.toasts.revoke.success),
      error: (error: unknown) =>
        t((m) => m.dialogs.invoices.shareInvoiceDialog.toasts.revoke.error, {
          message: error instanceof Error ? error.message : String(error),
        }),
    });
  }, [invoice.id, shareInvoiceCallback, t]);

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
      return t((m) => m.dialogs.invoices.shareInvoiceDialog.dialogDescription.currentlyPublic, {invoiceName: invoice.name});
    }
    switch (sharingMode) {
      case "selection":
        return t((m) => m.dialogs.invoices.shareInvoiceDialog.dialogDescription.selection, {invoiceName: invoice.name});
      case "public":
        return t((m) => m.dialogs.invoices.shareInvoiceDialog.dialogDescription.public, {invoiceName: invoice.name});
      case "private":
        return t((m) => m.dialogs.invoices.shareInvoiceDialog.dialogDescription.private, {invoiceName: invoice.name});
      default:
        return "";
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={handleOpenChange}>
      <DialogContent className={styles["dialogContentMd"]}>
        <DialogHeader>
          <DialogTitle>{t((m) => m.dialogs.invoices.shareInvoiceDialog.title)}</DialogTitle>
          <DialogDescription>{getDialogDescription()}</DialogDescription>
        </DialogHeader>

        {isInvoicePublic ? (
          <AlreadyPublicMode
            shareUrl={shareUrl}
            copied={copied}
            onCopyLink={handleCopyLink}
            onCopyQRCode={handleCopyQRCode}
            onRevokeAccess={handleRevokeAccess}
            isRevoking={isSharing}
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
                isSending={isSharing}
              />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

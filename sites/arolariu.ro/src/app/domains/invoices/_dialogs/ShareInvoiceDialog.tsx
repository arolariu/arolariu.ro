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
import React, {useCallback, useMemo, useState} from "react";
import {TbAlertTriangle, TbGlobe, TbLock} from "react-icons/tb";
import {useDialog} from "../_contexts/DialogContext";
import {copySvgToClipboard} from "../_utils";
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
function SelectionMode({onSelectPublic, onSelectPrivate}: SelectionModeProps): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <p className='text-muted-foreground text-sm'>Choose how you want to share this invoice. Your choice affects who can access it.</p>

      <div className='grid gap-4'>
        <Card
          className='hover:border-primary hover:bg-accent/50 cursor-pointer transition-colors'
          onClick={onSelectPublic}>
          <CardHeader className='flex flex-row items-start gap-4 space-y-0 pb-4'>
            <div className='flex size-12 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30'>
              <TbGlobe className='size-6 text-orange-600 dark:text-orange-400' />
            </div>
            <div className='flex-1 space-y-1'>
              <CardTitle className='text-base'>Public Sharing</CardTitle>
              <CardDescription className='text-sm'>
                Generate a link or QR code that <strong>anyone</strong> can use to view this invoice.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card
          className='hover:border-primary hover:bg-accent/50 cursor-pointer transition-colors'
          onClick={onSelectPrivate}>
          <CardHeader className='flex flex-row items-start gap-4 space-y-0 pb-4'>
            <div className='flex size-12 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30'>
              <TbLock className='size-6 text-green-600 dark:text-green-400' />
            </div>
            <div className='flex-1 space-y-1'>
              <CardTitle className='text-base'>Private Sharing</CardTitle>
              <CardDescription className='text-sm'>
                Send an email invitation to a <strong>specific person</strong>. Only they will have access.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>

      <Alert
        variant='default'
        className='mt-4'>
        <TbAlertTriangle className='size-4' />
        <AlertTitle>Privacy Notice</AlertTitle>
        <AlertDescription className='text-xs'>
          Public links can be accessed by anyone who has the URL. Private sharing restricts access to the specific recipient.
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
  const [sharingMode, setSharingMode] = useState<SharingMode>("selection");
  const [copied, setCopied] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [isRevoking, setIsRevoking] = useState<boolean>(false);

  const {
    currentDialog: {payload},
    isOpen,
    open,
    close,
  } = useDialog("SHARED__INVOICE_SHARE");

  const invoice = payload as Invoice;
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
      // If invoice is not already public, make it public first
      if (!isInvoicePublic && sharingMode === "public") {
        await makeInvoicePublic();
      }
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    toast.promise(copyLinkAction(), {
      loading: isInvoicePublic ? "Copying link..." : "Making invoice public...",
      success: isInvoicePublic ? "Link copied to clipboard!" : "Invoice is now public! Link copied to clipboard.",
      error: (err: Error) => `Failed: ${err.message}`,
    });
  }, [isInvoicePublic, makeInvoicePublic, sharingMode, shareUrl]);

  /**
   * Makes the invoice public and copies the QR code image to clipboard.
   * Uses toast.promise for consistent loading/success/error states.
   */
  const handleCopyQRCode = useCallback(() => {
    const copyQRCodeAction = async () => {
      // If invoice is not already public, make it public first
      if (!isInvoicePublic && sharingMode === "public") {
        await makeInvoicePublic();
      }

      const qrCodeElement = document.querySelector("#invoice-qr-code");
      if (!qrCodeElement) {
        throw new Error("QR code element not found");
      }

      await copySvgToClipboard(qrCodeElement);
    };

    toast.promise(copyQRCodeAction(), {
      loading: isInvoicePublic ? "Copying QR code..." : "Making invoice public...",
      success: isInvoicePublic ? "QR code copied to clipboard!" : "Invoice is now public! QR code copied to clipboard.",
      error: (err: Error) => `Failed: ${err.message}`,
    });
  }, [isInvoicePublic, makeInvoicePublic, sharingMode]);

  /**
   * Sends an email invitation to share the invoice privately.
   * Uses toast.promise for consistent loading/success/error states.
   */
  const handleSendEmail = useCallback(
    (e: React.FormEvent) => {
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
        loading: `Sending invitation to ${email}...`,
        success: `Invitation sent to ${email}!`,
        error: (err: Error) => `Failed: ${err.message}`,
      });
    },
    [email, invoice.id],
  );

  /**
   * Revokes public access from the invoice by removing LAST_GUID from sharedWith.
   * Uses toast.promise for consistent loading/success/error states.
   */
  const handleRevokeAccess = useCallback(() => {
    setIsRevoking(true);

    const revokeAction = async () => {
      try {
        const newSharedWith = (invoice.sharedWith ?? []).filter((id) => id !== LAST_GUID);

        const result = await patchInvoice({
          invoiceId: invoice.id,
          payload: {sharedWith: newSharedWith},
        });

        if (!result.success) {
          throw new Error(result.error);
        }

        handleClose();
      } finally {
        setIsRevoking(false);
      }
    };

    toast.promise(revokeAction(), {
      loading: "Revoking public access...",
      success: "Invoice is now private. Existing links will no longer work.",
      error: (err: Error) => `Failed: ${err.message}`,
    });
  }, [invoice.id, invoice.sharedWith, handleClose]);

  /** Get the dialog description based on current state */
  const getDialogDescription = (): string => {
    if (isInvoicePublic) {
      return `"${invoice.name}" is currently public`;
    }
    switch (sharingMode) {
      case "selection":
        return `Choose how to share "${invoice.name}"`;
      case "public":
        return `Share "${invoice.name}" publicly`;
      case "private":
        return `Send "${invoice.name}" privately`;
      default:
        return "";
    }
  };

  return (
    <Dialog
      open={isOpen}
      // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : handleClose())}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Share Invoice</DialogTitle>
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
                onSelectPublic={() => setSharingMode("public")}
                onSelectPrivate={() => setSharingMode("private")}
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

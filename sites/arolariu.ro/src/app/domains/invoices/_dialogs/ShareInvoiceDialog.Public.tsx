/**
 * @fileoverview Public sharing components for the ShareInvoiceDialog.
 * @module domains/invoices/_dialogs/ShareInvoiceDialog.Public
 */

import {Alert, AlertDescription, AlertTitle, Button, Input, Tabs, TabsContent, TabsList, TabsTrigger} from "@arolariu/components";
import {useTranslations} from "next-intl";
import React from "react";
import {TbAlertTriangle, TbArrowLeft, TbCheck, TbCopy, TbGlobe, TbQrcode, TbShieldOff} from "react-icons/tb";
import QRCode from "react-qr-code";
import styles from "./ShareInvoiceDialog.Public.module.scss";

// ============================================================================
// Types
// ============================================================================

/** Props for the shared link/QR tabs component */
export interface ShareLinkAndQRTabsProps {
  readonly shareUrl: string;
  readonly copied: boolean;
  readonly onCopyLink: () => void;
  readonly onCopyQRCode: () => void;
}

/** Props for the already public mode component */
export interface AlreadyPublicModeProps {
  readonly shareUrl: string;
  readonly copied: boolean;
  readonly onCopyLink: () => void;
  readonly onCopyQRCode: () => void;
  readonly onRevokeAccess: () => void;
  readonly isRevoking: boolean;
}

/** Props for the public mode component */
export interface PublicModeProps {
  readonly shareUrl: string;
  readonly onBack: () => void;
  readonly copied: boolean;
  readonly onCopyLink: () => void;
  readonly onCopyQRCode: () => void;
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Shared component for link and QR code tabs.
 *
 * @remarks
 * This component provides two tabs:
 * - **Direct Link**: Displays the shareable URL with a copy button
 * - **QR Code**: Displays a scannable QR code with copy-as-image option
 *
 * @param props - Component props
 * @returns The link and QR code tabs UI
 */
export function ShareLinkAndQRTabs({shareUrl, copied, onCopyLink, onCopyQRCode}: ShareLinkAndQRTabsProps): React.JSX.Element {
  const t = useTranslations("Domains.services.invoices.ui.shareInvoiceDialogPublic");
  return (
    <Tabs
      defaultValue='link'
      className='w-full'>
      <TabsList className='grid w-full grid-cols-2'>
        <TabsTrigger
          value='link'
          className='cursor-pointer'>
          <TbCopy className={styles["tabIcon"]} />
          {t("tabs.directLink")}
        </TabsTrigger>
        <TabsTrigger
          value='qr'
          className='cursor-pointer'>
          <TbQrcode className={styles["tabIcon"]} />
          {t("tabs.qrCode")}
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value='link'
        className={`mt-4 ${styles["body"]}`}>
        <div className={styles["linkRow"]}>
          <Input
            value={shareUrl}
            readOnly
            className='flex-1 font-mono text-xs'
          />
          <Button
            size='icon'
            onClick={onCopyLink}
            variant='outline'>
            {copied ? <TbCheck className={styles["actionIcon"]} /> : <TbCopy className={styles["actionIcon"]} />}
          </Button>
        </div>
        <p className={styles["linkHint"]}>{t("hints.link")}</p>
      </TabsContent>

      <TabsContent
        value='qr'
        className='mt-4'>
        <div className={styles["qrContainer"]}>
          <div className={styles["qrWrapper"]}>
            <QRCode
              id='invoice-qr-code'
              value={shareUrl}
              size={128}
              style={{width: "128px"}}
              className={styles["qrCode"]}
              level='L'
            />
          </div>
          <p className={styles["qrHint"]}>{t("hints.qr")}</p>
          <Button
            variant='outline'
            onClick={onCopyQRCode}
            className='w-full'>
            <TbCopy className={styles["tabIcon"]} />
            {t("copyQrImage")}
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );
}

/**
 * Renders the already-public mode with options to copy or revoke access.
 *
 * @remarks
 * Displayed when the invoice is already publicly shared. Shows:
 * - Warning alert indicating public status
 * - Link and QR code sharing options
 * - Revoke access button to make the invoice private again
 *
 * @param props - Component props
 * @returns The already-public mode UI
 */
export function AlreadyPublicMode({
  shareUrl,
  copied,
  onCopyLink,
  onCopyQRCode,
  onRevokeAccess,
  isRevoking,
}: AlreadyPublicModeProps): React.JSX.Element {
  const t = useTranslations("Domains.services.invoices.ui.shareInvoiceDialogPublic");
  return (
    <div className={styles["body"]}>
      <Alert
        variant='destructive'
        className='border-orange-500/50 bg-orange-50 text-orange-900 dark:bg-orange-950/30 dark:text-orange-200'>
        <TbGlobe className={styles["globeAlertIcon"]} />
        <AlertTitle className='text-orange-800 dark:text-orange-300'>{t("alreadyPublic.title")}</AlertTitle>
        <AlertDescription className='text-xs text-orange-700 dark:text-orange-400'>
          {t.rich("alreadyPublic.description", {strong: (chunks) => <strong>{chunks}</strong>})}
        </AlertDescription>
      </Alert>

      <ShareLinkAndQRTabs
        shareUrl={shareUrl}
        copied={copied}
        onCopyLink={onCopyLink}
        onCopyQRCode={onCopyQRCode}
      />

      <div className={styles["revokeSection"]}>
        <Button
          variant='destructive'
          onClick={onRevokeAccess}
          disabled={isRevoking}
          className='w-full'>
          <TbShieldOff className={styles["tabIcon"]} />
          {isRevoking ? t("alreadyPublic.revoking") : t("alreadyPublic.revoke")}
        </Button>
        <p className={styles["revokeHint"]}>{t("alreadyPublic.revokeHint")}</p>
      </div>
    </div>
  );
}

/**
 * Renders the public sharing mode with link and QR code tabs.
 *
 * @remarks
 * Displayed when the user selects "Public Sharing" option. Shows:
 * - Back button to return to selection
 * - Warning about public access implications
 * - Link and QR code sharing options
 *
 * @param props - Component props
 * @returns The public sharing mode UI
 */
export function PublicMode({onBack, shareUrl, copied, onCopyLink, onCopyQRCode}: PublicModeProps): React.JSX.Element {
  const t = useTranslations("Domains.services.invoices.ui.shareInvoiceDialogPublic");
  return (
    <div className={styles["body"]}>
      <Button
        variant='ghost'
        size='sm'
        onClick={onBack}
        className='mb-2 -ml-2'>
        <TbArrowLeft className={styles["backIcon"]} />
        {t("backToOptions")}
      </Button>

      <Alert
        variant='destructive'
        className='border-orange-500/50 bg-orange-50 text-orange-900 dark:bg-orange-950/30 dark:text-orange-200'>
        <TbAlertTriangle className={styles["globeAlertIcon"]} />
        <AlertTitle className='text-orange-800 dark:text-orange-300'>{t("warning.title")}</AlertTitle>
        <AlertDescription className='text-xs text-orange-700 dark:text-orange-400'>
          {t.rich("warning.description", {strong: (chunks) => <strong>{chunks}</strong>})}
        </AlertDescription>
      </Alert>

      <ShareLinkAndQRTabs
        shareUrl={shareUrl}
        copied={copied}
        onCopyLink={onCopyLink}
        onCopyQRCode={onCopyQRCode}
      />
    </div>
  );
}

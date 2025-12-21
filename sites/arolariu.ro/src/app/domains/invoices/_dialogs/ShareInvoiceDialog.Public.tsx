/**
 * @fileoverview Public sharing components for the ShareInvoiceDialog.
 * @module domains/invoices/_dialogs/ShareInvoiceDialog.Public
 */

import {Alert, AlertDescription, AlertTitle, Button, Input, Tabs, TabsContent, TabsList, TabsTrigger} from "@arolariu/components";
import React from "react";
import {TbAlertTriangle, TbArrowLeft, TbCheck, TbCopy, TbGlobe, TbQrcode, TbShieldOff} from "react-icons/tb";
import QRCode from "react-qr-code";

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
  return (
    <Tabs
      defaultValue='link'
      className='w-full'>
      <TabsList className='grid w-full grid-cols-2'>
        <TabsTrigger
          value='link'
          className='cursor-pointer'>
          <TbCopy className='mr-2 size-4' />
          Direct Link
        </TabsTrigger>
        <TabsTrigger
          value='qr'
          className='cursor-pointer'>
          <TbQrcode className='mr-2 size-4' />
          QR Code
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value='link'
        className='mt-4 space-y-4'>
        <div className='flex items-center space-x-2'>
          <Input
            value={shareUrl}
            readOnly
            className='flex-1 font-mono text-xs'
          />
          <Button
            size='icon'
            onClick={onCopyLink}
            variant='outline'>
            {copied ? <TbCheck className='size-4' /> : <TbCopy className='size-4' />}
          </Button>
        </div>
        <p className='text-muted-foreground text-xs'>
          Copy this link and share it. Anyone who receives it will be able to view the invoice.
        </p>
      </TabsContent>

      <TabsContent
        value='qr'
        className='mt-4'>
        <div className='flex flex-col items-center justify-center space-y-4'>
          <div className='rounded-lg border bg-white p-4 shadow-sm'>
            <QRCode
              id='invoice-qr-code'
              value={shareUrl}
              size={128}
              style={{width: "128px"}}
              className='rounded-md'
              level='L'
            />
          </div>
          <p className='text-muted-foreground text-center text-xs'>Anyone who scans this QR code will be directed to view the invoice.</p>
          <Button
            variant='outline'
            onClick={onCopyQRCode}
            className='w-full'>
            <TbCopy className='mr-2 size-4' />
            Copy QR Code as Image
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
  return (
    <div className='space-y-4'>
      <Alert
        variant='destructive'
        className='border-orange-500/50 bg-orange-50 text-orange-900 dark:bg-orange-950/30 dark:text-orange-200'>
        <TbGlobe className='size-4 text-orange-600 dark:text-orange-400' />
        <AlertTitle className='text-orange-800 dark:text-orange-300'>This Invoice is Currently Public</AlertTitle>
        <AlertDescription className='text-xs text-orange-700 dark:text-orange-400'>
          This invoice is publicly accessible. <strong>Anyone with the link can view it</strong>, including all invoice details, items, and
          amounts. You can revoke public access at any time to make it private again.
        </AlertDescription>
      </Alert>

      <ShareLinkAndQRTabs
        shareUrl={shareUrl}
        copied={copied}
        onCopyLink={onCopyLink}
        onCopyQRCode={onCopyQRCode}
      />

      <div className='border-t pt-4'>
        <Button
          variant='destructive'
          onClick={onRevokeAccess}
          disabled={isRevoking}
          className='w-full'>
          <TbShieldOff className='mr-2 size-4' />
          {isRevoking ? "Revoking Access..." : "Revoke Public Access"}
        </Button>
        <p className='text-muted-foreground mt-2 text-center text-xs'>
          This will make the invoice private. Existing links will stop working.
        </p>
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
  return (
    <div className='space-y-4'>
      <Button
        variant='ghost'
        size='sm'
        onClick={onBack}
        className='mb-2 -ml-2'>
        <TbArrowLeft className='mr-1 size-4' />
        Back to options
      </Button>

      <Alert
        variant='destructive'
        className='border-orange-500/50 bg-orange-50 text-orange-900 dark:bg-orange-950/30 dark:text-orange-200'>
        <TbAlertTriangle className='size-4 text-orange-600 dark:text-orange-400' />
        <AlertTitle className='text-orange-800 dark:text-orange-300'>Public Access Warning</AlertTitle>
        <AlertDescription className='text-xs text-orange-700 dark:text-orange-400'>
          By sharing this invoice publicly, <strong>anyone with the link will be able to view it</strong>. This includes all invoice
          details, items, and amounts. Only proceed if you intend to make this invoice accessible to the public.
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

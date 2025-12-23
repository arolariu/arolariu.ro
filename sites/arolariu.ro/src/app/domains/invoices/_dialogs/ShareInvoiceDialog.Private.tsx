/**
 * @fileoverview Private sharing components for the ShareInvoiceDialog.
 * @module domains/invoices/_dialogs/ShareInvoiceDialog.Private
 */

import {Alert, AlertDescription, AlertTitle, Button, Input, Label} from "@arolariu/components";
import React from "react";
import {TbArrowLeft, TbLock, TbMail} from "react-icons/tb";

// ============================================================================
// Types
// ============================================================================

/** Props for the private mode component */
export interface PrivateModeProps {
  readonly onBack: () => void;
  readonly email: string;
  readonly onEmailChange: (email: string) => void;
  readonly onSendEmail: (e: React.FormEvent) => void;
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Renders the private sharing mode with email form.
 *
 * @remarks
 * Displayed when the user selects "Private Sharing" option. Shows:
 * - Back button to return to selection
 * - Informational alert about private sharing
 * - Email input form with validation
 * - Send invitation button
 *
 * Email validation uses a simple regex pattern for client-side validation.
 *
 * @param props - Component props
 * @returns The private sharing mode UI
 */
export function PrivateMode({onBack, email, onEmailChange, onSendEmail}: PrivateModeProps): React.JSX.Element {
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
        variant='default'
        className='border-green-500/50 bg-green-50 text-green-900 dark:bg-green-950/30 dark:text-green-200'>
        <TbLock className='size-4 text-green-600 dark:text-green-400' />
        <AlertTitle className='text-green-800 dark:text-green-300'>Private Sharing</AlertTitle>
        <AlertDescription className='text-xs text-green-700 dark:text-green-400'>
          The invitation will be sent directly to the email address you specify. Only this recipient will receive access to view the
          invoice.
        </AlertDescription>
      </Alert>

      <form
        onSubmit={onSendEmail}
        className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='email'>Recipient&apos;s Email Address</Label>
          <Input
            id='email'
            type='email'
            placeholder='name@example.com'
            value={email}
            // eslint-disable-next-line react/jsx-no-bind -- input always changes.
            onChange={(e) => onEmailChange(e.target.value)}
            required
          />
          <p className='text-muted-foreground text-xs'>
            An email invitation will be sent to this address with a private link to view the invoice.
          </p>
        </div>
        <Button
          type='submit'
          // eslint-disable-next-line sonarjs/slow-regex -- client-side validation
          disabled={!email || !/\S+@\S+\.\S+/u.test(email)}
          className='w-full'>
          <TbMail className='mr-2 size-4' />
          Send Private Invitation
        </Button>
      </form>
    </div>
  );
}

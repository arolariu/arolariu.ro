/**
 * @fileoverview Private sharing components for the ShareInvoiceDialog.
 * @module domains/invoices/_dialogs/ShareInvoiceDialog.Private
 */

import {Alert, AlertDescription, AlertTitle, Button, Input, Label} from "@arolariu/components";
import {useTranslations} from "next-intl";
import React from "react";
import {TbArrowLeft, TbLock, TbMail} from "react-icons/tb";
import styles from "./ShareInvoiceDialog.Private.module.scss";

// ============================================================================
// Types
// ============================================================================

/** Props for the private mode component */
export interface PrivateModeProps {
  readonly onBack: () => void;
  readonly email: string;
  readonly onEmailChange: (email: string) => void;
  readonly onSendEmail: (e: React.FormEvent) => void;
  readonly isSending?: boolean;
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
 * - Send invitation button (now functional via /api/email)
 *
 * Email validation uses HTML5 email input type for client-side validation.
 * The button is disabled while sending to prevent duplicate requests.
 *
 * @param props - Component props
 * @returns The private sharing mode UI
 */
export function PrivateMode({onBack, email, onEmailChange, onSendEmail, isSending = false}: PrivateModeProps): React.JSX.Element {
  const t = useTranslations("Invoices.Shared.shareInvoiceDialogPrivate");
  return (
    <div className={styles["body"]}>
      <Button
        variant='ghost'
        size='sm'
        onClick={onBack}
        className={styles["backButtonMl"]}>
        <TbArrowLeft className={styles["backIcon"]} />
        {t("backToOptions")}
      </Button>

      <Alert
        variant='default'
        className={styles["alertGreen"]}>
        <TbLock className={styles["lockIcon"]} />
        <AlertTitle className={styles["alertGreenTitle"]}>{t("title")}</AlertTitle>
        <AlertDescription className={styles["alertGreenDesc"]}>{t("description")}</AlertDescription>
      </Alert>

      <form
        onSubmit={onSendEmail}
        className={styles["formBody"]}>
        <div className={styles["fieldGroup"]}>
          <Label htmlFor='email'>{t("emailLabel")}</Label>
          <Input
            id='email'
            type='email'
            placeholder={t("emailPlaceholder")}
            value={email}
            // eslint-disable-next-line react/jsx-no-bind -- input always changes.
            onChange={(e) => onEmailChange(e.target.value)}
            disabled={isSending}
            required
          />
          <p className={styles["emailHint"]}>{t("emailHint")}</p>
        </div>
        <Button
          type='submit'
          disabled={isSending || !email}
          className={styles["buttonFull"]}>
          <TbMail className={styles["mailIcon"]} />
          {isSending ? t("sending") : t("sendInvitation")}
        </Button>
      </form>
    </div>
  );
}

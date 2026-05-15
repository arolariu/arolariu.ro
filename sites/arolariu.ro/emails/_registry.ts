import "server-only";

import type {EmailTemplate} from "./_lib/defineEmailTemplate";

import WelcomeEmail from "./accounts/WelcomeEmail";
import FirstInvoiceUploadedEmail from "./invoices/FirstInvoiceUploadedEmail";
import InvoiceHasBeenAnalyzedEmail from "./invoices/InvoiceHasBeenAnalyzedEmail";
import InvoiceHasBeenDeletedEmail from "./invoices/InvoiceHasBeenDeletedEmail";
import InvoiceHasBeenMadePublicEmail from "./invoices/InvoiceHasBeenMadePublicEmail";
import InvoiceHasBeenSharedWithEmail from "./invoices/InvoiceHasBeenSharedWithEmail";
import InvoiceHasBeenUnsharedWithEmail from "./invoices/InvoiceHasBeenUnsharedWithEmail";
import SpendingThresholdAlertEmail from "./invoices/alerts/SpendingThresholdAlertEmail";
import InvoiceUploadInactivityReminderEmail from "./invoices/inactivity/InvoiceUploadInactivityReminderEmail";
import InvoiceStatisticsEmail from "./invoices/statistics/InvoiceStatisticsEmail";
import UserHasBeenSubscribedEmail from "./newsletter/UserHasBeenSubscribedEmail";
import UserHasUnsubscribedEmail from "./newsletter/UserHasUnsubscribedEmail";

/**
 * A registry entry binds a stable key to a template and, optionally, a
 * partial set of pre-filled props (a *variant*).
 *
 * @remarks
 * Variants collapse near-duplicate templates that differ only in a small
 * set of props (e.g., the 3/7/14/30-day inactivity reminders all render
 * `InvoiceUploadInactivityReminderEmail` with a different
 * `daysWithoutUpload`). The {@link sendEmail} action merges `variantProps`
 * over the caller's `props` so callers cannot accidentally override a
 * fixed variant value.
 */
type EntryFor<T> = T extends EmailTemplate<infer P>
  ? Readonly<{
      readonly template: T;
      readonly variantProps?: Partial<P>;
    }>
  : never;

/**
 * Server-only registry of all sendable email templates.
 *
 * **Security:** the {@link sendEmail} server action *always* enforces a
 * Clerk session. System-triggered sends bypass the action and call
 * `emailService.sendEmail()` directly.
 */
export const emailTemplates = {
  welcome:                   {template: WelcomeEmail}                       satisfies EntryFor<typeof WelcomeEmail>,
  "first-upload":            {template: FirstInvoiceUploadedEmail}          satisfies EntryFor<typeof FirstInvoiceUploadedEmail>,
  "invoice-analyzed":        {template: InvoiceHasBeenAnalyzedEmail}        satisfies EntryFor<typeof InvoiceHasBeenAnalyzedEmail>,
  "invoice-deleted":         {template: InvoiceHasBeenDeletedEmail}         satisfies EntryFor<typeof InvoiceHasBeenDeletedEmail>,
  "invoice-made-public":     {template: InvoiceHasBeenMadePublicEmail}      satisfies EntryFor<typeof InvoiceHasBeenMadePublicEmail>,
  "invoice-shared":          {template: InvoiceHasBeenSharedWithEmail}      satisfies EntryFor<typeof InvoiceHasBeenSharedWithEmail>,
  "invoice-unshared":        {template: InvoiceHasBeenUnsharedWithEmail}    satisfies EntryFor<typeof InvoiceHasBeenUnsharedWithEmail>,
  "spending-alert":          {template: SpendingThresholdAlertEmail}        satisfies EntryFor<typeof SpendingThresholdAlertEmail>,
  "newsletter-subscribed":   {template: UserHasBeenSubscribedEmail}         satisfies EntryFor<typeof UserHasBeenSubscribedEmail>,
  "newsletter-unsubscribed": {template: UserHasUnsubscribedEmail}           satisfies EntryFor<typeof UserHasUnsubscribedEmail>,

  "inactivity-3d":  {template: InvoiceUploadInactivityReminderEmail, variantProps: {daysWithoutUpload: 3}}  satisfies EntryFor<typeof InvoiceUploadInactivityReminderEmail>,
  "inactivity-7d":  {template: InvoiceUploadInactivityReminderEmail, variantProps: {daysWithoutUpload: 7}}  satisfies EntryFor<typeof InvoiceUploadInactivityReminderEmail>,
  "inactivity-14d": {template: InvoiceUploadInactivityReminderEmail, variantProps: {daysWithoutUpload: 14}} satisfies EntryFor<typeof InvoiceUploadInactivityReminderEmail>,
  "inactivity-30d": {template: InvoiceUploadInactivityReminderEmail, variantProps: {daysWithoutUpload: 30}} satisfies EntryFor<typeof InvoiceUploadInactivityReminderEmail>,

  "stats-daily":   {template: InvoiceStatisticsEmail, variantProps: {frequency: "daily"}}   satisfies EntryFor<typeof InvoiceStatisticsEmail>,
  "stats-weekly":  {template: InvoiceStatisticsEmail, variantProps: {frequency: "weekly"}}  satisfies EntryFor<typeof InvoiceStatisticsEmail>,
  "stats-monthly": {template: InvoiceStatisticsEmail, variantProps: {frequency: "monthly"}} satisfies EntryFor<typeof InvoiceStatisticsEmail>,
  "stats-yearly":  {template: InvoiceStatisticsEmail, variantProps: {frequency: "yearly"}}  satisfies EntryFor<typeof InvoiceStatisticsEmail>,
} as const;

/** All stable template keys callable via {@link sendEmail}. */
export type EmailTemplateKey = keyof typeof emailTemplates;

/**
 * Per-key prop map for the caller side: the template's full props minus
 * the keys the registry's `variantProps` pre-fills.
 */
export type EmailTemplatePropsMap = {
  [K in EmailTemplateKey]: (typeof emailTemplates)[K] extends {
    template: EmailTemplate<infer P>;
    variantProps?: infer V;
  }
    ? Omit<P, V extends object ? keyof V : never>
    : never;
};

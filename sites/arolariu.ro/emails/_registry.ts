/**
 * @fileoverview Server-side registry mapping template keys to {component, namespace}.
 * @module emails/_registry
 *
 * @remarks
 * Used by the generic `sendEmail` server action and by webhook routes that
 * call `emailService.sendEmail()` directly.
 *
 * Security: There is intentionally no `requiresAuth` flag. The `sendEmail`
 * server action ALWAYS enforces a Clerk session — system-triggered sends
 * bypass the action entirely and call `emailService` directly (server-internal).
 */

import "server-only";

import WelcomeEmail from "./accounts/WelcomeEmail";
import FirstInvoiceUploadedEmail from "./invoices/FirstInvoiceUploadedEmail";
import InvoiceHasBeenAnalyzedEmail from "./invoices/InvoiceHasBeenAnalyzedEmail";
import InvoiceHasBeenDeletedEmail from "./invoices/InvoiceHasBeenDeletedEmail";
import InvoiceHasBeenMadePublicEmail from "./invoices/InvoiceHasBeenMadePublicEmail";
import InvoiceHasBeenSharedWithEmail from "./invoices/InvoiceHasBeenSharedWithEmail";
import InvoiceHasBeenUnsharedWithEmail from "./invoices/InvoiceHasBeenUnsharedWithEmail";
import SpendingThresholdAlertEmail from "./invoices/alerts/SpendingThresholdAlertEmail";
import UserHasBeenSubscribedEmail from "./newsletter/UserHasBeenSubscribedEmail";
import UserHasUnsubscribedEmail from "./newsletter/UserHasUnsubscribedEmail";

type AsyncTemplate = (props: never) => Promise<React.ReactElement>;

type TemplateEntry<C extends AsyncTemplate> = Readonly<{
  readonly component: C;
  /** Full next-intl namespace, e.g. "email.welcome". The "subject" key under it is read by getEmailSubject. */
  readonly namespace: string;
}>;

export const emailTemplates = {
  "welcome":                 {component: WelcomeEmail,                    namespace: "email.welcome"               } as TemplateEntry<typeof WelcomeEmail>,
  "first-upload":            {component: FirstInvoiceUploadedEmail,       namespace: "email.firstInvoiceUploaded"  } as TemplateEntry<typeof FirstInvoiceUploadedEmail>,
  "invoice-analyzed":        {component: InvoiceHasBeenAnalyzedEmail,     namespace: "email.invoiceAnalyzed"       } as TemplateEntry<typeof InvoiceHasBeenAnalyzedEmail>,
  "invoice-deleted":         {component: InvoiceHasBeenDeletedEmail,      namespace: "email.invoiceDeleted"        } as TemplateEntry<typeof InvoiceHasBeenDeletedEmail>,
  "invoice-made-public":     {component: InvoiceHasBeenMadePublicEmail,   namespace: "email.invoiceMadePublic"     } as TemplateEntry<typeof InvoiceHasBeenMadePublicEmail>,
  "invoice-shared":          {component: InvoiceHasBeenSharedWithEmail,   namespace: "email.invoiceShared"         } as TemplateEntry<typeof InvoiceHasBeenSharedWithEmail>,
  "invoice-unshared":        {component: InvoiceHasBeenUnsharedWithEmail, namespace: "email.invoiceUnshared"       } as TemplateEntry<typeof InvoiceHasBeenUnsharedWithEmail>,
  "spending-alert":          {component: SpendingThresholdAlertEmail,     namespace: "email.spendingAlert"         } as TemplateEntry<typeof SpendingThresholdAlertEmail>,
  "newsletter-subscribed":   {component: UserHasBeenSubscribedEmail,      namespace: "email.newsletterSubscribed"  } as TemplateEntry<typeof UserHasBeenSubscribedEmail>,
  "newsletter-unsubscribed": {component: UserHasUnsubscribedEmail,        namespace: "email.newsletterUnsubscribed"} as TemplateEntry<typeof UserHasUnsubscribedEmail>,
} as const;

export type EmailTemplateKey = keyof typeof emailTemplates;

type AsyncComponentProps<T> = T extends (props: infer P) => Promise<unknown> ? P : never;

export type EmailTemplatePropsMap = {
  [K in EmailTemplateKey]: AsyncComponentProps<typeof emailTemplates[K]["component"]>;
};

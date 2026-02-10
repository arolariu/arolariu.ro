/**
 * @fileoverview Reminder email for invoices awaiting AI analysis.
 * @module emails/invoices/reminders/UnanalyzedInvoicesReminderEmail
 *
 * @remarks
 * This template is sent when a user has uploaded invoices but hasn't triggered
 * AI analysis on them. It explains the value of analysis (item extraction,
 * allergen detection, recipe suggestions) and provides a direct CTA.
 *
 * **Triggering Condition**: User has 1+ invoices where `additionalMetadata.requiresAnalysis`
 * is unset or the invoice has no items extracted, 24-48 hours after upload.
 *
 * **Rendering Context**: React Email Component (renders to HTML email).
 *
 * **Design Philosophy**: Helpful and informative — focuses on what the user is
 * missing out on rather than creating urgency. Shows specific invoice names
 * to make the CTA feel actionable.
 *
 * @see {@link InvoiceHasBeenAnalyzedEmail} - Sent after analysis completes
 * @see {@link IncompleteInvoiceReminderEmail} - For partially analyzed invoices
 */

import {Link, Text} from "@react-email/components";
import {BRAND, BulletList, EmailCard, EmailLayout, EmailLinkStyles, EmailParagraphStyles, KeyValueTable} from "../../_components";

/**
 * Represents a single unanalyzed invoice for display in the email.
 */
type UnanalyzedInvoice = Readonly<{
  /** Invoice name or fallback identifier. */
  readonly name: string;

  /** Human-readable upload date (e.g., "February 8, 2026"). */
  readonly uploadDate: string;

  /** Direct link to view/analyze this specific invoice. */
  readonly url: string;
}>;

/**
 * Properties for the UnanalyzedInvoicesReminderEmail component.
 */
type Props = Readonly<{
  /** User's display name. Falls back to "there" if empty. */
  readonly username: string;

  /** List of invoices awaiting analysis (max 5 shown in email). */
  readonly invoices: readonly UnanalyzedInvoice[];

  /** Link to the invoices list page. */
  readonly invoicesUrl?: string;
}>;

/**
 * React component that renders the "Unanalyzed Invoices Reminder" email.
 *
 * @remarks
 * **Rendering Context**: React Email.
 *
 * **Content Strategy**:
 * - Count of pending invoices in heading
 * - KeyValueTable listing each invoice by name and date
 * - "What analysis provides" feature card
 * - Primary CTA to view invoices
 *
 * @param props - User details and unanalyzed invoice list.
 * @returns A rendered React Email template.
 *
 * @example
 * ```tsx
 * <UnanalyzedInvoicesReminderEmail
 *   username="Sarah Chen"
 *   invoices={[
 *     {name: "Lidl Groceries", uploadDate: "Feb 8, 2026", url: "https://arolariu.ro/domains/invoices/view-invoice/abc"},
 *     {name: "Kaufland Receipt", uploadDate: "Feb 9, 2026", url: "https://arolariu.ro/domains/invoices/view-invoice/def"},
 *   ]}
 * />
 * ```
 */
const UnanalyzedInvoicesReminderEmail = (props: Readonly<Props>) => {
  const {username, invoices, invoicesUrl} = props;

  const name = username?.trim() ? username : "there";
  const effectiveInvoicesUrl = invoicesUrl ?? `${BRAND.url}/domains/invoices/view-invoices`;
  const count = invoices.length;
  const displayInvoices = invoices.slice(0, 5);

  return (
    <EmailLayout
      title={`${BRAND.name} | Invoices awaiting analysis`}
      preview={`${name}, you have ${count} invoice${count === 1 ? "" : "s"} waiting for AI analysis.`}
      badge='Reminder'
      heading={`${count} invoice${count === 1 ? "" : "s"} waiting for analysis`}
      primaryCta={{href: effectiveInvoicesUrl, label: "View invoices"}}
      showUnsubscribe
      unsubscribeUrl={`${BRAND.url}/unsubscribe`}
      managePreferencesUrl={`${BRAND.url}/settings/notifications`}>
      <Text style={EmailParagraphStyles}>Hi {name},</Text>

      <Text style={EmailParagraphStyles}>
        You have {count} invoice{count === 1 ? "" : "s"} that {count === 1 ? "hasn't" : "haven't"} been analyzed yet. Running our AI
        analysis unlocks the full value of your uploaded receipts.
      </Text>

      <KeyValueTable
        title='Invoices awaiting analysis'
        items={displayInvoices.map((invoice) => ({
          label: invoice.name,
          value: `Uploaded ${invoice.uploadDate}`,
        }))}
      />

      {count > 5 ? (
        <Text style={{...EmailParagraphStyles, fontSize: "13px"}}>
          …and {count - 5} more. View all in your{" "}
          <Link
            href={effectiveInvoicesUrl}
            style={EmailLinkStyles}>
            dashboard
          </Link>
          .
        </Text>
      ) : null}

      <EmailCard title='What analysis provides'>
        <BulletList
          items={[
            "Line-by-line item extraction with prices and categories",
            "Merchant identification and categorization",
            "Allergen detection on food products",
            "Recipe suggestions based on your grocery items",
            "Automatic spending categorization for dashboard insights",
          ]}
        />
      </EmailCard>

      <Text style={EmailParagraphStyles}>
        Analysis typically takes under a minute per invoice. Once complete, you'll receive a notification with the results.
      </Text>

      <Text style={EmailParagraphStyles}>
        Need help? Contact us at{" "}
        <Link
          href={`mailto:${BRAND.supportEmail}`}
          style={EmailLinkStyles}>
          {BRAND.supportEmail}
        </Link>
        .
      </Text>

      <Text style={{...EmailParagraphStyles, margin: "0"}}>
        {BRAND.signOff},
        <br />
        {BRAND.teamName}
      </Text>
    </EmailLayout>
  );
};

UnanalyzedInvoicesReminderEmail.PreviewProps = {
  username: "Test User",
  invoices: [
    {name: "Lidl Groceries", uploadDate: "Feb 8, 2026", url: "https://arolariu.ro/domains/invoices/view-invoice/abc-123"},
    {name: "Kaufland Receipt", uploadDate: "Feb 9, 2026", url: "https://arolariu.ro/domains/invoices/view-invoice/def-456"},
    {name: "Mega Image — Feb 10", uploadDate: "Feb 10, 2026", url: "https://arolariu.ro/domains/invoices/view-invoice/ghi-789"},
  ],
} satisfies Props;

export default UnanalyzedInvoicesReminderEmail;

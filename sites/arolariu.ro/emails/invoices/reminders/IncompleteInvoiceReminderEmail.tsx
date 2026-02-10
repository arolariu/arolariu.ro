/**
 * @fileoverview Reminder email for invoices with incomplete or partial AI analysis.
 * @module emails/invoices/reminders/IncompleteInvoiceReminderEmail
 *
 * @remarks
 * This template is sent when AI analysis was run on an invoice but produced
 * incomplete results — for example, items were extracted but no merchant was
 * identified, or the merchant was found but no line items could be parsed.
 *
 * **Triggering Condition**: Invoice has been analyzed but is missing key fields:
 * - No merchant reference (merchantReference is empty)
 * - No items extracted (items array is empty)
 * - No payment information (totalCostAmount is 0 or null)
 * Sent 72 hours after partial analysis.
 *
 * **Rendering Context**: React Email Component (renders to HTML email).
 *
 * **Design Philosophy**: Encouraging and actionable — shows exactly what's missing
 * with specific guidance on how to fix each issue. Avoids blaming the user.
 *
 * @see {@link UnanalyzedInvoicesReminderEmail} - For invoices not yet analyzed
 * @see {@link InvoiceHasBeenAnalyzedEmail} - For successfully analyzed invoices
 */

import {Link, Text} from "@react-email/components";
import {
  BRAND,
  BulletList,
  EMAIL_COLORS,
  EmailCard,
  EmailLayout,
  EmailLinkStyles,
  EmailParagraphStyles,
  KeyValueTable,
} from "../../_components";

/**
 * Describes what's missing from an incomplete invoice.
 */
type MissingField = "merchant" | "items" | "payment" | "category";

/**
 * Properties for the IncompleteInvoiceReminderEmail component.
 */
type Props = Readonly<{
  /** User's display name. Falls back to "there" if empty. */
  readonly username: string;

  /** Name or identifier of the incomplete invoice. */
  readonly invoiceName: string;

  /** Human-readable date of the analysis attempt (e.g., "February 8, 2026"). */
  readonly analysisDate: string;

  /** List of missing or incomplete fields. */
  readonly missingFields: readonly MissingField[];

  /** Direct link to edit this invoice. */
  readonly editInvoiceUrl: string;

  /** Direct link to re-run analysis on this invoice. */
  readonly reanalyzeUrl?: string;
}>;

/**
 * Maps a missing field to a human-readable description and action suggestion.
 *
 * @param field - The missing field identifier.
 * @returns Object with label and suggestion text.
 */
function describeField(field: MissingField): {label: string; suggestion: string} {
  switch (field) {
    case "merchant":
      return {
        label: "Merchant",
        suggestion: "Add the store name manually in the edit view",
      };
    case "items":
      return {
        label: "Line items",
        suggestion: "Try re-uploading a clearer photo, or add items manually",
      };
    case "payment":
      return {
        label: "Payment info",
        suggestion: "Enter the total amount and payment method in the edit view",
      };
    case "category":
      return {
        label: "Invoice category",
        suggestion: "Select a category (groceries, fast food, household, etc.)",
      };
  }
}

/**
 * React component that renders the "Incomplete Invoice Reminder" email.
 *
 * @remarks
 * **Rendering Context**: React Email.
 *
 * **Content Strategy**:
 * - Invoice summary with analysis date
 * - Missing fields list with specific suggestions
 * - Tips card for improving analysis results
 * - Primary CTA: edit invoice
 * - Optional secondary CTA: re-run analysis
 *
 * @param props - User details and incomplete invoice information.
 * @returns A rendered React Email template.
 *
 * @example
 * ```tsx
 * <IncompleteInvoiceReminderEmail
 *   username="Sarah Chen"
 *   invoiceName="Blurry Receipt #42"
 *   analysisDate="February 8, 2026"
 *   missingFields={["merchant", "items"]}
 *   editInvoiceUrl="https://arolariu.ro/domains/invoices/edit-invoice/abc-123"
 * />
 * ```
 */
const IncompleteInvoiceReminderEmail = (props: Readonly<Props>) => {
  const {username, invoiceName, analysisDate, missingFields, editInvoiceUrl, reanalyzeUrl} = props;

  const name = username?.trim() ? username : "there";
  const descriptions = missingFields.map(describeField);

  return (
    <EmailLayout
      title={`${BRAND.name} | Incomplete invoice`}
      preview={`${name}, your invoice "${invoiceName}" needs some attention.`}
      badge='Reminder'
      heading='Your invoice needs a quick update'
      primaryCta={{href: editInvoiceUrl, label: "Complete your invoice"}}
      secondaryCta={reanalyzeUrl ? {href: reanalyzeUrl, label: "Re-run analysis"} : undefined}
      showUnsubscribe
      unsubscribeUrl={`${BRAND.url}/unsubscribe`}
      managePreferencesUrl={`${BRAND.url}/settings/notifications`}>
      <Text style={EmailParagraphStyles}>Hi {name},</Text>

      <Text style={EmailParagraphStyles}>
        We analyzed your invoice <strong>"{invoiceName}"</strong> but couldn't extract everything. A few details are missing, and completing them
        will give you better spending insights and more accurate dashboards.
      </Text>

      <KeyValueTable
        title='Invoice Details'
        items={[
          {label: "Invoice", value: invoiceName},
          {label: "Analyzed on", value: analysisDate},
          {label: "Missing fields", value: String(missingFields.length)},
        ]}
      />

      <EmailCard title='What's missing'>
        {descriptions.map(({label, suggestion}) => (
          <Text
            key={label}
            style={{
              ...EmailParagraphStyles,
              fontSize: "14px",
              margin: "0 0 10px",
              padding: "10px 12px",
              backgroundColor: EMAIL_COLORS.warningBackground,
              border: `1px solid ${EMAIL_COLORS.border}`,
              borderRadius: "8px",
            }}>
            <strong>{label}:</strong> {suggestion}
          </Text>
        ))}
      </EmailCard>

      <EmailCard title='Tips for better analysis'>
        <BulletList
          items={[
            "Use a well-lit, flat surface when photographing receipts",
            "Ensure the entire receipt is visible and in focus",
            "PDF receipts from online orders tend to analyze best",
            "You can always add or correct details manually after analysis",
          ]}
        />
      </EmailCard>

      <Text style={EmailParagraphStyles}>
        Completing these details takes less than a minute and ensures your spending reports stay accurate.
      </Text>

      <Text style={EmailParagraphStyles}>
        Stuck or need help? Reach out at{" "}
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

IncompleteInvoiceReminderEmail.PreviewProps = {
  username: "Test User",
  invoiceName: "Blurry Receipt — Feb 8",
  analysisDate: "February 8, 2026",
  missingFields: ["merchant", "items"],
  editInvoiceUrl: "https://arolariu.ro/domains/invoices/edit-invoice/abc-123",
  reanalyzeUrl: "https://arolariu.ro/domains/invoices/view-invoice/abc-123?action=analyze",
} satisfies Props;

export default IncompleteInvoiceReminderEmail;

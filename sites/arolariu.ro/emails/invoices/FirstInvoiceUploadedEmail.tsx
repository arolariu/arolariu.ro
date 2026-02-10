/**
 * @fileoverview Celebration email sent after a user uploads their very first invoice.
 * @module emails/invoices/FirstInvoiceUploadedEmail
 *
 * @remarks
 * This template is an onboarding milestone email sent when a user creates their
 * first invoice. It celebrates the action, explains what happens next (AI analysis),
 * and introduces features the user hasn't used yet.
 *
 * **Triggering Condition**: User's invoice count goes from 0 to 1.
 *
 * **Rendering Context**: React Email Component (renders to HTML email).
 *
 * **Design Philosophy**: Celebratory and educational — reinforces the user's decision
 * to engage with the platform and reduces uncertainty about next steps.
 *
 * @see {@link WelcomeEmail} - Precedes this in the onboarding sequence
 * @see {@link InvoiceHasBeenAnalyzedEmail} - Sent when AI analysis completes
 */

import {Link, Text} from "@react-email/components";
import {BRAND, BulletList, EmailCard, EmailLayout, EmailLinkStyles, EmailParagraphStyles, KeyValueTable} from "../_components";

/**
 * Properties for the FirstInvoiceUploadedEmail component.
 */
type Props = Readonly<{
  /** User's display name for email personalization. Falls back to "there" if empty. */
  readonly username: string;

  /** Name or identifier of the uploaded invoice. */
  readonly invoiceName: string;

  /** Human-readable upload timestamp (e.g., "February 10, 2026 at 14:30"). */
  readonly uploadDate: string;

  /** Direct link to view the uploaded invoice. */
  readonly invoiceUrl?: string;

  /** Direct link to upload another receipt. */
  readonly uploadUrl?: string;
}>;

/**
 * React component that renders the "First Invoice Uploaded" celebration email.
 *
 * @remarks
 * **Rendering Context**: React Email.
 *
 * **Content Strategy**:
 * - Celebration of the milestone
 * - Invoice summary card
 * - "What happens next" step-by-step explanation
 * - Feature discovery card (sharing, statistics, recipes)
 * - Dual CTAs: view invoice + upload another
 *
 * @param props - The username and invoice details.
 * @returns A rendered React Email template.
 *
 * @example
 * ```tsx
 * <FirstInvoiceUploadedEmail
 *   username="Sarah Chen"
 *   invoiceName="Lidl Groceries"
 *   uploadDate="February 10, 2026 at 14:30"
 * />
 * ```
 */
const FirstInvoiceUploadedEmail = (props: Readonly<Props>) => {
  const {username, invoiceName, uploadDate, invoiceUrl, uploadUrl} = props;

  const name = username?.trim() ? username : "there";
  const effectiveInvoiceUrl = invoiceUrl ?? `${BRAND.url}/domains/invoices/view-invoices`;
  const effectiveUploadUrl = uploadUrl ?? `${BRAND.url}/domains/invoices/upload-scans`;

  return (
    <EmailLayout
      title={`${BRAND.name} | First invoice uploaded`}
      preview={`Congratulations, ${name}! Your first invoice is in.`}
      badge='Milestone'
      heading='Your first invoice is in!'
      primaryCta={{href: effectiveInvoiceUrl, label: "View your invoice"}}
      secondaryCta={{href: effectiveUploadUrl, label: "Upload another receipt"}}>
      <Text style={EmailParagraphStyles}>Hi {name},</Text>

      <Text style={EmailParagraphStyles}>
        Congratulations on uploading your first invoice! You've taken the first step toward organized, insightful spending tracking. Here's
        what we've got so far:
      </Text>

      <KeyValueTable
        title='Your First Invoice'
        items={[
          {label: "Invoice name", value: invoiceName || "Untitled"},
          {label: "Uploaded", value: uploadDate},
          {label: "Status", value: "Ready for analysis"},
        ]}
      />

      <EmailCard title='What happens next'>
        <BulletList
          items={[
            "We analyze your receipt — our AI extracts items, prices, and merchant info",
            "You review the results — check the analysis and correct anything that looks off",
            "Your dashboard updates — spending charts, category breakdowns, and trends start building",
          ]}
        />
      </EmailCard>

      <EmailCard title='Features to explore'>
        <BulletList
          items={[
            "Share invoices with family or colleagues for joint expense tracking",
            "View AI-generated recipe suggestions from your grocery items",
            "Check allergen warnings on detected food products",
            "Track spending patterns across merchants, categories, and time periods",
          ]}
        />
      </EmailCard>

      <Text style={EmailParagraphStyles}>
        The more invoices you upload, the richer your spending insights become. Try uploading a few more receipts this week to see your
        dashboard come to life.
      </Text>

      <Text style={EmailParagraphStyles}>
        Need help or have feedback? Reach us at{" "}
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

FirstInvoiceUploadedEmail.PreviewProps = {
  username: "Test User",
  invoiceName: "Lidl Groceries — Feb 10",
  uploadDate: "February 10, 2026 at 14:30",
} satisfies Props;

export default FirstInvoiceUploadedEmail;

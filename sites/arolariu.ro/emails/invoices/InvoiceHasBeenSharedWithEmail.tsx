/**
 * @fileoverview Email template for notifying users that an invoice has been shared with them.
 * @module emails/invoices/SharedInvoice
 *
 * @remarks
 * This template is sent to a recipient when another user shares an invoice with them.
 * It includes the sender's name and a direct link to the shared invoice.
 */

import {Link, Text} from "@react-email/components";

import {BRAND} from "../components/brand";
import {BulletList} from "../components/BulletList";
import {EmailCard} from "../components/EmailCard";
import {EmailLayout, EmailLinkStyles, EmailParagraphStyles} from "../components/EmailLayout";
import {KeyValueTable} from "../components/KeyValueTable";

/**
 * Properties for the InvoiceHasBeenSharedWithEmail component.
 */
type Props = Readonly<{
  /** The username of the person sharing the invoice */
  fromUsername: string;
  /** The username of the recipient */
  toUsername: string;
  /** The unique identifier of the shared invoice */
  identifier: string;
}>;

/**
 * React component that renders the "Shared Invoice" email template.
 *
 * @remarks
 * **Rendering Context**: React Email.
 *
 * @param props - The sharing details.
 * @returns A rendered React Email template.
 */
const InvoiceHasBeenSharedWithEmail = (props: Readonly<Props>) => {
  const {fromUsername, toUsername, identifier} = props;

  const invoiceUrl = `${BRAND.url}/domains/invoices/view-invoice/${identifier}`;
  const safeTo = toUsername?.trim() ? toUsername : "there";
  const safeFrom = fromUsername?.trim() ? fromUsername : "Someone";

  return (
    <EmailLayout
      title={`${BRAND.name} | Invoice shared with you`}
      preview={`${safeFrom} shared an invoice with you.`}
      badge='Invoices • Shared'
      heading='An invoice was shared with you'
      primaryCta={{href: invoiceUrl, label: "View shared invoice"}}>
      <Text style={EmailParagraphStyles}>Hi {safeTo},</Text>

      <Text style={EmailParagraphStyles}>
        Great news! <strong>{safeFrom}</strong> has shared an invoice with you on {BRAND.name}. This gives you access to view all the
        invoice details, including itemized products, merchant information, and analysis insights.
      </Text>

      <KeyValueTable
        title='Share details'
        items={[
          {label: "Shared by", value: safeFrom},
          {label: "Invoice ID", value: identifier},
        ]}
      />

      <EmailCard title='What you can do'>
        <BulletList
          items={[
            "View the complete invoice details and itemized breakdown",
            "See analysis insights and spending categories",
            "Download or print the invoice for your records",
          ]}
        />
      </EmailCard>

      <Text style={EmailParagraphStyles}>
        Click the button above to access the shared invoice. This link will remain active as long as the sharing permissions are in place.
      </Text>

      <Text style={EmailParagraphStyles}>
        Have questions about this share, or need help? Contact us at{" "}
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

InvoiceHasBeenSharedWithEmail.PreviewProps = {
  fromUsername: "Alex Olariu",
  toUsername: "John Doe",
  identifier: "550e8400-e29b-41d4-a716-446655440000",
} satisfies Props;

export default InvoiceHasBeenSharedWithEmail;

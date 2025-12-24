/**
 * @fileoverview Email template for notifying users that an invoice has been made public.
 * @module emails/invoices/InvoiceHasBeenMadePublicEmail
 *
 * @remarks
 * This template is sent to users when they successfully change the privacy setting
 * of an invoice to "public". It includes invoice details, a direct link, and a QR code.
 *
 * @see {@link https://react.email/docs/introduction}
 */

import {Img, Link, Section, Text} from "@react-email/components";

import {BRAND, EMAIL_COLORS} from "../components/brand";
import {BulletList} from "../components/BulletList";
import {EmailCard} from "../components/EmailCard";
import {EmailLayout, EmailLinkStyles, EmailParagraphStyles} from "../components/EmailLayout";
import {KeyValueTable} from "../components/KeyValueTable";

/**
 * Properties for the InvoiceHasBeenMadePublicEmail component.
 *
 * @remarks
 * All fields are required to provide a complete summary of the invoice in the email.
 */
type Props = Readonly<{
  /** The username of the recipient */
  username: string;
  /** The unique identifier of the invoice */
  invoiceId: string;
  /** The display name of the invoice */
  invoiceName: string;
  /** The name of the merchant associated with the invoice */
  merchantName: string;
  /** The total amount of the invoice formatted as a string */
  totalAmount: string;
  /** The currency code (e.g., RON, USD) */
  currency: string;
  /** The date the invoice was created, formatted for display */
  dateCreated: string;
}>;

/**
 * React component that renders the "Invoice Made Public" email template.
 *
 * @remarks
 * **Rendering Context**: React Email (Server-side rendering for email clients).
 *
 * **Design**: Uses Tailwind CSS for styling and includes a QR code for quick access.
 *
 * @param props - The invoice details to be displayed in the email.
 * @returns A rendered React Email template.
 */
const InvoiceHasBeenMadePublicEmail = (props: Readonly<Props>) => {
  const {username, invoiceId, invoiceName, merchantName, totalAmount, currency, dateCreated} = props;

  const safeName = username?.trim() ? username : "there";
  const invoiceUrl = `${BRAND.url}/domains/invoices/view-invoice/${invoiceId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(invoiceUrl)}`;

  return (
    <EmailLayout
      title={`${BRAND.name} | Invoice made public`}
      preview={`Your invoice "${invoiceName}" is now public and shareable.`}
      badge='Invoices • Public Link'
      heading='Your invoice is now public'
      primaryCta={{href: invoiceUrl, label: "Open public invoice"}}>
      <Text style={EmailParagraphStyles}>Hi {safeName},</Text>

      <Text style={EmailParagraphStyles}>
        You’ve successfully made your invoice public. Anyone with the link or QR code below can now view this invoice—no login required.
        This is perfect for sharing receipts with colleagues, accountants, or for expense reporting.
      </Text>

      <KeyValueTable
        title='Invoice details'
        items={[
          {label: "Invoice name", value: invoiceName},
          {label: "Invoice ID", value: invoiceId},
          {label: "Merchant", value: merchantName},
          {label: "Total", value: `${totalAmount} ${currency}`.trim()},
          {label: "Created", value: dateCreated},
          {label: "Access", value: "Public (anyone with link)"},
        ]}
      />

      <Section
        style={{
          border: `1px solid ${EMAIL_COLORS.border}`,
          borderRadius: "10px",
          backgroundColor: "#ffffff",
          padding: "14px 14px",
          margin: "18px 0",
          textAlign: "center",
        }}>
        <Text style={{...EmailParagraphStyles, margin: "0 0 10px", fontSize: "14px", fontWeight: "700"}}>Quick Access QR Code</Text>
        <Img
          src={qrUrl}
          alt='QR Code for invoice access'
          style={{
            display: "block",
            margin: "0 auto",
            width: "200px",
            height: "200px",
            borderRadius: "10px",
            border: `1px solid ${EMAIL_COLORS.border}`,
          }}
        />
        <Text style={{...EmailParagraphStyles, margin: "10px 0 0", fontSize: "12px", color: EMAIL_COLORS.muted}}>
          Scan with your phone camera for instant access.
        </Text>
      </Section>

      <EmailCard title='How to share'>
        <BulletList
          items={[
            "Copy the direct link below and send via email or message",
            "Print or screenshot the QR code for in-person sharing",
            "Include in expense reports or reimbursement requests",
          ]}
        />
      </EmailCard>

      <Section
        style={{
          border: `1px solid ${EMAIL_COLORS.warningInk}`,
          borderRadius: "10px",
          backgroundColor: EMAIL_COLORS.warningBackground,
          padding: "12px 12px",
          margin: "18px 0",
        }}>
        <Text style={{...EmailParagraphStyles, margin: "0 0 6px", fontSize: "14px", fontWeight: "700", color: EMAIL_COLORS.warningInk}}>
          Privacy Notice
        </Text>
        <Text style={{...EmailParagraphStyles, margin: "0", fontSize: "14px", color: EMAIL_COLORS.warningInk}}>
          Public invoices can be accessed by anyone who has the URL or QR code. To make this invoice private again, update the sharing
          settings from your invoice page at any time.
        </Text>
      </Section>

      <Text style={EmailParagraphStyles}>
        Direct link:{" "}
        <Link
          href={invoiceUrl}
          style={EmailLinkStyles}>
          {invoiceUrl}
        </Link>
      </Text>

      <Text style={EmailParagraphStyles}>
        Questions about sharing or privacy settings? Contact us at{" "}
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

InvoiceHasBeenMadePublicEmail.PreviewProps = {
  username: "Test User",
  invoiceId: "550e8400-e29b-41d4-a716-446655440000",
  invoiceName: "Grocery Shopping - Carrefour",
  merchantName: "Carrefour Romania",
  totalAmount: "247.50",
  currency: "RON",
  dateCreated: "December 20, 2024",
} satisfies Props;

export default InvoiceHasBeenMadePublicEmail;

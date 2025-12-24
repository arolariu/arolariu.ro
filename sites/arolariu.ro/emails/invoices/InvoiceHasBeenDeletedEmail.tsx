/**
 * @fileoverview Email template for notifying users that an invoice has been deleted.
 * @module emails/invoices/DeletedInvoice
 *
 * @remarks
 * This template is sent to users when an invoice is successfully deleted (soft-deleted)
 * from the system.
 */

import {generateGuid} from "@/lib/utils.generic";
import {Link, Text} from "@react-email/components";

import {BRAND} from "../components/brand";
import {BulletList} from "../components/BulletList";
import {EmailCard} from "../components/EmailCard";
import {EmailLayout, EmailLinkStyles, EmailParagraphStyles} from "../components/EmailLayout";
import {KeyValueTable} from "../components/KeyValueTable";

/**
 * Properties for the InvoiceHasBeenDeletedEmail component.
 */
type Props = Readonly<{
  /** The username of the recipient */
  username: string;
  /** The ID of the deleted invoice */
  invoiceId: string;
  /** Optional: invoice name for better context */
  invoiceName?: string;
}>;

/**
 * React component that renders the "Invoice Deleted" email template.
 *
 * @remarks
 * **Rendering Context**: React Email.
 *
 * @param props - The username and deleted invoice ID.
 * @returns A rendered React Email template.
 */
const InvoiceHasBeenDeletedEmail = (props: Readonly<Props>) => {
  const {username, invoiceId, invoiceName} = props;

  const safeName = username?.trim() ? username : "there";
  const invoicesUrl = `${BRAND.url}/domains/invoices/view-invoices`;

  return (
    <EmailLayout
      title={`${BRAND.name} | Invoice deleted`}
      preview={`Invoice ${invoiceName ?? invoiceId} has been removed from your account.`}
      badge='Invoices • Deleted'
      heading='Invoice removed from your account'
      primaryCta={{href: invoicesUrl, label: "View your invoices"}}>
      <Text style={EmailParagraphStyles}>Hi {safeName},</Text>

      <Text style={EmailParagraphStyles}>
        This email confirms that an invoice has been removed from your {BRAND.name} account. The deletion was processed successfully.
      </Text>

      <KeyValueTable
        title='Deletion Details'
        items={[
          {label: "Invoice", value: invoiceName ?? `#${invoiceId}`},
          {label: "Invoice ID", value: invoiceId ?? "—"},
          {label: "Status", value: "Deleted (soft delete)"},
        ]}
      />

      <EmailCard title='What you should know'>
        <BulletList
          items={[
            "This is a soft delete—the invoice data may be retained for 30 days for recovery purposes.",
            "Any shared access to this invoice has been automatically revoked.",
            "Statistics and insights will be recalculated to exclude this invoice.",
            "If you need to recover this invoice, contact support within 30 days.",
          ]}
        />
      </EmailCard>

      <Text style={EmailParagraphStyles}>
        If you didn't initiate this deletion, or if you need to recover the invoice, please contact us immediately at{" "}
        <Link
          href={`mailto:${BRAND.supportEmail}`}
          style={EmailLinkStyles}>
          {BRAND.supportEmail}
        </Link>
        . We're here to help.
      </Text>

      <Text style={{...EmailParagraphStyles, margin: "0"}}>
        {BRAND.signOff},
        <br />
        {BRAND.teamName}
      </Text>
    </EmailLayout>
  );
};

InvoiceHasBeenDeletedEmail.PreviewProps = {
  username: "Test User",
  invoiceId: generateGuid(),
  invoiceName: "Carrefour Market - Dec 2024",
} satisfies Props;

export default InvoiceHasBeenDeletedEmail;

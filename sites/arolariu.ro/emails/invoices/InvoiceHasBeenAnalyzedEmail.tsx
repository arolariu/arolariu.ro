/**
 * @fileoverview Email template for notifying users that an invoice has been analyzed.
 * @module emails/invoices/AnalyzedInvoice
 *
 * @remarks
 * This template is sent to users when the AI analysis of their uploaded invoice
 * is complete. It provides a direct link to view the results.
 */

import {generateRandomInvoice} from "@/data/mocks";
import type {Invoice} from "@/types/invoices";
import {Link, Text} from "@react-email/components";

import {BRAND} from "../components/brand";
import {BulletList} from "../components/BulletList";
import {EmailCard} from "../components/EmailCard";
import {EmailLayout, EmailLinkStyles, EmailParagraphStyles} from "../components/EmailLayout";
import {KeyValueTable} from "../components/KeyValueTable";

/**
 * Properties for the InvoiceHasBeenAnalyzedEmail component.
 */
type Props = Readonly<{
  /** The username of the recipient */
  username: string;
  /** The analyzed invoice object */
  invoice: Readonly<Invoice>;
}>;

/**
 * React component that renders the "Invoice Analyzed" email template.
 *
 * @remarks
 * **Rendering Context**: React Email.
 *
 * @param props - The username and analyzed invoice details.
 * @returns A rendered React Email template.
 */
const InvoiceHasBeenAnalyzedEmail = (props: Readonly<Props>) => {
  const {username, invoice} = props;

  const invoiceUrl = `${BRAND.url}/domains/invoices/view-invoice/${invoice?.id}`;
  const safeName = username?.trim() ? username : "there";
  const currencyCode = invoice?.paymentInformation?.currency?.code ?? "";
  const totalCost = invoice?.paymentInformation?.totalCostAmount;
  const totalText = typeof totalCost === "number" ? `${totalCost.toFixed(2)} ${currencyCode}`.trim() : "—";
  const itemCount = invoice?.items?.length ?? 0;

  return (
    <EmailLayout
      title={`${BRAND.name} | Invoice analyzed`}
      preview={`Your invoice is ready, ${safeName}. Analysis complete!`}
      badge='Invoices • Analysis Complete'
      heading='Your invoice analysis is ready'
      primaryCta={{href: invoiceUrl, label: "View full analysis"}}>
      <Text style={EmailParagraphStyles}>Hi {safeName},</Text>

      <Text style={EmailParagraphStyles}>
        Great news! Our AI has finished analyzing your invoice. We've extracted all the key information, categorized your items, and
        generated spending insights to help you track your finances.
      </Text>

      <KeyValueTable
        title='Invoice Summary'
        items={[
          {label: "Invoice name", value: invoice?.name ?? `#${invoice?.id ?? "—"}`},
          {label: "Merchant ID", value: invoice?.merchantReference ?? "Not identified yet"},
          {label: "Items detected", value: String(itemCount)},
          {label: "Total amount", value: totalText},
        ]}
      />

      <EmailCard title='What was analyzed'>
        <BulletList
          items={[
            "Merchant identification and categorization",
            "Line-by-line item extraction with pricing",
            "Automatic product categorization (groceries, beverages, household, etc.)",
            "Currency detection and amount validation",
            "Date and time extraction when available",
          ]}
        />
      </EmailCard>

      <Text style={EmailParagraphStyles}>
        Click the button above to view the complete analysis. If anything looks off—perhaps a product was miscategorized or a price wasn't
        detected correctly—you can edit the invoice directly in your dashboard and the insights will update automatically.
      </Text>

      <Text style={EmailParagraphStyles}>
        Have questions about your analysis, or need help? Contact us at{" "}
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

InvoiceHasBeenAnalyzedEmail.PreviewProps = {
  username: "Test User",
  invoice: generateRandomInvoice(),
} satisfies Props;

export default InvoiceHasBeenAnalyzedEmail;

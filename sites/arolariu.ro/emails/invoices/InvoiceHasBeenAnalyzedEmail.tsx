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
import {Link, Text} from "react-email";

import {BRAND, BulletList, EmailCard, EmailLayout, EmailLinkStyles, EmailParagraphStyles, KeyValueTable} from "../_components";
import type {EmailLocale} from "../_i18n";
import {defineEmailTemplate} from "../_lib/defineEmailTemplate";

/**
 * Properties for the InvoiceHasBeenAnalyzedEmail component.
 */
type Props = Readonly<{
  /** The username of the recipient */
  readonly username: string;
  /** The analyzed invoice object */
  readonly invoice: Readonly<Invoice>;
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
const InvoiceHasBeenAnalyzedEmail = defineEmailTemplate<Props>({
  namespace: "email.invoiceAnalyzed",
  render: ({locale, t, props}) => {
    const {username, invoice} = props;

    const invoiceUrl = `${BRAND.url}/domains/invoices/view-invoice/${invoice?.id}`;
    const safeName = username?.trim() ? username : "there";
    const currencyCode = invoice?.paymentInformation?.currency?.code ?? "";
    const totalCost = invoice?.paymentInformation?.totalCostAmount;
    const totalText = typeof totalCost === "number" ? `${totalCost.toFixed(2)} ${currencyCode}`.trim() : "—";
    const itemCount = invoice?.items?.length ?? 0;

    return (
      <EmailLayout
        locale={locale}
        title={`${BRAND.name} | ${t("badge")}`}
        preview={t("preview", {name: safeName})}
        badge={t("badge")}
        heading={t("heading")}
        primaryCta={{href: invoiceUrl, label: t("ctaPrimary")}}>
        <Text style={EmailParagraphStyles}>{t("greeting", {name: safeName})}</Text>

        <Text style={EmailParagraphStyles}>{t("intro")}</Text>

        <KeyValueTable
          title={t("summaryTitle")}
          items={[
            {label: t("summary.invoiceName"), value: invoice?.name ?? `#${invoice?.id ?? "—"}`},
            {label: t("summary.merchantId"), value: invoice?.merchantReference ?? t("summary.notIdentified")},
            {label: t("summary.itemsDetected"), value: String(itemCount)},
            {label: t("summary.totalAmount"), value: totalText},
          ]}
        />

        <EmailCard title={t("whatWasAnalyzedTitle")}>
          <BulletList
            items={[t("whatWasAnalyzed.0"), t("whatWasAnalyzed.1"), t("whatWasAnalyzed.2"), t("whatWasAnalyzed.3"), t("whatWasAnalyzed.4")]}
          />
        </EmailCard>

        <Text style={EmailParagraphStyles}>{t("body")}</Text>

        <Text style={EmailParagraphStyles}>
          {t.rich("feedbackPrompt", {
            email: () => (
              <Link
                href={`mailto:${BRAND.supportEmail}`}
                style={EmailLinkStyles}>
                {BRAND.supportEmail}
              </Link>
            ),
          })}
        </Text>

        <Text style={{...EmailParagraphStyles, margin: "0"}}>
          {t("signOff.line1")}
          <br />
          {t("signOff.line2", {brand: BRAND.name})}
        </Text>
      </EmailLayout>
    );
  },
});

(InvoiceHasBeenAnalyzedEmail as unknown as {PreviewProps: Props & {locale: EmailLocale}}).PreviewProps = {
  username: "Test User",
  invoice: generateRandomInvoice(),
  locale: "en",
};

export default InvoiceHasBeenAnalyzedEmail;

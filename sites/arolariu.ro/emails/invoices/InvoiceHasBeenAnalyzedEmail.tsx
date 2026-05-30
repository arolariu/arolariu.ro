/**
 * @fileoverview Email template for notifying users that an invoice has been analyzed.
 * @module emails/invoices/AnalyzedInvoice
 *
 * @remarks
 * This template is sent to users when the AI analysis of their uploaded invoice
 * is complete. It provides a direct link to view the results.
 */

import type {Invoice} from "@/types/invoices";
import {Link, Text} from "react-email";

import {BRAND, BulletList, EmailCard, EmailLayout, EmailLinkStyles, EmailParagraphStyles, KeyValueTable} from "../_components";
import {defineEmailTemplate} from "../_lib/defineEmailTemplate";
import {selectorFromPath} from "../_lib/i18n";

/**
 * Properties for the InvoiceHasBeenAnalyzedEmail component.
 */
type Props = {
  /** The username of the recipient */
  readonly username: string;
  /** The analyzed invoice object */
  readonly invoice: Readonly<Invoice>;
};

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
  namespace: "emails.invoiceAnalyzed",
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
        title={`${BRAND.name} | ${t(selectorFromPath("emails.invoiceAnalyzed.badge"))}`}
        preview={t(selectorFromPath("emails.invoiceAnalyzed.preview"), {name: safeName})}
        badge={t(selectorFromPath("emails.invoiceAnalyzed.badge"))}
        heading={t(selectorFromPath("emails.invoiceAnalyzed.heading"))}
        primaryCta={{href: invoiceUrl, label: t(selectorFromPath("emails.invoiceAnalyzed.ctaPrimary"))}}
        secondaryCta={null}
        showUnsubscribe={false}
        unsubscribeUrl=''
        managePreferencesUrl=''>
        <Text style={EmailParagraphStyles}>{t(selectorFromPath("emails.invoiceAnalyzed.greeting"), {name: safeName})}</Text>
        <Text style={EmailParagraphStyles}>{t(selectorFromPath("emails.invoiceAnalyzed.intro"))}</Text>
        <KeyValueTable
          title={t(selectorFromPath("emails.invoiceAnalyzed.summaryTitle"))}
          items={[
            {label: t(selectorFromPath("emails.invoiceAnalyzed.summary.invoiceName")), value: invoice?.name ?? `#${invoice?.id ?? "—"}`},
            {
              label: t(selectorFromPath("emails.invoiceAnalyzed.summary.merchantId")),
              value: invoice?.merchantReference ?? t(selectorFromPath("emails.invoiceAnalyzed.summary.notIdentified")),
            },
            {label: t(selectorFromPath("emails.invoiceAnalyzed.summary.itemsDetected")), value: String(itemCount)},
            {label: t(selectorFromPath("emails.invoiceAnalyzed.summary.totalAmount")), value: totalText},
          ]}
        />
        <EmailCard title={t(selectorFromPath("emails.invoiceAnalyzed.whatWasAnalyzedTitle"))}>
          <BulletList
            items={[
              t(selectorFromPath("emails.invoiceAnalyzed.whatWasAnalyzed.item0")),
              t(selectorFromPath("emails.invoiceAnalyzed.whatWasAnalyzed.item1")),
              t(selectorFromPath("emails.invoiceAnalyzed.whatWasAnalyzed.item2")),
              t(selectorFromPath("emails.invoiceAnalyzed.whatWasAnalyzed.item3")),
              t(selectorFromPath("emails.invoiceAnalyzed.whatWasAnalyzed.item4")),
            ]}
          />
        </EmailCard>
        <Text style={EmailParagraphStyles}>{t(selectorFromPath("emails.invoiceAnalyzed.body"))}</Text>
        <Text style={EmailParagraphStyles}>
          {t.rich(selectorFromPath("emails.invoiceAnalyzed.feedbackPrompt"), {
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
          {t(selectorFromPath("emails.invoiceAnalyzed.signOff.line1"))}
          <br />
          {t(selectorFromPath("emails.invoiceAnalyzed.signOff.line2"), {brand: BRAND.name})}
        </Text>
      </EmailLayout>
    );
  },
});

// Static preview fixture — calls into `@/data/mocks` would evaluate at
// module-load time and break `npm run email` (which lacks the global
// `crypto` the mocks reach for). Hand-rolled minimal shape covers every
// field the template reads (id, name, merchantReference, items.length,
// paymentInformation.{currency.code,totalCostAmount}).
InvoiceHasBeenAnalyzedEmail.PreviewProps = {
  username: "Test User",
  invoice: {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Carrefour Market - Dec 2024",
    merchantReference: "CARREFOUR-001",
    items: [{name: "Bread"}, {name: "Milk"}, {name: "Eggs"}],
    paymentInformation: {
      totalCostAmount: 42.99,
      currency: {code: "RON"},
    },
  } as unknown as Invoice,
  locale: "en",
};

export default InvoiceHasBeenAnalyzedEmail;

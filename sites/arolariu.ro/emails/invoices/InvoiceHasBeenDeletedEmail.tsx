/**
 * @fileoverview Email template for notifying users that an invoice has been deleted.
 * @module emails/invoices/DeletedInvoice
 *
 * @remarks
 * This template is sent to users when an invoice is successfully deleted (soft-deleted)
 * from the system.
 */

import {generateGuid} from "@/lib/utils.generic";
import {createTranslator} from "next-intl";
import {Link, Text} from "react-email";

import {BRAND, BulletList, EmailCard, EmailLayout, EmailLinkStyles, EmailParagraphStyles, KeyValueTable} from "../_components";
import {DEFAULT_LOCALE, type EmailLocale, loadMessages} from "../_i18n";

/**
 * Properties for the InvoiceHasBeenDeletedEmail component.
 */
type Props = Readonly<{
  /** The username of the recipient */
  readonly username: string;
  /** The ID of the deleted invoice */
  readonly invoiceId: string;
  /** Optional: invoice name for better context */
  readonly invoiceName?: string;
  /** The locale for the email */
  readonly locale?: EmailLocale;
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
const InvoiceHasBeenDeletedEmail = async (props: Readonly<Props>) => {
  const locale: EmailLocale = props.locale ?? DEFAULT_LOCALE;
  const messages = await loadMessages(locale);
  const t = createTranslator({locale, messages, namespace: "email.invoiceDeleted"});

  const {username, invoiceId, invoiceName} = props;

  const safeName = username?.trim() ? username : "there";
  const invoicesUrl = `${BRAND.url}/domains/invoices/view-invoices`;
  const invoiceLabel = invoiceName ?? `#${invoiceId}`;

  return (
    <EmailLayout
      locale={locale}
      title={`${BRAND.name} | ${t("badge")}`}
      preview={t("preview", {invoiceLabel})}
      badge={t("badge")}
      heading={t("heading")}
      primaryCta={{href: invoicesUrl, label: t("ctaPrimary")}}>
      <Text style={EmailParagraphStyles}>{t("greeting", {name: safeName})}</Text>

      <Text style={EmailParagraphStyles}>{t("intro", {brand: BRAND.name})}</Text>

      <KeyValueTable
        title={t("detailsTitle")}
        items={[
          {label: t("details.invoice"), value: invoiceName ?? `#${invoiceId}`},
          {label: t("details.invoiceId"), value: invoiceId ?? t("placeholder")},
          {label: t("details.status"), value: t("statusValue")},
        ]}
      />

      <EmailCard title={t("whatYouShouldKnowTitle")}>
        <BulletList items={[t("whatYouShouldKnow.0"), t("whatYouShouldKnow.1"), t("whatYouShouldKnow.2"), t("whatYouShouldKnow.3")]} />
      </EmailCard>

      <Text style={EmailParagraphStyles}>
        {t.rich("body", {
          email: () => (
            <Link href={`mailto:${BRAND.supportEmail}`} style={EmailLinkStyles}>
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
};

InvoiceHasBeenDeletedEmail.PreviewProps = {
  username: "Test User",
  invoiceId: generateGuid(),
  invoiceName: "Carrefour Market - Dec 2024",
  locale: "en" as const,
} satisfies Props;

export default InvoiceHasBeenDeletedEmail;
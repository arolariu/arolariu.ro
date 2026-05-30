/**
 * @fileoverview Email template for notifying users that an invoice has been deleted.
 * @module emails/invoices/DeletedInvoice
 *
 * @remarks
 * This template is sent to users when an invoice is successfully deleted (soft-deleted)
 * from the system.
 */

import {Link, Text} from "react-email";

import {BRAND, BulletList, EmailCard, EmailLayout, EmailLinkStyles, EmailParagraphStyles, KeyValueTable} from "../_components";
import {defineEmailTemplate} from "../_lib/defineEmailTemplate";
import {selectorFromPath} from "../_lib/i18n";

/**
 * Properties for the InvoiceHasBeenDeletedEmail component.
 */
type Props = {
  /** The username of the recipient */
  readonly username: string;
  /** The ID of the deleted invoice */
  readonly invoiceId: string;
  /** Optional: invoice name for better context */
  readonly invoiceName?: string;
};

/**
 * React component that renders the "Invoice Deleted" email template.
 *
 * @remarks
 * **Rendering Context**: React Email.
 *
 * @param props - The username and deleted invoice ID.
 * @returns A rendered React Email template.
 */
const InvoiceHasBeenDeletedEmail = defineEmailTemplate<Props>({
  namespace: "emails.invoiceDeleted",
  render: ({locale, t, props}) => {
    const {username, invoiceId, invoiceName} = props;

    const safeName = username?.trim() ? username : "there";
    const invoicesUrl = `${BRAND.url}/domains/invoices/view-invoices`;
    const invoiceLabel = invoiceName ?? `#${invoiceId}`;

    return (
      <EmailLayout
        locale={locale}
        title={`${BRAND.name} | ${t(selectorFromPath("emails.invoiceDeleted.badge"))}`}
        preview={t(selectorFromPath("emails.invoiceDeleted.preview"), {invoiceLabel})}
        badge={t(selectorFromPath("emails.invoiceDeleted.badge"))}
        heading={t(selectorFromPath("emails.invoiceDeleted.heading"))}
        primaryCta={{href: invoicesUrl, label: t(selectorFromPath("emails.invoiceDeleted.ctaPrimary"))}}
        secondaryCta={null}
        showUnsubscribe={false}
        unsubscribeUrl=''
        managePreferencesUrl=''>
        <Text style={EmailParagraphStyles}>{t(selectorFromPath("emails.invoiceDeleted.greeting"), {name: safeName})}</Text>
        <Text style={EmailParagraphStyles}>{t(selectorFromPath("emails.invoiceDeleted.intro"), {brand: BRAND.name})}</Text>
        <KeyValueTable
          title={t(selectorFromPath("emails.invoiceDeleted.detailsTitle"))}
          items={[
            {label: t(selectorFromPath("emails.invoiceDeleted.details.invoice")), value: invoiceName ?? `#${invoiceId}`},
            {
              label: t(selectorFromPath("emails.invoiceDeleted.details.invoiceId")),
              value: invoiceId ?? t(selectorFromPath("emails.invoiceDeleted.placeholder")),
            },
            {
              label: t(selectorFromPath("emails.invoiceDeleted.details.status")),
              value: t(selectorFromPath("emails.invoiceDeleted.statusValue")),
            },
          ]}
        />
        <EmailCard title={t(selectorFromPath("emails.invoiceDeleted.whatYouShouldKnowTitle"))}>
          <BulletList
            items={[
              t(selectorFromPath("emails.invoiceDeleted.whatYouShouldKnow.item0")),
              t(selectorFromPath("emails.invoiceDeleted.whatYouShouldKnow.item1")),
              t(selectorFromPath("emails.invoiceDeleted.whatYouShouldKnow.item2")),
              t(selectorFromPath("emails.invoiceDeleted.whatYouShouldKnow.item3")),
            ]}
          />
        </EmailCard>
        <Text style={EmailParagraphStyles}>
          {t.rich(selectorFromPath("emails.invoiceDeleted.body"), {
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
          {t(selectorFromPath("emails.invoiceDeleted.signOff.line1"))}
          <br />
          {t(selectorFromPath("emails.invoiceDeleted.signOff.line2"), {brand: BRAND.name})}
        </Text>
      </EmailLayout>
    );
  },
});

InvoiceHasBeenDeletedEmail.PreviewProps = {
  username: "Test User",
  invoiceId: "00000000-0000-4000-8000-000000000001",
  invoiceName: "Carrefour Market - Dec 2024",
  locale: "en",
};

export default InvoiceHasBeenDeletedEmail;

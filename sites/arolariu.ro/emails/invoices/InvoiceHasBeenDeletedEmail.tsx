import {selectorFromPath} from "next-intl-selector";
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
  namespace: "email.invoiceDeleted",
  render: ({locale, t, props}) => {
    const {username, invoiceId, invoiceName} = props;

    const safeName = username?.trim() ? username : "there";
    const invoicesUrl = `${BRAND.url}/domains/invoices/view-invoices`;
    const invoiceLabel = invoiceName ?? `#${invoiceId}`;

    return (
      <EmailLayout
        locale={locale}
        title={`${BRAND.name} | ${t(selectorFromPath("email.invoiceDeleted.badge"))}`}
        preview={t(selectorFromPath("email.invoiceDeleted.preview"), {invoiceLabel})}
        badge={t(selectorFromPath("email.invoiceDeleted.badge"))}
        heading={t(selectorFromPath("email.invoiceDeleted.heading"))}
        primaryCta={{href: invoicesUrl, label: t(selectorFromPath("email.invoiceDeleted.ctaPrimary"))}}
        secondaryCta={null}
        showUnsubscribe={false}
        unsubscribeUrl=''
        managePreferencesUrl=''>
        <Text style={EmailParagraphStyles}>{t(selectorFromPath("email.invoiceDeleted.greeting"), {name: safeName})}</Text>
        <Text style={EmailParagraphStyles}>{t(selectorFromPath("email.invoiceDeleted.intro"), {brand: BRAND.name})}</Text>
        <KeyValueTable
          title={t(selectorFromPath("email.invoiceDeleted.detailsTitle"))}
          items={[
            {label: t(selectorFromPath("email.invoiceDeleted.details.invoice")), value: invoiceName ?? `#${invoiceId}`},
            {label: t(selectorFromPath("email.invoiceDeleted.details.invoiceId")), value: invoiceId ?? t(selectorFromPath("email.invoiceDeleted.placeholder"))},
            {label: t(selectorFromPath("email.invoiceDeleted.details.status")), value: t(selectorFromPath("email.invoiceDeleted.statusValue"))},
          ]}
        />
        <EmailCard title={t(selectorFromPath("email.invoiceDeleted.whatYouShouldKnowTitle"))}>
          <BulletList items={[t(selectorFromPath("email.invoiceDeleted.whatYouShouldKnow.0")), t(selectorFromPath("email.invoiceDeleted.whatYouShouldKnow.1")), t(selectorFromPath("email.invoiceDeleted.whatYouShouldKnow.2")), t(selectorFromPath("email.invoiceDeleted.whatYouShouldKnow.3"))]} />
        </EmailCard>
        <Text style={EmailParagraphStyles}>
          {t.rich(selectorFromPath("email.invoiceDeleted.body"), {
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
          {t(selectorFromPath("email.invoiceDeleted.signOff.line1"))}
          <br />
          {t(selectorFromPath("email.invoiceDeleted.signOff.line2"), {brand: BRAND.name})}
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

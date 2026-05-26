import {selectorFromPath} from "next-intl-selector";
/**
 * @fileoverview Email template for notifying users that an invoice has been shared with them.
 * @module emails/invoices/SharedInvoice
 *
 * @remarks
 * This template is sent to a recipient when another user shares an invoice with them.
 * It includes the sender's name and a direct link to the shared invoice.
 */

import {Link, Text} from "react-email";

import {BRAND, BulletList, EmailCard, EmailLayout, EmailLinkStyles, EmailParagraphStyles, KeyValueTable} from "../_components";
import {defineEmailTemplate} from "../_lib/defineEmailTemplate";

/**
 * Properties for the InvoiceHasBeenSharedWithEmail component.
 */
type Props = {
  /** The username of the person sharing the invoice */
  readonly fromUsername: string;
  /** The username of the recipient */
  readonly toUsername: string;
  /** The unique identifier of the shared invoice */
  readonly identifier: string;
};

/**
 * React component that renders the "Shared Invoice" email template.
 *
 * @remarks
 * **Rendering Context**: React Email.
 *
 * @param props - The sharing details.
 * @returns A rendered React Email template.
 */
const InvoiceHasBeenSharedWithEmail = defineEmailTemplate<Props>({
  namespace: "email.invoiceShared",
  render: ({locale, t, props}) => {
    const {fromUsername, toUsername, identifier} = props;

    const invoiceUrl = `${BRAND.url}/domains/invoices/view-invoice/${identifier}`;
    const safeTo = toUsername?.trim() ? toUsername : "there";
    const safeFrom = fromUsername?.trim() ? fromUsername : "Someone";

    return (
      <EmailLayout
        locale={locale}
        title={`${BRAND.name} | ${t(selectorFromPath("emails.invoiceShared.badge"))}`}
        preview={t(selectorFromPath("emails.invoiceShared.preview"), {fromName: safeFrom})}
        badge={t(selectorFromPath("emails.invoiceShared.badge"))}
        heading={t(selectorFromPath("emails.invoiceShared.heading"))}
        primaryCta={{href: invoiceUrl, label: t(selectorFromPath("emails.invoiceShared.ctaPrimary"))}}
        secondaryCta={null}
        showUnsubscribe={false}
        unsubscribeUrl=''
        managePreferencesUrl=''>
        <Text style={EmailParagraphStyles}>{t(selectorFromPath("emails.invoiceShared.greeting"), {toName: safeTo})}</Text>
        <Text style={EmailParagraphStyles}>
          {t.rich(selectorFromPath("emails.invoiceShared.intro"), {
            brand: BRAND.name,
            from: () => <strong>{safeFrom}</strong>,
          })}
        </Text>
        <KeyValueTable
          title={t(selectorFromPath("emails.invoiceShared.detailsTitle"))}
          items={[
            {label: t(selectorFromPath("emails.invoiceShared.details.sharedBy")), value: safeFrom},
            {label: t(selectorFromPath("emails.invoiceShared.details.invoiceId")), value: identifier},
          ]}
        />
        <EmailCard title={t(selectorFromPath("emails.invoiceShared.whatYouCanDoTitle"))}>
          <BulletList items={[t(selectorFromPath("emails.invoiceShared.whatYouCanDo.item0")), t(selectorFromPath("emails.invoiceShared.whatYouCanDo.item1")), t(selectorFromPath("emails.invoiceShared.whatYouCanDo.item2"))]} />
        </EmailCard>
        <Text style={EmailParagraphStyles}>{t(selectorFromPath("emails.invoiceShared.body"))}</Text>
        <Text style={EmailParagraphStyles}>
          {t.rich(selectorFromPath("emails.invoiceShared.feedbackPrompt"), {
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
          {t(selectorFromPath("emails.invoiceShared.signOff.line1"))}
          <br />
          {t(selectorFromPath("emails.invoiceShared.signOff.line2"), {brand: BRAND.name})}
        </Text>
      </EmailLayout>
    );
  },
});

InvoiceHasBeenSharedWithEmail.PreviewProps = {
  fromUsername: "Alex Olariu",
  toUsername: "John Doe",
  identifier: "550e8400-e29b-41d4-a716-446655440000",
  locale: "en",
};

export default InvoiceHasBeenSharedWithEmail;

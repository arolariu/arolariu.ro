import {selectorFromPath} from "next-intl-selector";
/**
 * @fileoverview Email template for notifying users that their access to a shared invoice was revoked.
 * @module emails/invoices/InvoiceHasBeenUnsharedWithEmail
 */

import {Link, Text} from "react-email";

import {BRAND, BulletList, EmailCard, EmailLayout, EmailLinkStyles, EmailParagraphStyles, KeyValueTable} from "../_components";
import {defineEmailTemplate} from "../_lib/defineEmailTemplate";

type Props = {
  /** The username of the person who revoked access. */
  readonly fromUsername: string;

  /** The username of the recipient who lost access. */
  readonly toUsername: string;

  /** The unique identifier of the invoice that was unshared. */
  readonly identifier: string;

  /** Optional timestamp (ISO or human-readable). */
  readonly revokedAt?: string;
};

const InvoiceHasBeenUnsharedWithEmail = defineEmailTemplate<Props>({
  namespace: "emails.invoiceUnshared",
  render: ({locale, t, props}) => {
    const {fromUsername, toUsername, identifier, revokedAt} = props;

    const safeTo = toUsername?.trim() ? toUsername : "there";
    const safeFrom = fromUsername?.trim() ? fromUsername : "The owner";

    const invoicesUrl = `${BRAND.url}/domains/invoices/view-invoices`;

    return (
      <EmailLayout
        locale={locale}
        title={`${BRAND.name} | ${t(selectorFromPath("emails.invoiceUnshared.badge"))}`}
        preview={t(selectorFromPath("emails.invoiceUnshared.preview"), {fromName: safeFrom})}
        badge={t(selectorFromPath("emails.invoiceUnshared.badge"))}
        heading={t(selectorFromPath("emails.invoiceUnshared.heading"))}
        primaryCta={{href: invoicesUrl, label: t(selectorFromPath("emails.invoiceUnshared.ctaPrimary"))}}
        secondaryCta={{href: `mailto:${BRAND.supportEmail}`, label: t(selectorFromPath("emails.invoiceUnshared.ctaSecondary"))}}
        showUnsubscribe={false}
        unsubscribeUrl=''
        managePreferencesUrl=''>
        <Text style={EmailParagraphStyles}>{t(selectorFromPath("emails.invoiceUnshared.greeting"), {toName: safeTo})}</Text>
        <Text style={EmailParagraphStyles}>
          {t.rich(selectorFromPath("emails.invoiceUnshared.intro"), {
            from: () => <strong>{safeFrom}</strong>,
          })}
        </Text>
        <KeyValueTable
          title={t(selectorFromPath("emails.invoiceUnshared.detailsTitle"))}
          items={[
            {label: t(selectorFromPath("emails.invoiceUnshared.details.revokedBy")), value: safeFrom},
            {label: t(selectorFromPath("emails.invoiceUnshared.details.invoiceId")), value: identifier},
            {label: t(selectorFromPath("emails.invoiceUnshared.details.revokedAt")), value: revokedAt ?? t(selectorFromPath("emails.invoiceUnshared.details.notProvided"))},
            {label: t(selectorFromPath("emails.invoiceUnshared.details.yourAccess")), value: t(selectorFromPath("emails.invoiceUnshared.details.accessRevoked"))},
          ]}
        />
        <EmailCard title={t(selectorFromPath("emails.invoiceUnshared.whatThisMeansTitle"))}>
          <BulletList items={[t(selectorFromPath("emails.invoiceUnshared.whatThisMeans.item0")), t(selectorFromPath("emails.invoiceUnshared.whatThisMeans.item1")), t(selectorFromPath("emails.invoiceUnshared.whatThisMeans.item2"))]} />
        </EmailCard>
        <Text style={EmailParagraphStyles}>
          {t.rich(selectorFromPath("emails.invoiceUnshared.body"), {
            from: () => <strong>{safeFrom}</strong>,
          })}
        </Text>
        <Text style={EmailParagraphStyles}>
          {t.rich(selectorFromPath("emails.invoiceUnshared.feedbackPrompt"), {
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
          {t(selectorFromPath("emails.invoiceUnshared.signOff.line1"))}
          <br />
          {t(selectorFromPath("emails.invoiceUnshared.signOff.line2"), {brand: BRAND.name})}
        </Text>
      </EmailLayout>
    );
  },
});

InvoiceHasBeenUnsharedWithEmail.PreviewProps = {
  fromUsername: "Alex Olariu",
  toUsername: "John Doe",
  identifier: "550e8400-e29b-41d4-a716-446655440000",
  revokedAt: "December 24, 2025",
  locale: "en",
};

export default InvoiceHasBeenUnsharedWithEmail;

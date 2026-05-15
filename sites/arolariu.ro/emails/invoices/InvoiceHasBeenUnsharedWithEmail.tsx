/**
 * @fileoverview Email template for notifying users that their access to a shared invoice was revoked.
 * @module emails/invoices/InvoiceHasBeenUnsharedWithEmail
 */

import {Link, Text} from "react-email";

import {BRAND, BulletList, EmailCard, EmailLayout, EmailLinkStyles, EmailParagraphStyles, KeyValueTable} from "../_components";
import type {EmailLocale} from "../_i18n";
import {defineEmailTemplate} from "../_lib/defineEmailTemplate";

type Props = Readonly<{
  /** The username of the person who revoked access. */
  readonly fromUsername: string;

  /** The username of the recipient who lost access. */
  readonly toUsername: string;

  /** The unique identifier of the invoice that was unshared. */
  readonly identifier: string;

  /** Optional timestamp (ISO or human-readable). */
  readonly revokedAt?: string;
}>;

const InvoiceHasBeenUnsharedWithEmail = defineEmailTemplate<Props>({
  namespace: "email.invoiceUnshared",
  render: ({locale, t, props}) => {
    const {fromUsername, toUsername, identifier, revokedAt} = props;

    const safeTo = toUsername?.trim() ? toUsername : "there";
    const safeFrom = fromUsername?.trim() ? fromUsername : "The owner";

    const invoicesUrl = `${BRAND.url}/domains/invoices/view-invoices`;

    return (
      <EmailLayout
        locale={locale}
        title={`${BRAND.name} | ${t("badge")}`}
        preview={t("preview", {fromName: safeFrom})}
        badge={t("badge")}
        heading={t("heading")}
        primaryCta={{href: invoicesUrl, label: t("ctaPrimary")}}
        secondaryCta={{href: `mailto:${BRAND.supportEmail}`, label: t("ctaSecondary")}}>
        <Text style={EmailParagraphStyles}>{t("greeting", {toName: safeTo})}</Text>

        <Text style={EmailParagraphStyles}>
          {t.rich("intro", {
            from: () => <strong>{safeFrom}</strong>,
          })}
        </Text>

        <KeyValueTable
          title={t("detailsTitle")}
          items={[
            {label: t("details.revokedBy"), value: safeFrom},
            {label: t("details.invoiceId"), value: identifier},
            {label: t("details.revokedAt"), value: revokedAt ?? t("details.notProvided")},
            {label: t("details.yourAccess"), value: t("details.accessRevoked")},
          ]}
        />

        <EmailCard title={t("whatThisMeansTitle")}>
          <BulletList items={[t("whatThisMeans.0"), t("whatThisMeans.1"), t("whatThisMeans.2")]} />
        </EmailCard>

        <Text style={EmailParagraphStyles}>
          {t.rich("body", {
            from: () => <strong>{safeFrom}</strong>,
          })}
        </Text>

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

(InvoiceHasBeenUnsharedWithEmail as unknown as {PreviewProps: Props & {locale: EmailLocale}}).PreviewProps = {
  fromUsername: "Alex Olariu",
  toUsername: "John Doe",
  identifier: "550e8400-e29b-41d4-a716-446655440000",
  revokedAt: "December 24, 2025",
  locale: "en",
};

export default InvoiceHasBeenUnsharedWithEmail;

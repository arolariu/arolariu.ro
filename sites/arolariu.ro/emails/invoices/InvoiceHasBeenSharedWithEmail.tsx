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
import type {EmailLocale} from "../_i18n";
import {defineEmailTemplate} from "../_lib/defineEmailTemplate";

/**
 * Properties for the InvoiceHasBeenSharedWithEmail component.
 */
type Props = Readonly<{
  /** The username of the person sharing the invoice */
  readonly fromUsername: string;
  /** The username of the recipient */
  readonly toUsername: string;
  /** The unique identifier of the shared invoice */
  readonly identifier: string;
}>;

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
        title={`${BRAND.name} | ${t("badge")}`}
        preview={t("preview", {fromName: safeFrom})}
        badge={t("badge")}
        heading={t("heading")}
        primaryCta={{href: invoiceUrl, label: t("ctaPrimary")}}>
        <Text style={EmailParagraphStyles}>{t("greeting", {toName: safeTo})}</Text>

        <Text style={EmailParagraphStyles}>
          {t.rich("intro", {
            brand: () => <>{BRAND.name}</>,
            from: () => <strong>{safeFrom}</strong>,
          })}
        </Text>

        <KeyValueTable
          title={t("detailsTitle")}
          items={[
            {label: t("details.sharedBy"), value: safeFrom},
            {label: t("details.invoiceId"), value: identifier},
          ]}
        />

        <EmailCard title={t("whatYouCanDoTitle")}>
          <BulletList items={[t("whatYouCanDo.0"), t("whatYouCanDo.1"), t("whatYouCanDo.2")]} />
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

(InvoiceHasBeenSharedWithEmail as unknown as {PreviewProps: Props & {locale: EmailLocale}}).PreviewProps = {
  fromUsername: "Alex Olariu",
  toUsername: "John Doe",
  identifier: "550e8400-e29b-41d4-a716-446655440000",
  locale: "en",
};

export default InvoiceHasBeenSharedWithEmail;

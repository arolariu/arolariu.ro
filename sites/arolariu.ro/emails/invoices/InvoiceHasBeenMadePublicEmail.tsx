/**
 * @fileoverview Email template for notifying users that an invoice has been made public.
 * @module emails/invoices/InvoiceHasBeenMadePublicEmail
 *
 * @remarks
 * This template is sent to users when they successfully change the privacy setting
 * of an invoice to "public". It includes invoice details, a direct link, and a QR code.
 *
 * @see {@link https://react.email/docs/introduction}
 */

import {createTranslator} from "next-intl";
import {Img, Link, Section, Text} from "react-email";

import {
  BRAND,
  BulletList,
  EMAIL_COLORS,
  EmailCard,
  EmailLayout,
  EmailLinkStyles,
  EmailParagraphStyles,
  KeyValueTable,
} from "../_components";
import {DEFAULT_LOCALE, type EmailLocale, loadMessages} from "../_i18n";

/**
 * Properties for the InvoiceHasBeenMadePublicEmail component.
 *
 * @remarks
 * All fields are required to provide a complete summary of the invoice in the email.
 */
type Props = Readonly<{
  /** The username of the recipient */
  readonly username: string;
  /** The unique identifier of the invoice */
  readonly invoiceId: string;
  /** The display name of the invoice */
  readonly invoiceName: string;
  /** The name of the merchant associated with the invoice */
  readonly merchantName: string;
  /** The total amount of the invoice formatted as a string */
  readonly totalAmount: string;
  /** The currency code (e.g., RON, USD) */
  readonly currency: string;
  /** The date the invoice was created, formatted for display */
  readonly dateCreated: string;
  /** The locale for the email */
  readonly locale?: EmailLocale;
}>;

/**
 * React component that renders the "Invoice Made Public" email template.
 *
 * @remarks
 * **Rendering Context**: React Email (Server-side rendering for email clients).
 *
 * **Design**: Uses shared email primitives and includes a QR code for quick access.
 *
 * @param props - The invoice details to be displayed in the email.
 * @returns A rendered React Email template.
 */
const InvoiceHasBeenMadePublicEmail = async (props: Readonly<Props>) => {
  const locale: EmailLocale = props.locale ?? DEFAULT_LOCALE;
  const messages = await loadMessages(locale);
  const t = createTranslator({locale, messages, namespace: "email.invoiceMadePublic"});
  const tLayout = createTranslator({locale, messages, namespace: "email.layout"});

  const {username, invoiceId, invoiceName, merchantName, totalAmount, currency, dateCreated} = props;

  const safeName = username?.trim() ? username : "there";
  const invoiceUrl = `${BRAND.url}/domains/invoices/view-invoice/${invoiceId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(invoiceUrl)}`;

  return (
    <EmailLayout
      locale={locale}
      tLayout={tLayout}
      title={`${BRAND.name} | ${t("badge")}`}
      preview={t("preview", {invoiceName})}
      badge={t("badge")}
      heading={t("heading")}
      primaryCta={{href: invoiceUrl, label: t("ctaPrimary")}}>
      <Text style={EmailParagraphStyles}>{t("greeting", {name: safeName})}</Text>

      <Text style={EmailParagraphStyles}>{t("intro")}</Text>

      <KeyValueTable
        title={t("detailsTitle")}
        items={[
          {label: t("details.invoiceName"), value: invoiceName},
          {label: t("details.invoiceId"), value: invoiceId},
          {label: t("details.merchant"), value: merchantName},
          {label: t("details.total"), value: `${totalAmount} ${currency}`.trim()},
          {label: t("details.created"), value: dateCreated},
          {label: t("details.access"), value: t("accessValue")},
        ]}
      />

      <Section
        style={{
          border: `1px solid ${EMAIL_COLORS.border}`,
          borderRadius: "10px",
          backgroundColor: "#ffffff",
          padding: "14px 14px",
          margin: "18px 0",
          textAlign: "center",
        }}>
        <Text style={{...EmailParagraphStyles, margin: "0 0 10px", fontSize: "14px", fontWeight: "700"}}>{t("qrTitle")}</Text>
        <Img
          src={qrUrl}
          alt={t("qrAlt")}
          style={{
            display: "block",
            margin: "0 auto",
            width: "200px",
            height: "200px",
            borderRadius: "10px",
            border: `1px solid ${EMAIL_COLORS.border}`,
          }}
        />
        <Text style={{...EmailParagraphStyles, margin: "10px 0 0", fontSize: "12px", color: EMAIL_COLORS.muted}}>
          {t("qrSubText")}
        </Text>
      </Section>

      <EmailCard title={t("howToShareTitle")}>
        <BulletList items={[t("howToShare.0"), t("howToShare.1"), t("howToShare.2")]} />
      </EmailCard>

      <Section
        style={{
          border: `1px solid ${EMAIL_COLORS.warningInk}`,
          borderRadius: "10px",
          backgroundColor: EMAIL_COLORS.warningBackground,
          padding: "12px 12px",
          margin: "18px 0",
        }}>
        <Text style={{...EmailParagraphStyles, margin: "0 0 6px", fontSize: "14px", fontWeight: "700", color: EMAIL_COLORS.warningInk}}>
          {t("privacyNoticeTitle")}
        </Text>
        <Text style={{...EmailParagraphStyles, margin: "0", fontSize: "14px", color: EMAIL_COLORS.warningInk}}>
          {t("privacyNoticeBody")}
        </Text>
      </Section>

      <Text style={EmailParagraphStyles}>
        {t("directLinkLabel")}{" "}
        <Link href={invoiceUrl} style={EmailLinkStyles}>
          {invoiceUrl}
        </Link>
      </Text>

      <Text style={EmailParagraphStyles}>
        {t.rich("feedbackPrompt", {
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

InvoiceHasBeenMadePublicEmail.PreviewProps = {
  username: "Test User",
  invoiceId: "550e8400-e29b-41d4-a716-446655440000",
  invoiceName: "Grocery Shopping - Carrefour",
  merchantName: "Carrefour Romania",
  totalAmount: "247.50",
  currency: "RON",
  dateCreated: "December 20, 2024",
  locale: "en" as const,
} satisfies Props;

export default InvoiceHasBeenMadePublicEmail;
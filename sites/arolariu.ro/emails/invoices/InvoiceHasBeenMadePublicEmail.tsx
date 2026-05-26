import {selectorFromPath} from "next-intl-selector";
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
import {defineEmailTemplate} from "../_lib/defineEmailTemplate";

/**
 * Properties for the InvoiceHasBeenMadePublicEmail component.
 *
 * @remarks
 * All fields are required to provide a complete summary of the invoice in the emails.
 */
type Props = {
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
};

/**
 * React component that renders the "Invoice Made Public" email template.
 *
 * @remarks
 * **Rendering Context**: React Email (Server-side rendering for email clients).
 *
 * **Design**: Uses shared email primitives and includes a QR code for quick access.
 *
 * @param props - The invoice details to be displayed in the emails.
 * @returns A rendered React Email template.
 */
const InvoiceHasBeenMadePublicEmail = defineEmailTemplate<Props>({
  namespace: "emails.invoiceMadePublic",
  render: ({locale, t, props}) => {
    const {username, invoiceId, invoiceName, merchantName, totalAmount, currency, dateCreated} = props;

    const safeName = username?.trim() ? username : "there";
    const invoiceUrl = `${BRAND.url}/domains/invoices/view-invoice/${invoiceId}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(invoiceUrl)}`;

    return (
      <EmailLayout
        locale={locale}
        title={`${BRAND.name} | ${t(selectorFromPath("emails.invoiceMadePublic.badge"))}`}
        preview={t(selectorFromPath("emails.invoiceMadePublic.preview"), {invoiceName})}
        badge={t(selectorFromPath("emails.invoiceMadePublic.badge"))}
        heading={t(selectorFromPath("emails.invoiceMadePublic.heading"))}
        primaryCta={{href: invoiceUrl, label: t(selectorFromPath("emails.invoiceMadePublic.ctaPrimary"))}}
        secondaryCta={null}
        showUnsubscribe={false}
        unsubscribeUrl=''
        managePreferencesUrl=''>
        <Text style={EmailParagraphStyles}>{t(selectorFromPath("emails.invoiceMadePublic.greeting"), {name: safeName})}</Text>
        <Text style={EmailParagraphStyles}>{t(selectorFromPath("emails.invoiceMadePublic.intro"))}</Text>
        <KeyValueTable
          title={t(selectorFromPath("emails.invoiceMadePublic.detailsTitle"))}
          items={[
            {label: t(selectorFromPath("emails.invoiceMadePublic.details.invoiceName")), value: invoiceName},
            {label: t(selectorFromPath("emails.invoiceMadePublic.details.invoiceId")), value: invoiceId},
            {label: t(selectorFromPath("emails.invoiceMadePublic.details.merchant")), value: merchantName},
            {label: t(selectorFromPath("emails.invoiceMadePublic.details.total")), value: `${totalAmount} ${currency}`.trim()},
            {label: t(selectorFromPath("emails.invoiceMadePublic.details.created")), value: dateCreated},
            {label: t(selectorFromPath("emails.invoiceMadePublic.details.access")), value: t(selectorFromPath("emails.invoiceMadePublic.accessValue"))},
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
          <Text style={{...EmailParagraphStyles, margin: "0 0 10px", fontSize: "14px", fontWeight: "700"}}>{t(selectorFromPath("emails.invoiceMadePublic.qrTitle"))}</Text>
          <Img
            src={qrUrl}
            alt={t(selectorFromPath("emails.invoiceMadePublic.qrAlt"))}
            style={{
              display: "block",
              margin: "0 auto",
              width: "200px",
              height: "200px",
              borderRadius: "10px",
              border: `1px solid ${EMAIL_COLORS.border}`,
            }}
          />
          <Text style={{...EmailParagraphStyles, margin: "10px 0 0", fontSize: "12px", color: EMAIL_COLORS.muted}}>{t(selectorFromPath("emails.invoiceMadePublic.qrSubText"))}</Text>
        </Section>
        <EmailCard title={t(selectorFromPath("emails.invoiceMadePublic.howToShareTitle"))}>
          <BulletList items={[t(selectorFromPath("emails.invoiceMadePublic.howToShare.item0")), t(selectorFromPath("emails.invoiceMadePublic.howToShare.item1")), t(selectorFromPath("emails.invoiceMadePublic.howToShare.item2"))]} />
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
            {t(selectorFromPath("emails.invoiceMadePublic.privacyNoticeTitle"))}
          </Text>
          <Text style={{...EmailParagraphStyles, margin: "0", fontSize: "14px", color: EMAIL_COLORS.warningInk}}>
            {t(selectorFromPath("emails.invoiceMadePublic.privacyNoticeBody"))}
          </Text>
        </Section>
        <Text style={EmailParagraphStyles}>
          {t(selectorFromPath("emails.invoiceMadePublic.directLinkLabel"))}{" "}
          <Link
            href={invoiceUrl}
            style={EmailLinkStyles}>
            {invoiceUrl}
          </Link>
        </Text>
        <Text style={EmailParagraphStyles}>
          {t.rich(selectorFromPath("emails.invoiceMadePublic.feedbackPrompt"), {
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
          {t(selectorFromPath("emails.invoiceMadePublic.signOff.line1"))}
          <br />
          {t(selectorFromPath("emails.invoiceMadePublic.signOff.line2"), {brand: BRAND.name})}
        </Text>
      </EmailLayout>
    );
  },
});

InvoiceHasBeenMadePublicEmail.PreviewProps = {
  username: "Test User",
  invoiceId: "550e8400-e29b-41d4-a716-446655440000",
  invoiceName: "Grocery Shopping - Carrefour",
  merchantName: "Carrefour Romania",
  totalAmount: "247.50",
  currency: "RON",
  dateCreated: "December 20, 2024",
  locale: "en",
};

export default InvoiceHasBeenMadePublicEmail;

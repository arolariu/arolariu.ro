import {selectorFromPath} from "next-intl-selector";
/**
 * @fileoverview Progressive engagement email for invoice upload inactivity.
 * @module emails/invoices/inactivity/InvoiceUploadInactivityReminderEmail
 *
 * @remarks
 * This email template implements a progressive engagement strategy to re-activate
 * users who have stopped uploading invoices. The messaging and tone escalate based
 * on inactivity duration (3, 7, 14, or 30 days), moving from gentle nudges to
 * more direct assistance offers.
 *
 * **Engagement Strategy**:
 * - 3 days: Light "check-in" with minimal pressure
 * - 7 days: Gentle reminder emphasizing benefits
 * - 14 days: Re-engagement focus with productivity tips
 * - 30 days: Direct assistance offer with support escalation
 *
 * **Rendering Context**: React Email Component (renders to HTML email).
 *
 * **Key Features**:
 * - Type-safe inactivity period (literal union: 3 | 7 | 14 | 30)
 * - Exhaustive switch statements with compile-time validation
 * - Conditional content sections based on inactivity duration
 * - Warning callouts for extended inactivity (30+ days)
 * - Dual CTAs: Primary (create invoice) + Secondary (view invoices)
 *
 * **Design Pattern**: Progressive disclosure with escalating urgency
 * - Consistent structure across all variants
 * - Conditional tip section (14+ days)
 * - Conditional assistance section (30+ days)
 *
 * @see {@link https://react.email} - React Email documentation
 * @see {@link EmailLayout} - Base layout component
 * @see {@link AccountInactivityWarningEmail} - Related account-level inactivity email
 */

import {Link, Text} from "react-email";
import {
  BRAND,
  BulletList,
  EMAIL_COLORS,
  EmailCard,
  EmailLayout,
  EmailLinkStyles,
  EmailParagraphStyles,
  KeyValueTable,
} from "../../_components";
import {defineEmailTemplate} from "../../_lib/defineEmailTemplate";

/**
 * Properties for the invoice upload inactivity reminder email.
 *
 * @remarks
 * **Type Safety**: `daysWithoutUpload` uses literal union type (3 | 7 | 14 | 30)
 * to ensure only valid inactivity thresholds are used, preventing runtime errors
 * and enabling exhaustive switch statement validation.
 *
 * **Business Rules**:
 * - Emails typically sent at exact day thresholds (day 3, 7, 14, 30)
 * - `lastUploadDate` should be formatted for display (e.g., "Jan 5, 2026")
 * - URLs should include UTM tracking parameters for campaign analytics
 *
 * **Optional Fields**:
 * - `lastUploadDate`: Falls back to "—" if unavailable
 * - `createInvoiceUrl`: Defaults to `/domains/invoices/create-invoice`
 * - `invoicesUrl`: Defaults to `/domains/invoices/view-invoices`
 */
export type Props = {
  /**
   * User's display name for email personalization.
   * Falls back to "there" if empty or undefined.
   */
  readonly username: string;

  /**
   * Number of days since last invoice upload.
   * Literal union type ensures only valid campaign thresholds (3, 7, 14, 30).
   * Drives conditional content, messaging tone, and urgency level.
   */
  readonly daysWithoutUpload: 3 | 7 | 14 | 30;

  /**
   * Human-readable date of last upload (e.g., "January 15, 2026").
   * Displayed in status table. Falls back to "—" if not provided.
   */
  readonly lastUploadDate?: string;

  /**
   * Direct link to invoice creation page.
   * Primary CTA destination. Should include campaign tracking parameters.
   * Defaults to `${BRAND.url}/domains/invoices/create-invoice`.
   */
  readonly createInvoiceUrl?: string;

  /**
   * Link to user's invoice list page.
   * Secondary CTA destination for reviewing existing invoices.
   * Defaults to `${BRAND.url}/domains/invoices/view-invoices`.
   */
  readonly invoicesUrl?: string;
};

const InvoiceUploadInactivityReminderEmail = defineEmailTemplate<Props>({
  namespace: "email.invoiceInactivity",
  render: ({locale, t, props}) => {
    const {username, daysWithoutUpload, lastUploadDate, createInvoiceUrl, invoicesUrl} = props;

    const name = username?.trim() ? username : "there";
    const effectiveCreateInvoiceUrl = createInvoiceUrl ?? `${BRAND.url}/domains/invoices/create-invoice`;
    const effectiveInvoicesUrl = invoicesUrl ?? `${BRAND.url}/domains/invoices/view-invoices`;
    const dayKey = String(daysWithoutUpload) as "3" | "7" | "14" | "30";

    return (
      <EmailLayout
        locale={locale}
        title={`${BRAND.name} | ${t(selectorFromPath(`email.invoiceInactivity.heading.${dayKey}`))}`}
        preview={t(selectorFromPath("email.invoiceInactivity.preview"), {name, days: daysWithoutUpload})}
        badge={t(selectorFromPath(`email.invoiceInactivity.badge.${dayKey}`))}
        heading={t(selectorFromPath(`email.invoiceInactivity.heading.${dayKey}`))}
        primaryCta={{href: effectiveCreateInvoiceUrl, label: t(selectorFromPath("email.invoiceInactivity.cta.primary"))}}
        secondaryCta={{href: effectiveInvoicesUrl, label: t(selectorFromPath("email.invoiceInactivity.cta.secondary"))}}
        showUnsubscribe={false}
        unsubscribeUrl=''
        managePreferencesUrl=''>
        <Text style={EmailParagraphStyles}>{t(selectorFromPath("email.invoiceInactivity.greeting"), {name})}</Text>
        <Text style={EmailParagraphStyles}>{t(selectorFromPath(`email.invoiceInactivity.intro.${dayKey}`))}</Text>
        <EmailCard title={t(selectorFromPath("email.invoiceInactivity.whyWorthIt.title"))}>
          <BulletList items={[t(selectorFromPath("email.invoiceInactivity.whyWorthIt.bullet1")), t(selectorFromPath("email.invoiceInactivity.whyWorthIt.bullet2")), t(selectorFromPath("email.invoiceInactivity.whyWorthIt.bullet3"))]} />
        </EmailCard>
        <EmailCard title={t(selectorFromPath("email.invoiceInactivity.status.title"))}>
          <KeyValueTable
            title=''
            items={[
              {label: t(selectorFromPath("email.invoiceInactivity.status.daysWithoutUpload")), value: String(daysWithoutUpload)},
              {label: t(selectorFromPath("email.invoiceInactivity.status.lastUpload")), value: lastUploadDate ?? "—"},
            ]}
          />
        </EmailCard>
        {daysWithoutUpload >= 14 ? (
          <EmailCard title={t(selectorFromPath("email.invoiceInactivity.tip.title"))}>
            <Text style={{...EmailParagraphStyles, fontSize: "14px", margin: "0"}}>{t(selectorFromPath("email.invoiceInactivity.tip.message"))}</Text>
          </EmailCard>
        ) : null}
        {daysWithoutUpload >= 30 ? (
          <EmailCard title={t(selectorFromPath("email.invoiceInactivity.important.title"))}>
            <Text
              style={{
                ...EmailParagraphStyles,
                fontSize: "14px",
                margin: "0",
                backgroundColor: EMAIL_COLORS.warningBackground,
                border: `1px solid ${EMAIL_COLORS.warningInk}`,
                borderRadius: "10px",
                padding: "12px",
              }}>
              {t(selectorFromPath("email.invoiceInactivity.important.message"))}
            </Text>
          </EmailCard>
        ) : null}
        <Text style={EmailParagraphStyles}>
          {t.rich(selectorFromPath("email.invoiceInactivity.helpPrompt"), {
            supportEmail: BRAND.supportEmail,
            link: (chunks) => (
              <Link
                href={`mailto:${BRAND.supportEmail}`}
                style={EmailLinkStyles}>
                {chunks}
              </Link>
            ),
          })}
        </Text>
        <Text style={{...EmailParagraphStyles, margin: "0"}}>
          {t(selectorFromPath("email.invoiceInactivity.signOff.line1"))}
          <br />
          {t(selectorFromPath("email.invoiceInactivity.signOff.line2"), {brand: BRAND.name})}
        </Text>
      </EmailLayout>
    );
  },
});

InvoiceUploadInactivityReminderEmail.PreviewProps = {
  username: "Test User",
  daysWithoutUpload: 7,
  lastUploadDate: "2025-12-21",
  locale: "en",
};

export default InvoiceUploadInactivityReminderEmail;
export {InvoiceUploadInactivityReminderEmail};

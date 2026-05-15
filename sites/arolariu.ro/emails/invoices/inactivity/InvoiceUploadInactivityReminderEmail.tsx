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
 * - Status timeline for transparency
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
import {createEmailTranslator, DEFAULT_LOCALE, type EmailLocale, loadMessages} from "../../_i18n";

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
export type Props = Readonly<{
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

  /**
   * Locale for email translation (en, ro, fr).
   * Defaults to DEFAULT_LOCALE ("en").
   */
  readonly locale?: EmailLocale;
}>;

/**
 * Renders progressive engagement email for invoice upload inactivity.
 *
 * @remarks
 * **Rendering Context**: React Email component rendered to HTML email markup.
 *
 * **Email Client Compatibility**: Tested with major email clients (Gmail, Outlook,
 * Apple Mail). Uses inline styles and table-based layout for maximum compatibility.
 *
 * **Progressive Content Strategy**:
 * The email structure adapts based on `daysWithoutUpload`:
 *
 * - **Always shown**: Greeting, intro, benefits card, status table, support contact
 * - **14+ days**: Productivity tip card with action suggestion
 * - **30+ days**: Highlighted assistance card with support escalation
 *
 * **Conditional Rendering Logic**:
 * ```typescript
 * {daysWithoutUpload >= 14 ? <TipCard /> : null}
 * {daysWithoutUpload >= 30 ? <AssistanceCard /> : null}
 * ```
 *
 * **Design Philosophy**: "Small consistency beats big catch-up"
 * - Encourages single upload rather than overwhelming backlog
 * - Emphasizes benefits (timeline accuracy, faster receipt search)
 * - Reduces friction with direct upload CTA
 * - Escalates to human support at 30+ days
 *
 * **CTA Strategy**:
 * - Primary: "Upload an invoice" (action-oriented, immediate)
 * - Secondary: "View invoices" (context review, lower commitment)
 *
 * **Accessibility**:
 * - Semantic HTML structure with proper heading hierarchy
 * - Descriptive link labels
 * - Sufficient color contrast for warning callouts
 * - Table layout for email client compatibility
 *
 * @param props - Email configuration with user details and inactivity duration
 * @returns React Email component JSX rendered to HTML
 *
 * @example
 * ```tsx
 * // Early nudge (3 days) with minimal pressure
 * <InvoiceUploadInactivityReminderEmail
 *   username="Sarah Chen"
 *   daysWithoutUpload={3}
 *   lastUploadDate="February 7, 2026"
 *   createInvoiceUrl="https://arolariu.ro/domains/invoices/create-invoice?utm_source=email&utm_campaign=inactivity_3d"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Extended inactivity (30 days) with support escalation
 * <InvoiceUploadInactivityReminderEmail
 *   username="John Doe"
 *   daysWithoutUpload={30}
 *   lastUploadDate="January 11, 2026"
 * />
 * // Shows: Greeting, intro, benefits, status, productivity tip, assistance card, support contact
 * ```
 *
 * @example
 * ```tsx
 * // Minimal props with defaults
 * <InvoiceUploadInactivityReminderEmail
 *   username=""
 *   daysWithoutUpload={7}
 * />
 * // Uses fallbacks: "there" for username, default URLs, no lastUploadDate
 * ```
 *
 * @see {@link EmailLayout} - Base layout with header/footer
 * @see {@link EmailCard} - Card containers for content sections
 * @see {@link BulletList} - Benefit list component
 * @see {@link KeyValueTable} - Status timeline display
 */
export async function InvoiceUploadInactivityReminderEmail(props: Readonly<Props>) {
  const {username, daysWithoutUpload, lastUploadDate, createInvoiceUrl, invoicesUrl} = props;
  const locale: EmailLocale = props.locale ?? DEFAULT_LOCALE;
  const messages = await loadMessages(locale);
  const t = createEmailTranslator({locale, messages, namespace: "email.invoiceInactivity"});

  const name = username?.trim() ? username : "there";
  const effectiveCreateInvoiceUrl = createInvoiceUrl ?? `${BRAND.url}/domains/invoices/create-invoice`;
  const effectiveInvoicesUrl = invoicesUrl ?? `${BRAND.url}/domains/invoices/view-invoices`;
  const dayKey = String(daysWithoutUpload) as "3" | "7" | "14" | "30";

  return (
    <EmailLayout
      locale={locale}
      title={`${BRAND.name} | ${t(`heading.${dayKey}`)}`}
      preview={t("preview", {name, days: daysWithoutUpload})}
      badge={t(`badge.${dayKey}`)}
      heading={t(`heading.${dayKey}`)}
      primaryCta={{href: effectiveCreateInvoiceUrl, label: t("cta.primary")}}
      secondaryCta={{href: effectiveInvoicesUrl, label: t("cta.secondary")}}>
      <Text style={EmailParagraphStyles}>{t("greeting", {name})}</Text>

      <Text style={EmailParagraphStyles}>{t(`intro.${dayKey}`)}</Text>

      <EmailCard title={t("whyWorthIt.title")}>
        <BulletList items={[t("whyWorthIt.bullet1"), t("whyWorthIt.bullet2"), t("whyWorthIt.bullet3")]} />
      </EmailCard>

      <EmailCard title={t("status.title")}>
        <KeyValueTable
          items={[
            {label: t("status.daysWithoutUpload"), value: String(daysWithoutUpload)},
            {label: t("status.lastUpload"), value: lastUploadDate ?? "—"},
          ]}
        />
      </EmailCard>

      {daysWithoutUpload >= 14 ? (
        <EmailCard title={t("tip.title")}>
          <Text style={{...EmailParagraphStyles, fontSize: "14px", margin: "0"}}>{t("tip.message")}</Text>
        </EmailCard>
      ) : null}

      {daysWithoutUpload >= 30 ? (
        <EmailCard title={t("important.title")}>
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
            {t("important.message")}
          </Text>
        </EmailCard>
      ) : null}

      <Text style={EmailParagraphStyles}>
        {t.rich("helpPrompt", {
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
        {t("signOff.line1")}
        <br />
        {t("signOff.line2", {brand: BRAND.name})}
      </Text>
    </EmailLayout>
  );
}

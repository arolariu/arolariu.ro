/**
 * @fileoverview Reminder email for invoices with incomplete or partial AI analysis.
 * @module emails/invoices/reminders/IncompleteInvoiceReminderEmail
 *
 * @remarks
 * This template is sent when AI analysis was run on an invoice but produced
 * incomplete results — for example, items were extracted but no merchant was
 * identified, or the merchant was found but no line items could be parsed.
 *
 * **Triggering Condition**: Invoice has been analyzed but is missing key fields:
 * - No merchant reference (merchantReference is empty)
 * - No items extracted (items array is empty)
 * - No payment information (totalCostAmount is 0 or null)
 * Sent 72 hours after partial analysis.
 *
 * **Rendering Context**: React Email Component (renders to HTML email).
 *
 * **Design Philosophy**: Encouraging and actionable — shows exactly what's missing
 * with specific guidance on how to fix each issue. Avoids blaming the user.
 *
 * @see {@link UnanalyzedInvoicesReminderEmail} - For invoices not yet analyzed
 * @see {@link InvoiceHasBeenAnalyzedEmail} - For successfully analyzed invoices
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
import {createEmailTranslator, DEFAULT_LOCALE, type EmailLocale, loadMessages} from "../../_lib/i18n";

/**
 * Describes what's missing from an incomplete invoice.
 */
type MissingField = "merchant" | "items" | "payment" | "category";

/**
 * Properties for the IncompleteInvoiceReminderEmail component.
 */
type Props = {
  /** User's display name. Falls back to "there" if empty. */
  readonly username: string;

  /** Name or identifier of the incomplete invoice. */
  readonly invoiceName: string;

  /** Human-readable date of the analysis attempt (e.g., "February 8, 2026"). */
  readonly analysisDate: string;

  /** List of missing or incomplete fields. */
  readonly missingFields: readonly MissingField[];

  /** Direct link to edit this invoice. */
  readonly editInvoiceUrl: string;

  /** Direct link to re-run analysis on this invoice. */
  readonly reanalyzeUrl?: string;

  /** Email locale for translation. */
  readonly locale?: EmailLocale;
};

/**
 * React component that renders the "Incomplete Invoice Reminder" email.
 *
 * @remarks
 * **Rendering Context**: React Email.
 *
 * **Content Strategy**:
 * - Invoice summary with analysis date
 * - Missing fields list with specific suggestions
 * - Tips card for improving analysis results
 * - Primary CTA: edit invoice
 * - Optional secondary CTA: re-run analysis
 *
 * @param props - User details and incomplete invoice information.
 * @returns A rendered React Email template.
 *
 * @example
 * ```tsx
 * <IncompleteInvoiceReminderEmail
 *   username="Sarah Chen"
 *   invoiceName="Blurry Receipt #42"
 *   analysisDate="February 8, 2026"
 *   missingFields={["merchant", "items"]}
 *   editInvoiceUrl="https://arolariu.ro/domains/invoices/edit-invoice/abc-123"
 *   locale="en"
 * />
 * ```
 */
const IncompleteInvoiceReminderEmail = async (props: Readonly<Props>): Promise<React.JSX.Element> => {
  const {username, invoiceName, analysisDate, missingFields, editInvoiceUrl, reanalyzeUrl} = props;

  const locale: EmailLocale = props.locale ?? DEFAULT_LOCALE;
  const messages = await loadMessages(locale);
  const t = createEmailTranslator({locale, messages, namespace: "email.incompleteInvoice"});

  const name = username?.trim() ? username : "there";

  return (
    <EmailLayout
      locale={locale}
      title={`${BRAND.name} | Incomplete invoice`}
      preview={t("preview", {name, invoiceName})}
      badge={t("badge")}
      heading={t("heading")}
      primaryCta={{href: editInvoiceUrl, label: t("primaryCta")}}
      secondaryCta={reanalyzeUrl ? {href: reanalyzeUrl, label: t("secondaryCta")} : null}
      showUnsubscribe={true}
      unsubscribeUrl={`${BRAND.url}/unsubscribe`}
      managePreferencesUrl={`${BRAND.url}/settings/notifications`}>
      <Text style={EmailParagraphStyles}>{t("greeting", {name})}</Text>
      <Text style={EmailParagraphStyles}>{t("intro", {invoiceName: `"${invoiceName}"`})}</Text>
      <KeyValueTable
        title={t("invoiceDetailsTitle")}
        items={[
          {label: t("invoiceLabel"), value: invoiceName},
          {label: t("analyzedOnLabel"), value: analysisDate},
          {label: t("missingFieldsLabel"), value: String(missingFields.length)},
        ]}
      />
      <EmailCard title={t("whatsMissingTitle")}>
        {missingFields.map((field) => {
          const label = t(`missingFields.${field}.label`);
          const suggestion = t(`missingFields.${field}.suggestion`);
          return (
            <Text
              key={field}
              style={{
                ...EmailParagraphStyles,
                fontSize: "14px",
                margin: "0 0 10px",
                padding: "10px 12px",
                backgroundColor: EMAIL_COLORS.warningBackground,
                border: `1px solid ${EMAIL_COLORS.border}`,
                borderRadius: "8px",
              }}>
              <strong>{label}:</strong> {suggestion}
            </Text>
          );
        })}
      </EmailCard>
      <EmailCard title={t("tipsTitle")}>
        <BulletList items={[t("tips.0"), t("tips.1"), t("tips.2"), t("tips.3")]} />
      </EmailCard>
      <Text style={EmailParagraphStyles}>{t("bodyText")}</Text>
      <Text style={EmailParagraphStyles}>
        {t.rich("feedback", {
          supportEmail: BRAND.supportEmail,
          // eslint-disable-next-line react/no-unstable-nested-components -- emails render server-side via React Email; never mounted, no reconciliation
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
};

IncompleteInvoiceReminderEmail.PreviewProps = {
  username: "Test User",
  invoiceName: "Blurry Receipt — Feb 8",
  analysisDate: "February 8, 2026",
  missingFields: ["merchant", "items"],
  editInvoiceUrl: "https://arolariu.ro/domains/invoices/edit-invoice/abc-123",
  reanalyzeUrl: "https://arolariu.ro/domains/invoices/view-invoice/abc-123?action=analyze",
  locale: "en",
} satisfies Props;

export default IncompleteInvoiceReminderEmail;

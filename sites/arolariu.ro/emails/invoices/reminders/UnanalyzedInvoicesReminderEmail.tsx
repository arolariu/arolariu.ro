/**
 * @fileoverview Reminder email for invoices awaiting AI analysis.
 * @module emails/invoices/reminders/UnanalyzedInvoicesReminderEmail
 *
 * @remarks
 * This template is sent when a user has uploaded invoices but hasn't triggered
 * AI analysis on them. It explains the value of analysis (item extraction,
 * allergen detection, recipe suggestions) and provides a direct CTA.
 *
 * **Triggering Condition**: User has 1+ invoices where `additionalMetadata.requiresAnalysis`
 * is unset or the invoice has no items extracted, 24-48 hours after upload.
 *
 * **Rendering Context**: React Email Component (renders to HTML email).
 *
 * **Design Philosophy**: Helpful and informative — focuses on what the user is
 * missing out on rather than creating urgency. Shows specific invoice names
 * to make the CTA feel actionable.
 *
 * @see {@link InvoiceHasBeenAnalyzedEmail} - Sent after analysis completes
 * @see {@link IncompleteInvoiceReminderEmail} - For partially analyzed invoices
 */

import {Link, Text} from "react-email";
import {BRAND, BulletList, EmailCard, EmailLayout, EmailLinkStyles, EmailParagraphStyles, KeyValueTable} from "../../_components";
import {createEmailTranslator, DEFAULT_LOCALE, type EmailLocale, loadMessages, selectorFromPath} from "../../_lib/i18n";

/**
 * Represents a single unanalyzed invoice for display in the emails.
 */
type UnanalyzedInvoice = {
  /** Invoice name or fallback identifier. */
  readonly name: string;

  /** Human-readable upload date (e.g., "February 8, 2026"). */
  readonly uploadDate: string;

  /** Direct link to view/analyze this specific invoice. */
  readonly url: string;
};

/**
 * Properties for the UnanalyzedInvoicesReminderEmail component.
 */
type Props = {
  /** User's display name. Falls back to "there" if empty. */
  readonly username: string;

  /** List of invoices awaiting analysis (max 5 shown in email). */
  readonly invoices: readonly UnanalyzedInvoice[];

  /** Link to the invoices list page. */
  readonly invoicesUrl?: string;

  /** Email locale for translation. */
  readonly locale?: EmailLocale;
};

/**
 * React component that renders the "Unanalyzed Invoices Reminder" emails.
 *
 * @remarks
 * **Rendering Context**: React Email.
 *
 * **Content Strategy**:
 * - Count of pending invoices in heading
 * - KeyValueTable listing each invoice by name and date
 * - "What analysis provides" feature card
 * - Primary CTA to view invoices
 *
 * @param props - User details and unanalyzed invoice list.
 * @returns A rendered React Email template.
 *
 * @example
 * ```tsx
 * <UnanalyzedInvoicesReminderEmail
 *   username="Sarah Chen"
 *   invoices={[
 *     {name: "Lidl Groceries", uploadDate: "Feb 8, 2026", url: "https://arolariu.ro/domains/invoices/view-invoice/abc"},
 *     {name: "Kaufland Receipt", uploadDate: "Feb 9, 2026", url: "https://arolariu.ro/domains/invoices/view-invoice/def"},
 *   ]}
 *   locale="en"
 * />
 * ```
 */
const UnanalyzedInvoicesReminderEmail = async (props: Readonly<Props>): Promise<React.JSX.Element> => {
  const {username, invoices, invoicesUrl} = props;

  const locale: EmailLocale = props.locale ?? DEFAULT_LOCALE;
  const messages = await loadMessages(locale);
  const t = createEmailTranslator({locale, messages, namespace: "emails.unanalyzedInvoices"});

  const name = username?.trim() ? username : "there";
  const effectiveInvoicesUrl = invoicesUrl ?? `${BRAND.url}/domains/invoices/view-invoices`;
  const count = invoices.length;
  const displayInvoices = invoices.slice(0, 5);

  return (
    <EmailLayout
      locale={locale}
      title={`${BRAND.name} | Invoices awaiting analysis`}
      preview={t(selectorFromPath("emails.unanalyzedInvoices.preview"), {name, count})}
      badge={t(selectorFromPath("emails.unanalyzedInvoices.badge"))}
      heading={t(selectorFromPath("emails.unanalyzedInvoices.heading"), {count})}
      primaryCta={{href: effectiveInvoicesUrl, label: t(selectorFromPath("emails.unanalyzedInvoices.primaryCta"))}}
      secondaryCta={null}
      showUnsubscribe={true}
      unsubscribeUrl={`${BRAND.url}/unsubscribe`}
      managePreferencesUrl={`${BRAND.url}/settings/notifications`}>
      <Text style={EmailParagraphStyles}>{t(selectorFromPath("emails.unanalyzedInvoices.greeting"), {name})}</Text>
      <Text style={EmailParagraphStyles}>{t(selectorFromPath("emails.unanalyzedInvoices.intro"), {count})}</Text>
      <KeyValueTable
        title={t(selectorFromPath("emails.unanalyzedInvoices.invoicesAwaitingTitle"))}
        items={displayInvoices.map((invoice) => ({
          label: invoice.name,
          value: t(selectorFromPath("emails.unanalyzedInvoices.uploadedDate"), {date: invoice.uploadDate}),
        }))}
      />
      {count > 5 ? (
        <Text style={{...EmailParagraphStyles, fontSize: "13px"}}>
          {t.rich(selectorFromPath("emails.unanalyzedInvoices.andMore"), {
            remaining: count - 5,
            // eslint-disable-next-line react/no-unstable-nested-components -- emails render server-side via React Email; never mounted, no reconciliation
            dashboard: () => (
              <Link
                href={effectiveInvoicesUrl}
                style={EmailLinkStyles}>
                dashboard
              </Link>
            ),
          })}
        </Text>
      ) : null}
      <EmailCard title={t(selectorFromPath("emails.unanalyzedInvoices.analysisProvidedTitle"))}>
        <BulletList
          items={[
            t(selectorFromPath("emails.unanalyzedInvoices.analysisProvides.item0")),
            t(selectorFromPath("emails.unanalyzedInvoices.analysisProvides.item1")),
            t(selectorFromPath("emails.unanalyzedInvoices.analysisProvides.item2")),
            t(selectorFromPath("emails.unanalyzedInvoices.analysisProvides.item3")),
            t(selectorFromPath("emails.unanalyzedInvoices.analysisProvides.item4")),
          ]}
        />
      </EmailCard>
      <Text style={EmailParagraphStyles}>{t(selectorFromPath("emails.unanalyzedInvoices.bodyText"))}</Text>
      <Text style={EmailParagraphStyles}>
        {t.rich(selectorFromPath("emails.unanalyzedInvoices.feedback"), {
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
        {t(selectorFromPath("emails.unanalyzedInvoices.signOff.line1"))}
        <br />
        {t(selectorFromPath("emails.unanalyzedInvoices.signOff.line2"), {brand: BRAND.name})}
      </Text>
    </EmailLayout>
  );
};

UnanalyzedInvoicesReminderEmail.PreviewProps = {
  username: "Test User",
  invoices: [
    {name: "Lidl Groceries", uploadDate: "Feb 8, 2026", url: "https://arolariu.ro/domains/invoices/view-invoice/abc-123"},
    {name: "Kaufland Receipt", uploadDate: "Feb 9, 2026", url: "https://arolariu.ro/domains/invoices/view-invoice/def-456"},
    {name: "Mega Image — Feb 10", uploadDate: "Feb 10, 2026", url: "https://arolariu.ro/domains/invoices/view-invoice/ghi-789"},
  ],
  locale: "en",
} satisfies Props;

export default UnanalyzedInvoicesReminderEmail;

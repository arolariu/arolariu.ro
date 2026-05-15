/**
 * @fileoverview Celebration email sent after a user uploads their very first invoice.
 * @module emails/invoices/FirstInvoiceUploadedEmail
 *
 * @remarks
 * This template is an onboarding milestone email sent when a user creates their
 * first invoice. It celebrates the action, explains what happens next (AI analysis),
 * and introduces features the user hasn't used yet.
 *
 * **Triggering Condition**: User's invoice count goes from 0 to 1.
 *
 * **Rendering Context**: React Email Component (renders to HTML email).
 *
 * **Design Philosophy**: Celebratory and educational — reinforces the user's decision
 * to engage with the platform and reduces uncertainty about next steps.
 *
 * @see {@link WelcomeEmail} - Precedes this in the onboarding sequence
 * @see {@link InvoiceHasBeenAnalyzedEmail} - Sent when AI analysis completes
 */

import {Link, Text} from "react-email";

import {BRAND, BulletList, EmailCard, EmailLayout, EmailLinkStyles, EmailParagraphStyles, KeyValueTable} from "../_components";
import type {EmailLocale} from "../_i18n";
import {defineEmailTemplate} from "../_lib/defineEmailTemplate";

/**
 * Properties for the FirstInvoiceUploadedEmail component.
 */
type Props = {
  /** User's display name for email personalization. Falls back to "there" if empty. */
  readonly username: string;

  /** Name or identifier of the uploaded invoice. */
  readonly invoiceName: string;

  /** Human-readable upload timestamp (e.g., "February 10, 2026 at 14:30"). */
  readonly uploadDate: string;

  /** Direct link to view the uploaded invoice. */
  readonly invoiceUrl?: string;

  /** Direct link to upload another receipt. */
  readonly uploadUrl?: string;
};

/**
 * React component that renders the "First Invoice Uploaded" celebration email.
 *
 * @remarks
 * **Rendering Context**: React Email.
 *
 * **Content Strategy**:
 * - Celebration of the milestone
 * - Invoice summary card
 * - "What happens next" step-by-step explanation
 * - Feature discovery card (sharing, statistics, recipes)
 * - Dual CTAs: view invoice + upload another
 *
 * @param props - The username and invoice details.
 * @returns A rendered React Email template.
 *
 * @example
 * ```tsx
 * <FirstInvoiceUploadedEmail
 *   username="Sarah Chen"
 *   invoiceName="Lidl Groceries"
 *   uploadDate="February 10, 2026 at 14:30"
 * />
 * ```
 */
const FirstInvoiceUploadedEmail = defineEmailTemplate<Props>({
  namespace: "email.firstInvoiceUploaded",
  render: ({locale, t, props}) => {
    const {username, invoiceName, uploadDate, invoiceUrl, uploadUrl} = props;

    const name = username?.trim() ? username : "there";
    const effectiveInvoiceUrl = invoiceUrl ?? `${BRAND.url}/domains/invoices/view-invoices`;
    const effectiveUploadUrl = uploadUrl ?? `${BRAND.url}/domains/invoices/upload-scans`;

    return (
      <EmailLayout
        locale={locale}
        title={`${BRAND.name} | ${t("badge")}`}
        preview={t("preview", {name})}
        badge={t("badge")}
        heading={t("heading")}
        primaryCta={{href: effectiveInvoiceUrl, label: t("ctaPrimary")}}
        secondaryCta={{href: effectiveUploadUrl, label: t("ctaSecondary")}}>
        <Text style={EmailParagraphStyles}>{t("greeting", {name})}</Text>

        <Text style={EmailParagraphStyles}>{t("intro")}</Text>

        <KeyValueTable
          title={t("invoiceSummaryTitle")}
          items={[
            {label: t("invoiceSummary.invoiceName"), value: invoiceName || t("untitledFallback")},
            {label: t("invoiceSummary.uploaded"), value: uploadDate},
            {label: t("invoiceSummary.status"), value: t("statusValue")},
          ]}
        />

        <EmailCard title={t("whatHappensNextTitle")}>
          <BulletList items={[t("whatHappensNext.0"), t("whatHappensNext.1"), t("whatHappensNext.2")]} />
        </EmailCard>

        <EmailCard title={t("featuresToExploreTitle")}>
          <BulletList items={[t("featuresToExplore.0"), t("featuresToExplore.1"), t("featuresToExplore.2"), t("featuresToExplore.3")]} />
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

(FirstInvoiceUploadedEmail as unknown as {PreviewProps: Props & {locale: EmailLocale}}).PreviewProps = {
  username: "Test User",
  invoiceName: "Lidl Groceries — Feb 10",
  uploadDate: "February 10, 2026 at 14:30",
  locale: "en",
};

export default FirstInvoiceUploadedEmail;

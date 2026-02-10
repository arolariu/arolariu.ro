/**
 * @fileoverview Welcome email sent to new users upon first sign-up.
 * @module emails/accounts/WelcomeEmail
 *
 * @remarks
 * This template is the very first email a user receives after creating an account.
 * It introduces the platform's core value proposition, highlights key features
 * (upload, analyze, track), and provides a clear CTA to upload their first receipt.
 *
 * **Triggering Condition**: User account created successfully (first sign-up).
 *
 * **Rendering Context**: React Email Component (renders to HTML email).
 *
 * @see {@link EmailLayout} - Base layout component
 * @see {@link FirstInvoiceUploadedEmail} - Follow-up email after first upload
 */

import {Link, Text} from "@react-email/components";
import {BRAND, BulletList, EmailCard, EmailLayout, EmailLinkStyles, EmailParagraphStyles} from "../_components";

/**
 * Properties for the WelcomeEmail component.
 */
type Props = Readonly<{
  /** User's display name for email personalization. Falls back to "there" if empty. */
  readonly username: string;

  /** Direct link to the upload page. Defaults to `${BRAND.url}/domains/invoices/upload-scans`. */
  readonly uploadUrl?: string;

  /** Link to the main dashboard. Defaults to `${BRAND.url}/domains/invoices/view-invoices`. */
  readonly dashboardUrl?: string;
}>;

/**
 * React component that renders the "Welcome" email template.
 *
 * @remarks
 * **Rendering Context**: React Email.
 *
 * **Content Strategy**:
 * - Warm, personal greeting
 * - Three-step "how it works" explanation
 * - Feature highlights card
 * - Primary CTA to upload first receipt
 * - Secondary CTA to explore the dashboard
 *
 * @param props - The username and optional URLs.
 * @returns A rendered React Email template.
 *
 * @example
 * ```tsx
 * <WelcomeEmail username="Sarah Chen" />
 * ```
 */
const WelcomeEmail = (props: Readonly<Props>) => {
  const {username, uploadUrl, dashboardUrl} = props;

  const name = username?.trim() ? username : "there";
  const effectiveUploadUrl = uploadUrl ?? `${BRAND.url}/domains/invoices/upload-scans`;
  const effectiveDashboardUrl = dashboardUrl ?? `${BRAND.url}/domains/invoices/view-invoices`;

  return (
    <EmailLayout
      title={`${BRAND.name} | Welcome`}
      preview={`Welcome to ${BRAND.name}, ${name}! Let's get started.`}
      badge='Welcome'
      heading={`Welcome to ${BRAND.name}`}
      primaryCta={{href: effectiveUploadUrl, label: "Upload your first receipt"}}
      secondaryCta={{href: effectiveDashboardUrl, label: "Explore the dashboard"}}>
      <Text style={EmailParagraphStyles}>Hi {name},</Text>

      <Text style={EmailParagraphStyles}>
        Thanks for joining <strong>{BRAND.name}</strong>. We're glad you're here. Our platform helps you turn everyday receipts into
        organized financial insights — powered by AI analysis.
      </Text>

      <EmailCard title='How it works'>
        <BulletList
          items={[
            "Upload — snap a photo or upload a PDF of any receipt",
            "Analyze — our AI extracts items, prices, merchants, and even suggests recipes from grocery receipts",
            "Track — view spending dashboards by merchant, category, month, or year",
          ]}
        />
      </EmailCard>

      <EmailCard title='What you can do'>
        <BulletList
          items={[
            "Get allergen alerts on food products",
            "Share invoices with family members or colleagues",
            "Export statistics and spending reports",
            "Access your data from any device",
          ]}
        />
      </EmailCard>

      <Text style={EmailParagraphStyles}>
        Ready to get started? Upload your first receipt and watch the magic happen. The whole process takes less than a minute.
      </Text>

      <Text style={EmailParagraphStyles}>
        Questions or feedback? We'd love to hear from you at{" "}
        <Link
          href={`mailto:${BRAND.supportEmail}`}
          style={EmailLinkStyles}>
          {BRAND.supportEmail}
        </Link>
        .
      </Text>

      <Text style={{...EmailParagraphStyles, margin: "0"}}>
        {BRAND.signOff},
        <br />
        {BRAND.teamName}
      </Text>
    </EmailLayout>
  );
};

WelcomeEmail.PreviewProps = {
  username: "Test User",
} satisfies Props;

export default WelcomeEmail;

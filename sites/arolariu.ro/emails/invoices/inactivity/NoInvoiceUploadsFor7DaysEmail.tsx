/**
 * @fileoverview Inactivity nudge: 7 days without invoice uploads.
 * @module emails/invoices/inactivity/NoInvoiceUploadsFor7DaysEmail
 *
 * @remarks
 * This email template is the **second milestone** in a progressive engagement sequence
 * designed to re-activate users who have stopped uploading invoices.
 *
 * **Progressive Engagement Flow**:
 * - Day 3: Light "check-in" with minimal pressure
 * - **Day 7** (this email): Gentle reminder emphasizing benefits
 * - Day 14: Re-engagement focus with productivity tips
 * - Day 30: Direct assistance offer with support escalation
 *
 * **Triggering Conditions**:
 * - User has not uploaded any invoices in the past 7 days
 * - User has previously uploaded at least one invoice (not new users)
 * - User account is active (not suspended or deleted)
 * - User did not respond to the 3-day nudge (if sent)
 *
 * **Rendering Context**: React Email Component (renders to HTML email via React Email).
 *
 * **Design Philosophy**: This 7-day variant uses a gentle but more assertive tone
 * than the 3-day nudge. The messaging emphasizes the benefits of invoice tracking
 * (financial insights, expense management, tax preparation) to re-activate engagement.
 * The goal is to remind users of value they're missing without being pushy.
 *
 * **Tone Escalation**: Compared to the 3-day email, this variant:
 * - Uses slightly more direct language ("we noticed you haven't uploaded")
 * - Emphasizes benefits and value proposition more explicitly
 * - Maintains supportive tone without pressure or guilt
 * - Still avoids urgency or warning language (reserved for 14+ day milestones)
 *
 * **Implementation Pattern**: This is a thin wrapper around the base
 * {@link InvoiceUploadInactivityReminderEmail} component, which contains the actual
 * email structure and conditional logic. This pattern allows centralized updates to the
 * email template while maintaining type-safe milestone variants.
 *
 * @see {@link InvoiceUploadInactivityReminderEmail} - Base template with progressive logic
 * @see {@link NoInvoiceUploadsFor3DaysEmail} - Previous milestone (3 days)
 * @see {@link NoInvoiceUploadsFor14DaysEmail} - Next milestone (14 days)
 * @see {@link https://react.email} - React Email documentation
 */

import {InvoiceUploadInactivityReminderEmail} from "./InvoiceUploadInactivityReminderEmail";

/**
 * Props for the 7-day inactivity email component.
 */
type Props = Readonly<{
  /**
   * User's display name for email personalization.
   * Falls back to "there" if empty or undefined.
   */
  readonly username: string;

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
}>;

/**
 * Email component for 7-day invoice upload inactivity milestone.
 *
 * @remarks
 * **Engagement Stage**: Second gentle reminder emphasizing benefits.
 *
 * **Tone**: Friendly and benefit-focused, emphasizing value without pressure.
 *
 * **Content Characteristics**:
 * - Opens with "we noticed you haven't uploaded" acknowledgment
 * - Emphasizes benefits: financial insights, expense tracking, tax prep
 * - Highlights loss of value (what user is missing by not uploading)
 * - Single primary CTA: "Upload New Invoice"
 * - Secondary CTA: "View All Invoices"
 * - Status timeline showing last upload date (typically ~7 days ago)
 * - No warning banners or assistance sections (reserved for 14+ day milestones)
 *
 * **Rendering Context**: React Email Component (server-side rendered to HTML).
 *
 * **Email Delivery**: Typically triggered by background job checking user activity.
 * Email is rendered to HTML and sent via transactional email service (e.g., SendGrid).
 * Only sent if user has not uploaded since the 3-day reminder.
 *
 * **Personalization**: Uses username for greeting and lastUploadDate for context.
 * CTAs can include campaign tracking parameters for analytics (recommended:
 * `utm_source=email&utm_campaign=7day_reminder`).
 *
 * **Design Pattern**: Wrapper component that delegates to base template with hardcoded
 * `daysWithoutUpload={7}` parameter. This ensures type safety and consistent milestone
 * definitions across the engagement flow. The base component uses this value to:
 * - Adjust messaging tone and emphasis
 * - Show/hide conditional content sections
 * - Customize CTA button text
 *
 * **Conversion Goals**: At this stage, the primary goal is to remind users of the
 * platform's value proposition and nudge them back into active usage. Secondary goal
 * is to identify users who have abandoned the platform (non-responders progress to
 * 14-day milestone).
 *
 * @param props - Email configuration with user details and CTA links
 * @returns React Email JSX element that renders to HTML email
 *
 * @example
 * ```tsx
 * // Usage in email sending service
 * import NoInvoiceUploadsFor7DaysEmail from './NoInvoiceUploadsFor7DaysEmail';
 * import { render } from '@react-email/render';
 *
 * const emailHtml = render(
 *   <NoInvoiceUploadsFor7DaysEmail
 *     username="Jane Smith"
 *     lastUploadDate="February 3, 2026"
 *     createInvoiceUrl="https://arolariu.ro/domains/invoices/create-invoice?utm_source=email&utm_campaign=7day_reminder"
 *     invoicesUrl="https://arolariu.ro/domains/invoices/view-invoices?utm_source=email&utm_campaign=7day_reminder"
 *   />
 * );
 *
 * await sendEmail({
 *   to: user.email,
 *   subject: "Your invoice tracker misses you 📊",
 *   html: emailHtml
 * });
 * ```
 *
 * @example
 * ```tsx
 * // Preview in Storybook or development
 * <NoInvoiceUploadsFor7DaysEmail
 *   username="Test User"
 *   lastUploadDate="2026-02-03"
 * />
 * ```
 *
 * @see {@link InvoiceUploadInactivityReminderEmail} - Base template implementation
 * @see {@link NoInvoiceUploadsFor3DaysEmail} - Previous milestone (3 days)
 * @see {@link NoInvoiceUploadsFor14DaysEmail} - Next milestone (14 days)
 */
const NoInvoiceUploadsFor7DaysEmail = (props: Readonly<Props>) => {
  const {username, lastUploadDate, createInvoiceUrl, invoicesUrl} = props;

  return (
    <InvoiceUploadInactivityReminderEmail
      username={username}
      lastUploadDate={lastUploadDate}
      createInvoiceUrl={createInvoiceUrl}
      invoicesUrl={invoicesUrl}
      daysWithoutUpload={7}
    />
  );
};

/**
 * Preview props for email template development and testing.
 *
 * @remarks
 * Used by React Email preview server and Storybook to render the component
 * with realistic sample data during development. These props demonstrate
 * typical values and help validate email rendering without a full email pipeline.
 *
 * **lastUploadDate**: Set to approximately 7 days before current date to reflect
 * realistic inactivity timeline for this milestone.
 *
 * **Usage Context**: Development preview, Storybook stories, visual regression testing.
 */
NoInvoiceUploadsFor7DaysEmail.PreviewProps = {
  username: "Test User",
  lastUploadDate: "2025-12-17",
} satisfies Props;

export default NoInvoiceUploadsFor7DaysEmail;

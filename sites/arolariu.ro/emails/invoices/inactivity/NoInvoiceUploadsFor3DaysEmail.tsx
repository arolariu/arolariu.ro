/**
 * @fileoverview Inactivity nudge: 3 days without invoice uploads.
 * @module emails/invoices/inactivity/NoInvoiceUploadsFor3DaysEmail
 *
 * @remarks
 * This email template is the **first milestone** in a progressive engagement sequence
 * designed to re-activate users who have stopped uploading invoices.
 *
 * **Progressive Engagement Flow**:
 * - **Day 3** (this email): Light "check-in" with minimal pressure
 * - Day 7: Gentle reminder emphasizing benefits
 * - Day 14: Re-engagement focus with productivity tips
 * - Day 30: Direct assistance offer with support escalation
 *
 * **Triggering Conditions**:
 * - User has not uploaded any invoices in the past 3 days
 * - User has previously uploaded at least one invoice (not new users)
 * - User account is active (not suspended or deleted)
 *
 * **Rendering Context**: React Email Component (renders to HTML email via React Email).
 *
 * **Design Philosophy**: This 3-day variant uses a friendly, low-pressure tone.
 * The goal is to remind users of the platform's value without creating stress or guilt.
 * Messaging emphasizes convenience and quick action rather than urgency.
 *
 * **Implementation Pattern**: This is a thin wrapper around the base
 * {@link InvoiceUploadInactivityReminderEmail} component, which contains the actual
 * email structure and conditional logic. This pattern allows centralized updates to the
 * email template while maintaining type-safe milestone variants.
 *
 * @see {@link InvoiceUploadInactivityReminderEmail} - Base template with progressive logic
 * @see {@link NoInvoiceUploadsFor7DaysEmail} - Next milestone (7 days)
 * @see {@link https://react.email} - React Email documentation
 */

import {InvoiceUploadInactivityReminderEmail} from "./InvoiceUploadInactivityReminderEmail";

/**
 * Props for the 3-day inactivity email component.
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
 * Email component for 3-day invoice upload inactivity milestone.
 *
 * @remarks
 * **Engagement Stage**: First gentle nudge in progressive re-engagement sequence.
 *
 * **Tone**: Friendly and supportive, emphasizing convenience over urgency.
 *
 * **Content Characteristics**:
 * - Light "check-in" messaging without pressure
 * - Single primary CTA: "Upload New Invoice"
 * - Secondary CTA: "View All Invoices"
 * - Status timeline showing last upload date
 * - No warning banners or assistance sections (reserved for later milestones)
 *
 * **Rendering Context**: React Email Component (server-side rendered to HTML).
 *
 * **Email Delivery**: Typically triggered by background job checking user activity.
 * Email is rendered to HTML and sent via transactional email service (e.g., SendGrid).
 *
 * **Personalization**: Uses username for greeting and lastUploadDate for context.
 * CTAs can include campaign tracking parameters for analytics.
 *
 * **Design Pattern**: Wrapper component that delegates to base template with hardcoded
 * `daysWithoutUpload={3}` parameter. This ensures type safety and consistent milestone
 * definitions across the engagement flow.
 *
 * @param props - Email configuration with user details and CTA links
 * @returns React Email JSX element that renders to HTML email
 *
 * @example
 * ```tsx
 * // Usage in email sending service
 * import NoInvoiceUploadsFor3DaysEmail from './NoInvoiceUploadsFor3DaysEmail';
 * import { render } from '@react-email/render';
 *
 * const emailHtml = render(
 *   <NoInvoiceUploadsFor3DaysEmail
 *     username="John Doe"
 *     lastUploadDate="February 7, 2026"
 *     createInvoiceUrl="https://arolariu.ro/domains/invoices/create-invoice?utm_source=email&utm_campaign=3day_nudge"
 *     invoicesUrl="https://arolariu.ro/domains/invoices/view-invoices?utm_source=email"
 *   />
 * );
 * ```
 *
 * @example
 * ```tsx
 * // Preview in Storybook or development
 * <NoInvoiceUploadsFor3DaysEmail
 *   username="Test User"
 *   lastUploadDate="2026-02-07"
 * />
 * ```
 *
 * @see {@link InvoiceUploadInactivityReminderEmail} - Base template implementation
 * @see {@link NoInvoiceUploadsFor7DaysEmail} - Next milestone in sequence
 */
const NoInvoiceUploadsFor3DaysEmail = (props: Readonly<Props>) => {
  const {username, lastUploadDate, createInvoiceUrl, invoicesUrl} = props;

  return (
    <InvoiceUploadInactivityReminderEmail
      username={username}
      lastUploadDate={lastUploadDate}
      createInvoiceUrl={createInvoiceUrl}
      invoicesUrl={invoicesUrl}
      daysWithoutUpload={3}
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
 * **Usage Context**: Development preview, Storybook stories, visual regression testing.
 */
NoInvoiceUploadsFor3DaysEmail.PreviewProps = {
  username: "Test User",
  lastUploadDate: "2025-12-21",
} satisfies Props;

export default NoInvoiceUploadsFor3DaysEmail;

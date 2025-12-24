/**
 * @fileoverview Inactivity nudge: 14 days without invoice uploads.
 * @module emails/invoices/inactivity/NoInvoiceUploadsFor14DaysEmail
 */

import {InvoiceUploadInactivityReminderEmail, type InvoiceUploadInactivityReminderEmailProps} from "./InvoiceUploadInactivityReminderEmail";

type Props = Readonly<Omit<InvoiceUploadInactivityReminderEmailProps, "daysWithoutUpload">>;

const NoInvoiceUploadsFor14DaysEmail = (props: Readonly<Props>) => (
  <InvoiceUploadInactivityReminderEmail
    {...props}
    daysWithoutUpload={14}
  />
);

NoInvoiceUploadsFor14DaysEmail.PreviewProps = {
  username: "Test User",
  lastUploadDate: "2025-12-10",
} satisfies Props;

export default NoInvoiceUploadsFor14DaysEmail;

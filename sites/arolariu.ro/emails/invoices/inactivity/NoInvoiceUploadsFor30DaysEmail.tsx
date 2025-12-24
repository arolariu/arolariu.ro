/**
 * @fileoverview Inactivity nudge: 30 days without invoice uploads.
 * @module emails/invoices/inactivity/NoInvoiceUploadsFor30DaysEmail
 */

import {InvoiceUploadInactivityReminderEmail, type InvoiceUploadInactivityReminderEmailProps} from "./InvoiceUploadInactivityReminderEmail";

type Props = Readonly<Omit<InvoiceUploadInactivityReminderEmailProps, "daysWithoutUpload">>;

const NoInvoiceUploadsFor30DaysEmail = (props: Readonly<Props>) => (
  <InvoiceUploadInactivityReminderEmail
    {...props}
    daysWithoutUpload={30}
  />
);

NoInvoiceUploadsFor30DaysEmail.PreviewProps = {
  username: "Test User",
  lastUploadDate: "2025-11-23",
} satisfies Props;

export default NoInvoiceUploadsFor30DaysEmail;

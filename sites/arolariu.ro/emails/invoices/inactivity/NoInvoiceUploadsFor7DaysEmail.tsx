/**
 * @fileoverview Inactivity nudge: 7 days without invoice uploads.
 * @module emails/invoices/inactivity/NoInvoiceUploadsFor7DaysEmail
 */

import {InvoiceUploadInactivityReminderEmail, type InvoiceUploadInactivityReminderEmailProps} from "./InvoiceUploadInactivityReminderEmail";

type Props = Readonly<Omit<InvoiceUploadInactivityReminderEmailProps, "daysWithoutUpload">>;

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

NoInvoiceUploadsFor7DaysEmail.PreviewProps = {
  username: "Test User",
  lastUploadDate: "2025-12-17",
} satisfies Props;

export default NoInvoiceUploadsFor7DaysEmail;

/**
 * @fileoverview Inactivity nudge: 3 days without invoice uploads.
 * @module emails/invoices/inactivity/NoInvoiceUploadsFor3DaysEmail
 */

import {InvoiceUploadInactivityReminderEmail, type InvoiceUploadInactivityReminderEmailProps} from "./InvoiceUploadInactivityReminderEmail";

type Props = Readonly<Omit<InvoiceUploadInactivityReminderEmailProps, "daysWithoutUpload">>;

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

NoInvoiceUploadsFor3DaysEmail.PreviewProps = {
  username: "Test User",
  lastUploadDate: "2025-12-21",
} satisfies Props;

export default NoInvoiceUploadsFor3DaysEmail;

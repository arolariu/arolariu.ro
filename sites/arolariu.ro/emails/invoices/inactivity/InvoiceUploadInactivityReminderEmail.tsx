/**
 * @fileoverview Base email template for invoice upload inactivity nudges.
 * @module emails/invoices/inactivity/InvoiceUploadInactivityReminderEmail
 */

import {Link, Text} from "@react-email/components";

import {BRAND, EMAIL_COLORS} from "../../components/brand";
import {BulletList} from "../../components/BulletList";
import {EmailCard} from "../../components/EmailCard";
import {EmailLayout, EmailLinkStyles, EmailParagraphStyles} from "../../components/EmailLayout";
import {KeyValueTable} from "../../components/KeyValueTable";

export type InvoiceUploadInactivityReminderEmailProps = Readonly<{
  readonly username: string;
  readonly daysWithoutUpload: 3 | 7 | 14 | 30;
  readonly lastUploadDate?: string;
  readonly createInvoiceUrl?: string;
  readonly invoicesUrl?: string;
}>;

function headingFor(daysWithoutUpload: InvoiceUploadInactivityReminderEmailProps["daysWithoutUpload"]): string {
  switch (daysWithoutUpload) {
    case 3:
      return "Quick check-in";
    case 7:
      return "A gentle reminder";
    case 14:
      return "Let’s get you back on track";
    case 30:
      return "It’s been a while";
    default: {
      const exhaustive: never = daysWithoutUpload;
      return exhaustive;
    }
  }
}

function badgeFor(daysWithoutUpload: InvoiceUploadInactivityReminderEmailProps["daysWithoutUpload"]): string {
  switch (daysWithoutUpload) {
    case 3:
      return "Inactivity • 3 days";
    case 7:
      return "Inactivity • 7 days";
    case 14:
      return "Inactivity • 14 days";
    case 30:
      return "Inactivity • 30 days";
    default: {
      const exhaustive: never = daysWithoutUpload;
      return exhaustive;
    }
  }
}

function introFor(daysWithoutUpload: InvoiceUploadInactivityReminderEmailProps["daysWithoutUpload"]): string {
  switch (daysWithoutUpload) {
    case 3:
      return "We noticed you haven’t uploaded any invoices recently.";
    case 7:
      return "Looks like it’s been a week since your last invoice upload.";
    case 14:
      return "Two weeks without uploads — want a quick nudge to restart the habit?";
    case 30:
      return "It’s been about a month since your last upload — we can help you pick up where you left off.";
    default: {
      const exhaustive: never = daysWithoutUpload;
      return exhaustive;
    }
  }
}

export function InvoiceUploadInactivityReminderEmail(props: Readonly<InvoiceUploadInactivityReminderEmailProps>) {
  const {username, daysWithoutUpload, lastUploadDate, createInvoiceUrl, invoicesUrl} = props;

  const name = username?.trim() ? username : "there";
  const effectiveCreateInvoiceUrl = createInvoiceUrl ?? `${BRAND.url}/domains/invoices/create-invoice`;
  const effectiveInvoicesUrl = invoicesUrl ?? `${BRAND.url}/domains/invoices/view-invoices`;

  return (
    <EmailLayout
      title={`${BRAND.name} | Invoice inactivity`}
      preview={`Hi ${name} — ${daysWithoutUpload} days since your last upload.`}
      badge={badgeFor(daysWithoutUpload)}
      heading={headingFor(daysWithoutUpload)}
      primaryCta={{href: effectiveCreateInvoiceUrl, label: "Upload an invoice"}}
      secondaryCta={{href: effectiveInvoicesUrl, label: "View invoices"}}>
      <Text style={EmailParagraphStyles}>Hi {name},</Text>

      <Text style={EmailParagraphStyles}>{introFor(daysWithoutUpload)}</Text>

      <EmailCard title='Why it’s worth it'>
        <BulletList
          items={[
            "Keep your spending timeline accurate.",
            "Get cleaner totals by merchant and category.",
            "Find receipts faster when you need them.",
          ]}
        />
      </EmailCard>

      <EmailCard title='Status'>
        <KeyValueTable
          items={[
            {label: "Days without upload", value: String(daysWithoutUpload)},
            {label: "Last upload", value: lastUploadDate ?? "—"},
          ]}
        />
      </EmailCard>

      {daysWithoutUpload >= 14 ? (
        <EmailCard title='Tip (30 seconds)'>
          <Text style={{...EmailParagraphStyles, fontSize: "14px", margin: "0"}}>
            Upload one recent invoice today — small consistency beats big catch-up.
          </Text>
        </EmailCard>
      ) : null}

      {daysWithoutUpload >= 30 ? (
        <EmailCard title='Important'>
          <Text
            style={{
              ...EmailParagraphStyles,
              fontSize: "14px",
              margin: "0",
              backgroundColor: EMAIL_COLORS.warningBackground,
              border: `1px solid ${EMAIL_COLORS.warningInk}`,
              borderRadius: "10px",
              padding: "12px",
            }}>
            If you’re stuck or something isn’t working, reply to this email or contact support — we’ll help.
          </Text>
        </EmailCard>
      ) : null}

      <Text style={EmailParagraphStyles}>
        Need help or have questions? Email{" "}
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
}

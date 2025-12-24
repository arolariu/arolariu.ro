/**
 * @fileoverview Email template for notifying users that their access to a shared invoice was revoked.
 * @module emails/invoices/InvoiceHasBeenUnsharedWithEmail
 */

import {Link, Text} from "@react-email/components";

import {BRAND} from "../components/brand";
import {BulletList} from "../components/BulletList";
import {EmailCard} from "../components/EmailCard";
import {EmailLayout, EmailLinkStyles, EmailParagraphStyles} from "../components/EmailLayout";
import {KeyValueTable} from "../components/KeyValueTable";

type Props = Readonly<{
  /** The username of the person who revoked access. */
  readonly fromUsername: string;

  /** The username of the recipient who lost access. */
  readonly toUsername: string;

  /** The unique identifier of the invoice that was unshared. */
  readonly identifier: string;

  /** Optional timestamp (ISO or human-readable). */
  readonly revokedAt?: string;
}>;

const InvoiceHasBeenUnsharedWithEmail = (props: Readonly<Props>) => {
  const {fromUsername, toUsername, identifier, revokedAt} = props;

  const safeTo = toUsername?.trim() ? toUsername : "there";
  const safeFrom = fromUsername?.trim() ? fromUsername : "The owner";

  const invoicesUrl = `${BRAND.url}/domains/invoices/view-invoices`;

  return (
    <EmailLayout
      title={`${BRAND.name} | Access revoked`}
      preview={`${safeFrom} revoked your access to a shared invoice.`}
      badge='Invoices • Access Revoked'
      heading='Your access to an invoice was revoked'
      primaryCta={{href: invoicesUrl, label: "View your invoices"}}
      secondaryCta={{href: `mailto:${BRAND.supportEmail}`, label: "Contact support"}}>
      <Text style={EmailParagraphStyles}>Hi {safeTo},</Text>

      <Text style={EmailParagraphStyles}>
        We're writing to let you know that <strong>{safeFrom}</strong> has revoked your access to an invoice that was previously shared with
        you. This means you will no longer be able to view this invoice.
      </Text>

      <KeyValueTable
        title='Revocation Details'
        items={[
          {label: "Revoked by", value: safeFrom},
          {label: "Invoice ID", value: identifier},
          {label: "Revoked at", value: revokedAt ?? "—"},
          {label: "Your access", value: "Revoked"},
        ]}
      />

      <EmailCard title='What this means'>
        <BulletList
          items={[
            "Any bookmarked links to this invoice will no longer work for you.",
            "This invoice will not appear in your shared invoices list.",
            "If you need access again, contact the invoice owner directly.",
          ]}
        />
      </EmailCard>

      <Text style={EmailParagraphStyles}>
        If you believe this change was made in error, please reach out to <strong>{safeFrom}</strong> or contact our support team. Access
        revocations are sometimes accidental, and we're happy to help facilitate communication if needed.
      </Text>

      <Text style={EmailParagraphStyles}>
        Need assistance? Email us at{" "}
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

InvoiceHasBeenUnsharedWithEmail.PreviewProps = {
  fromUsername: "Alex Olariu",
  toUsername: "John Doe",
  identifier: "550e8400-e29b-41d4-a716-446655440000",
  revokedAt: "December 24, 2025",
} satisfies Props;

export default InvoiceHasBeenUnsharedWithEmail;

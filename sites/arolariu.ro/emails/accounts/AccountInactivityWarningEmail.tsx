/**
 * @fileoverview Account inactivity warning email.
 * @module emails/accounts/AccountInactivityWarningEmail
 */

import {Link, Text} from "@react-email/components";

import {BRAND, EMAIL_COLORS} from "../components/brand";
import {BulletList} from "../components/BulletList";
import {EmailCard} from "../components/EmailCard";
import {EmailLayout, EmailLinkStyles, EmailParagraphStyles} from "../components/EmailLayout";
import {KeyValueTable} from "../components/KeyValueTable";

type Props = Readonly<{
  readonly username: string;

  /** How many days the account has been inactive. */
  readonly inactiveDays: number;

  /** After how many more days the account may be closed (policy-driven). */
  readonly daysUntilClosure: number;

  /** Where the user should sign in to keep the account active. */
  readonly signInUrl?: string;
}>;

const AccountInactivityWarningEmail = (props: Readonly<Props>) => {
  const {username, inactiveDays, daysUntilClosure, signInUrl} = props;

  const name = username?.trim() ? username : "there";
  const effectiveSignInUrl = signInUrl ?? `${BRAND.url}/auth/sign-in`;

  return (
    <EmailLayout
      title={`${BRAND.name} | Account inactivity notice`}
      preview={`Hi ${name} — your account has been inactive for ${inactiveDays} days.`}
      badge='Account'
      heading='Account inactivity notice'
      primaryCta={{href: effectiveSignInUrl, label: "Sign in"}}
      secondaryCta={{href: `mailto:${BRAND.supportEmail}`, label: "Contact support"}}>
      <Text style={EmailParagraphStyles}>Hi {name},</Text>

      <Text style={EmailParagraphStyles}>
        This is a heads-up that your account has been inactive for <strong>{inactiveDays}</strong> days.
      </Text>

      <EmailCard title='What this means'>
        <BulletList
          items={[
            "Signing in will keep your account active.",
            `If there’s no activity for the next ${daysUntilClosure} days, the account may be scheduled for closure.`,
            "If you want to keep your data, please take action before the deadline.",
          ]}
        />
      </EmailCard>

      <EmailCard title='Timeline'>
        <KeyValueTable
          items={[
            {label: "Inactive for", value: `${inactiveDays} days`},
            {label: "Time remaining", value: `${daysUntilClosure} days`},
          ]}
        />
      </EmailCard>

      <Text style={EmailParagraphStyles}>
        If you believe you received this message in error, or you need assistance, please contact{" "}
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

      <Text
        style={{
          ...EmailParagraphStyles,
          marginTop: "16px",
          fontSize: "12px",
          lineHeight: "18px",
          color: EMAIL_COLORS.muted,
        }}>
        Note: This notice is informational and intended to help you avoid losing access. Actual account retention policies may vary by
        region and product.
      </Text>
    </EmailLayout>
  );
};

AccountInactivityWarningEmail.PreviewProps = {
  username: "Test User",
  inactiveDays: 30,
  daysUntilClosure: 60,
  signInUrl: `${BRAND.url}/auth/sign-in`,
} satisfies Props;

export default AccountInactivityWarningEmail;

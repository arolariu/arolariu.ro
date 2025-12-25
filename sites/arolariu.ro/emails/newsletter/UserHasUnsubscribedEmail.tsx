/**
 * @fileoverview Email template for confirming newsletter unsubscription.
 * @module emails/newsletter/Unsubscription
 */

import {Link, Text} from "@react-email/components";

import {BRAND} from "../components/brand";
import {BulletList} from "../components/BulletList";
import {EmailCard} from "../components/EmailCard";
import {EmailLayout, EmailLinkStyles, EmailParagraphStyles} from "../components/EmailLayout";

type Props = Readonly<{
  /** The username of the recipient */
  readonly username: string;

  /** Where to manage email preferences (optional). */
  readonly managePreferencesUrl?: string;

  /** Where to (re)subscribe (optional). */
  readonly resubscribeUrl?: string;
}>;

const UserHasUnsubscribedEmail = (props: Readonly<Props>) => {
  const {username, managePreferencesUrl, resubscribeUrl} = props;

  const name = username?.trim() ? username : "there";

  const effectiveManagePreferencesUrl = managePreferencesUrl ?? `${BRAND.url}/unsubscribe`;
  const effectiveResubscribeUrl = resubscribeUrl ?? BRAND.url;

  return (
    <EmailLayout
      title={`${BRAND.name} | Unsubscribed`}
      preview={`Hi ${name} — you’ve been unsubscribed.`}
      badge='Newsletter'
      heading='You’ve been unsubscribed'
      primaryCta={{href: effectiveManagePreferencesUrl, label: "Review preferences"}}
      secondaryCta={{href: effectiveResubscribeUrl, label: "Resubscribe"}}>
      <Text style={EmailParagraphStyles}>Hi {name},</Text>

      <Text style={EmailParagraphStyles}>
        This email confirms you’ve been removed from the <strong>{BRAND.name}</strong> newsletter list. I’m sorry to see you go.
      </Text>

      <EmailCard title='What happens next'>
        <BulletList
          items={[
            "You won't receive newsletter updates from us going forward.",
            "You may still receive essential account and service emails if you use the product.",
            "Changed your mind? You can resubscribe at any time using the button above.",
          ]}
        />
      </EmailCard>

      <Text style={EmailParagraphStyles}>
        I appreciate the time you spent with us. If you have feedback about why you left or how I can improve, I’d genuinely love to hear
        it—just reply to this email.
      </Text>

      <Text style={EmailParagraphStyles}>
        If you didn’t request this unsubscription, or you need help with anything, please contact{" "}
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

UserHasUnsubscribedEmail.PreviewProps = {
  username: "Test User",
  managePreferencesUrl: `${BRAND.url}/unsubscribe`,
  resubscribeUrl: BRAND.url,
} satisfies Props;

export default UserHasUnsubscribedEmail;

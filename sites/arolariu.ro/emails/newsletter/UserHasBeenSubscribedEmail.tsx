/**
 * @fileoverview Email template for confirming newsletter subscription.
 * @module emails/newsletter/Subscription
 *
 * @remarks
 * This template is sent to users when they subscribe to the arolariu.ro newsletter.
 * It provides information about the expected frequency and content of the emails.
 */

import {Link, Text} from "@react-email/components";

import {BRAND} from "../components/brand";
import {BulletList} from "../components/BulletList";
import {EmailCard} from "../components/EmailCard";
import {EmailLayout, EmailLinkStyles, EmailParagraphStyles} from "../components/EmailLayout";

/**
 * Properties for the UserHasBeenSubscribedEmail component.
 */
type Props = Readonly<{
  /** The username of the recipient */
  username: string;
}>;

/**
 * React component that renders the "Newsletter Subscription" email template.
 *
 * @remarks
 * **Rendering Context**: React Email.
 *
 * @param props - The subscription details.
 * @returns A rendered React Email template.
 */
const UserHasBeenSubscribedEmail = (props: Readonly<Props>) => {
  const {username} = props;

  const name = username?.trim() ? username : "there";

  return (
    <EmailLayout
      title={`${BRAND.name} | Newsletter subscription`}
      preview={`Welcome, ${name} — you’re subscribed.`}
      badge='Newsletter'
      heading='You’re in — welcome aboard'
      primaryCta={{href: BRAND.url, label: "Visit arolariu.ro"}}
      showUnsubscribe
      unsubscribeUrl={`${BRAND.url}/unsubscribe`}>
      <Text style={EmailParagraphStyles}>Hi {name},</Text>

      <Text style={EmailParagraphStyles}>
        Thanks for subscribing to the <strong>{BRAND.name}</strong> newsletter. I’m genuinely excited to have you here. I’ll keep
        communications lightweight, meaningful, and worth your time.
      </Text>

      <EmailCard title='What to expect'>
        <BulletList
          items={[
            "Product updates & new features as they launch",
            "New articles & write-ups about technology, productivity, and personal finance",
            "Occasional highlights and curated resources (1–2 emails per quarter)",
          ]}
        />
      </EmailCard>

      <Text style={EmailParagraphStyles}>
        Your inbox is sacred—I respect that. Every email is crafted to provide genuine value, whether it’s a tip that saves you hours or an
        insight that shifts your perspective on personal finance.
      </Text>

      <Text style={EmailParagraphStyles}>
        Questions, feedback, or just want to say hello? Reply to this email or reach me directly at{" "}
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

UserHasBeenSubscribedEmail.PreviewProps = {
  username: "Test User",
} satisfies Props;

export default UserHasBeenSubscribedEmail;

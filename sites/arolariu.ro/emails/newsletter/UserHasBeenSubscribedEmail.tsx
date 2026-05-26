import {selectorFromPath} from "next-intl-selector";
/**
 * @fileoverview Email template for confirming newsletter subscription.
 * @module emails/newsletter/Subscription
 *
 * @remarks
 * This template is sent to users when they subscribe to the arolariu.ro newsletter.
 * It provides information about the expected frequency and content of the emails.
 */

import {Link, Text} from "react-email";

import {BRAND, BulletList, EmailCard, EmailLayout, EmailLinkStyles, EmailParagraphStyles} from "../_components";
import {defineEmailTemplate} from "../_lib/defineEmailTemplate";

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
const UserHasBeenSubscribedEmail = defineEmailTemplate<Props>({
  namespace: "email.newsletterSubscribed",
  render: ({locale, t, props}) => {
    const {username} = props;

    const name = username?.trim() ? username : "there";

    return (
      <EmailLayout
        locale={locale}
        title={`${BRAND.name} | Newsletter subscription`}
        preview={t(selectorFromPath("emails.newsletterSubscribed.preview"), {name})}
        badge={t(selectorFromPath("emails.newsletterSubscribed.badge"))}
        heading={t(selectorFromPath("emails.newsletterSubscribed.heading"))}
        primaryCta={{href: BRAND.url, label: t(selectorFromPath("emails.newsletterSubscribed.ctaPrimary"))}}
        secondaryCta={null}
        showUnsubscribe={true}
        unsubscribeUrl={`${BRAND.url}/unsubscribe`}
        managePreferencesUrl=''>
        <Text style={EmailParagraphStyles}>{t(selectorFromPath("emails.newsletterSubscribed.greeting"), {name})}</Text>
        <Text style={EmailParagraphStyles}>
          {t.rich(selectorFromPath("emails.newsletterSubscribed.intro"), {
            brandName: BRAND.name,
            brand: (chunks) => <strong>{chunks}</strong>,
          })}
        </Text>
        <EmailCard title={t(selectorFromPath("emails.newsletterSubscribed.whatToExpectTitle"))}>
          <BulletList items={[t(selectorFromPath("emails.newsletterSubscribed.whatToExpect.item0")), t(selectorFromPath("emails.newsletterSubscribed.whatToExpect.item1")), t(selectorFromPath("emails.newsletterSubscribed.whatToExpect.item2"))]} />
        </EmailCard>
        <Text style={EmailParagraphStyles}>{t(selectorFromPath("emails.newsletterSubscribed.body"))}</Text>
        <Text style={EmailParagraphStyles}>
          {t.rich(selectorFromPath("emails.newsletterSubscribed.feedbackPrompt"), {
            email: () => (
              <Link
                href={`mailto:${BRAND.supportEmail}`}
                style={EmailLinkStyles}>
                {BRAND.supportEmail}
              </Link>
            ),
          })}
        </Text>
        <Text style={{...EmailParagraphStyles, margin: "0"}}>
          {t(selectorFromPath("emails.newsletterSubscribed.signOff.line1"))}
          <br />
          {t(selectorFromPath("emails.newsletterSubscribed.signOff.line2"), {brand: BRAND.name})}
        </Text>
      </EmailLayout>
    );
  },
});

UserHasBeenSubscribedEmail.PreviewProps = {
  username: "Test User",
  locale: "en",
};

export default UserHasBeenSubscribedEmail;

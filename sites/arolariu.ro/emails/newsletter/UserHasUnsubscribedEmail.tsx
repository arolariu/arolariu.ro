import {selectorFromPath} from "next-intl-selector";
/**
 * @fileoverview Email template for confirming newsletter unsubscription.
 * @module emails/newsletter/Unsubscription
 */

import {Link, Text} from "react-email";

import {BRAND, BulletList, EmailCard, EmailLayout, EmailLinkStyles, EmailParagraphStyles} from "../_components";
import {defineEmailTemplate} from "../_lib/defineEmailTemplate";

type Props = {
  /** The username of the recipient */
  readonly username: string;

  /** Where to manage email preferences (optional). */
  readonly managePreferencesUrl?: string;

  /** Where to (re)subscribe (optional). */
  readonly resubscribeUrl?: string;
};

const UserHasUnsubscribedEmail = defineEmailTemplate<Props>({
  namespace: "email.newsletterUnsubscribed",
  render: ({locale, t, props}) => {
    const {username, managePreferencesUrl, resubscribeUrl} = props;

    const name = username?.trim() ? username : "there";

    const effectiveManagePreferencesUrl = managePreferencesUrl ?? `${BRAND.url}/unsubscribe`;
    const effectiveResubscribeUrl = resubscribeUrl ?? BRAND.url;

    return (
      <EmailLayout
        locale={locale}
        title={`${BRAND.name} | Unsubscribed`}
        preview={t(selectorFromPath("emails.newsletterUnsubscribed.preview"), {name})}
        badge={t(selectorFromPath("emails.newsletterUnsubscribed.badge"))}
        heading={t(selectorFromPath("emails.newsletterUnsubscribed.heading"))}
        primaryCta={{href: effectiveManagePreferencesUrl, label: t(selectorFromPath("emails.newsletterUnsubscribed.ctaPrimary"))}}
        secondaryCta={{href: effectiveResubscribeUrl, label: t(selectorFromPath("emails.newsletterUnsubscribed.ctaSecondary"))}}
        showUnsubscribe={false}
        unsubscribeUrl=''
        managePreferencesUrl=''>
        <Text style={EmailParagraphStyles}>{t(selectorFromPath("emails.newsletterUnsubscribed.greeting"), {name})}</Text>
        <Text style={EmailParagraphStyles}>
          {t.rich(selectorFromPath("emails.newsletterUnsubscribed.intro"), {
            brandName: BRAND.name,
            brand: (chunks) => <strong>{chunks}</strong>,
          })}
        </Text>
        <EmailCard title={t(selectorFromPath("emails.newsletterUnsubscribed.whatHappensNextTitle"))}>
          <BulletList items={[t(selectorFromPath("emails.newsletterUnsubscribed.whatHappensNext.item0")), t(selectorFromPath("emails.newsletterUnsubscribed.whatHappensNext.item1")), t(selectorFromPath("emails.newsletterUnsubscribed.whatHappensNext.item2"))]} />
        </EmailCard>
        <Text style={EmailParagraphStyles}>{t(selectorFromPath("emails.newsletterUnsubscribed.body"))}</Text>
        <Text style={EmailParagraphStyles}>
          {t.rich(selectorFromPath("emails.newsletterUnsubscribed.feedbackPrompt"), {
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
          {t(selectorFromPath("emails.newsletterUnsubscribed.signOff.line1"))}
          <br />
          {t(selectorFromPath("emails.newsletterUnsubscribed.signOff.line2"), {brand: BRAND.name})}
        </Text>
      </EmailLayout>
    );
  },
});

UserHasUnsubscribedEmail.PreviewProps = {
  username: "Test User",
  managePreferencesUrl: `${BRAND.url}/unsubscribe`,
  resubscribeUrl: BRAND.url,
  locale: "en",
};

export default UserHasUnsubscribedEmail;

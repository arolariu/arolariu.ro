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
        preview={t("preview", {name})}
        badge={t("badge")}
        heading={t("heading")}
        primaryCta={{href: effectiveManagePreferencesUrl, label: t("ctaPrimary")}}
        secondaryCta={{href: effectiveResubscribeUrl, label: t("ctaSecondary")}}
        showUnsubscribe={false}
        unsubscribeUrl=''
        managePreferencesUrl=''>
        {" "}
        <Text style={EmailParagraphStyles}>{t("greeting", {name})}</Text>
        <Text style={EmailParagraphStyles}>
          {t.rich("intro", {
            brandName: BRAND.name,
            brand: (chunks) => <strong>{chunks}</strong>,
          })}
        </Text>
        <EmailCard title={t("whatHappensNextTitle")}>
          <BulletList items={[t("whatHappensNext.0"), t("whatHappensNext.1"), t("whatHappensNext.2")]} />
        </EmailCard>
        <Text style={EmailParagraphStyles}>{t("body")}</Text>
        <Text style={EmailParagraphStyles}>
          {t.rich("feedbackPrompt", {
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
          {t("signOff.line1")}
          <br />
          {t("signOff.line2", {brand: BRAND.name})}
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

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
import type {EmailLocale} from "../_i18n";
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
        preview={t("preview", {name})}
        badge={t("badge")}
        heading={t("heading")}
        primaryCta={{href: BRAND.url, label: t("ctaPrimary")}}
        showUnsubscribe
        unsubscribeUrl={`${BRAND.url}/unsubscribe`}>
        <Text style={EmailParagraphStyles}>{t("greeting", {name})}</Text>

        <Text style={EmailParagraphStyles}>
          {t.rich("intro", {
            brandName: BRAND.name,
            brand: (chunks) => <strong>{chunks}</strong>,
          })}
        </Text>

        <EmailCard title={t("whatToExpectTitle")}>
          <BulletList items={[t("whatToExpect.0"), t("whatToExpect.1"), t("whatToExpect.2")]} />
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

(UserHasBeenSubscribedEmail as unknown as {PreviewProps: Props & {locale: EmailLocale}}).PreviewProps = {
  username: "Test User",
  locale: "en",
};

export default UserHasBeenSubscribedEmail;

/**
 * @fileoverview Email template for confirming newsletter subscription.
 * @module emails/newsletter/Subscription
 *
 * @remarks
 * This template is sent to users when they subscribe to the arolariu.ro newsletter.
 * It provides information about the expected frequency and content of the emails.
 */

import {createTranslator} from "next-intl";
import {Link, Text} from "react-email";

import {BRAND, BulletList, EmailCard, EmailLayout, EmailLinkStyles, EmailParagraphStyles} from "../_components";
import {DEFAULT_LOCALE, type EmailLocale, loadMessages} from "../_i18n";

/**
 * Properties for the UserHasBeenSubscribedEmail component.
 */
type Props = Readonly<{
  /** The username of the recipient */
  username: string;
  /** Email locale for translations. */
  locale?: EmailLocale;
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
const UserHasBeenSubscribedEmail = async (props: Readonly<Props>) => {
  const locale: EmailLocale = props.locale ?? DEFAULT_LOCALE;
  const messages = await loadMessages(locale);
  const t = createTranslator({locale, messages, namespace: "email.newsletterSubscribed"});

  const {username} = props;

  const name = username?.trim() ? username : "there";

  return (
    <EmailLayout
      locale={locale}
      title={${BRAND.name} | Newsletter subscription}
      preview={t("preview", {name})}
      badge={t("badge")}
      heading={t("heading")}
      primaryCta={{href: BRAND.url, label: t("ctaPrimary")}}
      showUnsubscribe
      unsubscribeUrl={${BRAND.url}/unsubscribe}>
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
            <Link href={mailto:} style={EmailLinkStyles}>
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
};

UserHasBeenSubscribedEmail.PreviewProps = {
  username: "Test User",
  locale: "en",
} satisfies Props;

export default UserHasBeenSubscribedEmail;
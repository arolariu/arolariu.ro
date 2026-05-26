import {selectorFromPath} from "next-intl-selector";
/**
 * @fileoverview Welcome email sent to new users upon first sign-up.
 * @module emails/accounts/WelcomeEmail
 */

import {Link, Text} from "react-email";

import {BRAND, BulletList, EmailCard, EmailLayout, EmailLinkStyles, EmailParagraphStyles} from "../_components";
import {defineEmailTemplate} from "../_lib/defineEmailTemplate";

type Props = {
  readonly username: string;
  readonly uploadUrl?: string;
  readonly dashboardUrl?: string;
};

const WelcomeEmail = defineEmailTemplate<Props>({
  namespace: "emails.welcome",
  render: ({locale, t, props}) => {
    const name = props.username?.trim() || "there";
    const uploadUrl = props.uploadUrl ?? `${BRAND.url}/domains/invoices/upload-scans`;
    const dashboardUrl = props.dashboardUrl ?? `${BRAND.url}/domains/invoices/view-invoices`;

    return (
      <EmailLayout
        locale={locale}
        title={`${BRAND.name} | ${t(selectorFromPath("emails.welcome.badge"))}`}
        preview={t(selectorFromPath("emails.welcome.preview"), {brand: BRAND.name, name})}
        badge={t(selectorFromPath("emails.welcome.badge"))}
        heading={t(selectorFromPath("emails.welcome.heading"), {brand: BRAND.name})}
        primaryCta={{href: uploadUrl, label: t(selectorFromPath("emails.welcome.ctaPrimary"))}}
        secondaryCta={{href: dashboardUrl, label: t(selectorFromPath("emails.welcome.ctaSecondary"))}}
        showUnsubscribe={false}
        unsubscribeUrl=''
        managePreferencesUrl=''>
        <Text style={EmailParagraphStyles}>{t(selectorFromPath("emails.welcome.greeting"), {name})}</Text>
        <Text style={EmailParagraphStyles}>{t(selectorFromPath("emails.welcome.intro"), {brand: BRAND.name})}</Text>
        <EmailCard title={t(selectorFromPath("emails.welcome.howItWorksTitle"))}>
          <BulletList items={[t(selectorFromPath("emails.welcome.howItWorks.item0")), t(selectorFromPath("emails.welcome.howItWorks.item1")), t(selectorFromPath("emails.welcome.howItWorks.item2"))]} />
        </EmailCard>
        <EmailCard title={t(selectorFromPath("emails.welcome.whatYouCanDoTitle"))}>
          <BulletList items={[t(selectorFromPath("emails.welcome.whatYouCanDo.item0")), t(selectorFromPath("emails.welcome.whatYouCanDo.item1")), t(selectorFromPath("emails.welcome.whatYouCanDo.item2")), t(selectorFromPath("emails.welcome.whatYouCanDo.item3"))]} />
        </EmailCard>
        <Text style={EmailParagraphStyles}>{t(selectorFromPath("emails.welcome.body"))}</Text>
        <Text style={EmailParagraphStyles}>
          {t.rich(selectorFromPath("emails.welcome.feedbackPrompt"), {
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
          {t(selectorFromPath("emails.welcome.signOff.line1"))}
          <br />
          {t(selectorFromPath("emails.welcome.signOff.line2"), {brand: BRAND.name})}
        </Text>
      </EmailLayout>
    );
  },
});

WelcomeEmail.PreviewProps = {
  username: "Test User",
  locale: "en",
};

export default WelcomeEmail;

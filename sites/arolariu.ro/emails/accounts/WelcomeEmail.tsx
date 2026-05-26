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
  namespace: "email.welcome",
  render: ({locale, t, props}) => {
    const name = props.username?.trim() || "there";
    const uploadUrl = props.uploadUrl ?? `${BRAND.url}/domains/invoices/upload-scans`;
    const dashboardUrl = props.dashboardUrl ?? `${BRAND.url}/domains/invoices/view-invoices`;

    return (
      <EmailLayout
        locale={locale}
        title={`${BRAND.name} | ${t(selectorFromPath("email.welcome.badge"))}`}
        preview={t(selectorFromPath("email.welcome.preview"), {brand: BRAND.name, name})}
        badge={t(selectorFromPath("email.welcome.badge"))}
        heading={t(selectorFromPath("email.welcome.heading"), {brand: BRAND.name})}
        primaryCta={{href: uploadUrl, label: t(selectorFromPath("email.welcome.ctaPrimary"))}}
        secondaryCta={{href: dashboardUrl, label: t(selectorFromPath("email.welcome.ctaSecondary"))}}
        showUnsubscribe={false}
        unsubscribeUrl=''
        managePreferencesUrl=''>
        <Text style={EmailParagraphStyles}>{t(selectorFromPath("email.welcome.greeting"), {name})}</Text>
        <Text style={EmailParagraphStyles}>{t(selectorFromPath("email.welcome.intro"), {brand: BRAND.name})}</Text>
        <EmailCard title={t(selectorFromPath("email.welcome.howItWorksTitle"))}>
          <BulletList items={[t(selectorFromPath("email.welcome.howItWorks.0")), t(selectorFromPath("email.welcome.howItWorks.1")), t(selectorFromPath("email.welcome.howItWorks.2"))]} />
        </EmailCard>
        <EmailCard title={t(selectorFromPath("email.welcome.whatYouCanDoTitle"))}>
          <BulletList items={[t(selectorFromPath("email.welcome.whatYouCanDo.0")), t(selectorFromPath("email.welcome.whatYouCanDo.1")), t(selectorFromPath("email.welcome.whatYouCanDo.2")), t(selectorFromPath("email.welcome.whatYouCanDo.3"))]} />
        </EmailCard>
        <Text style={EmailParagraphStyles}>{t(selectorFromPath("email.welcome.body"))}</Text>
        <Text style={EmailParagraphStyles}>
          {t.rich(selectorFromPath("email.welcome.feedbackPrompt"), {
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
          {t(selectorFromPath("email.welcome.signOff.line1"))}
          <br />
          {t(selectorFromPath("email.welcome.signOff.line2"), {brand: BRAND.name})}
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

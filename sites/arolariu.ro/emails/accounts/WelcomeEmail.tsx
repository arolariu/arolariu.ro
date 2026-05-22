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
        title={`${BRAND.name} | ${t("badge")}`}
        preview={t("preview", {brand: BRAND.name, name})}
        badge={t("badge")}
        heading={t("heading", {brand: BRAND.name})}
        primaryCta={{href: uploadUrl, label: t("ctaPrimary")}}
        secondaryCta={{href: dashboardUrl, label: t("ctaSecondary")}}
        showUnsubscribe={false}
        unsubscribeUrl=''
        managePreferencesUrl=''>
        {" "}
        <Text style={EmailParagraphStyles}>{t("greeting", {name})}</Text>
        <Text style={EmailParagraphStyles}>{t("intro", {brand: BRAND.name})}</Text>
        <EmailCard title={t("howItWorksTitle")}>
          <BulletList items={[t("howItWorks.0"), t("howItWorks.1"), t("howItWorks.2")]} />
        </EmailCard>
        <EmailCard title={t("whatYouCanDoTitle")}>
          <BulletList items={[t("whatYouCanDo.0"), t("whatYouCanDo.1"), t("whatYouCanDo.2"), t("whatYouCanDo.3")]} />
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

WelcomeEmail.PreviewProps = {
  username: "Test User",
  locale: "en",
};

export default WelcomeEmail;

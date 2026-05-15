/**
 * @fileoverview Shared layout wrapper for all React Email templates.
 * @module emails/components/EmailLayout
 */

import {createTranslator} from "next-intl";
import type {ReactNode} from "react";
import {Body, Container, Head, Hr, Html, Img, Link, Preview, Section, Text} from "react-email";

import {type EmailLocale, loadMessages} from "../_i18n";
import {BRAND, EMAIL_COLORS, EMAIL_TYPOGRAPHY} from "./brand";

type Cta = Readonly<{
  readonly href: string;
  readonly label: string;
}>;

type Props = Readonly<{
  readonly locale: EmailLocale;
  readonly title: string;
  readonly preview: string;
  readonly heading: string;
  readonly badge?: string;
  readonly primaryCta?: Cta;
  readonly secondaryCta?: Cta;
  readonly showUnsubscribe?: boolean;
  readonly unsubscribeUrl?: string;
  readonly managePreferencesUrl?: string;
  readonly children: ReactNode;
}>;

const styles = {
  body: {backgroundColor: EMAIL_COLORS.background, margin: "0", padding: "32px 0", fontFamily: EMAIL_TYPOGRAPHY.fontFamily},
  container: {backgroundColor: EMAIL_COLORS.cardBackground, border: `1px solid ${EMAIL_COLORS.border}`, borderRadius: "10px", overflow: "hidden", width: "600px"},
  headerBar: {backgroundColor: EMAIL_COLORS.brandBlue, padding: "18px 24px", textAlign: "center" as const},
  logo: {display: "block", margin: "0 auto", width: "140px", height: "auto", maxWidth: "100%"},
  headerTagline: {color: "rgba(255,255,255,0.92)", fontSize: "12px", lineHeight: "18px", margin: "10px 0 0"},
  content: {padding: "28px 32px"},
  badge: {display: "inline-block", border: `1px solid ${EMAIL_COLORS.border}`, borderRadius: "999px", padding: "6px 10px", fontSize: "12px", lineHeight: "12px", color: EMAIL_COLORS.muted, backgroundColor: EMAIL_COLORS.background, margin: "0 0 12px"},
  heading: {margin: "0 0 14px", fontSize: "24px", lineHeight: "30px", fontWeight: "700", color: EMAIL_COLORS.ink},
  paragraph: {margin: "0 0 14px", fontSize: "16px", lineHeight: "24px", color: EMAIL_COLORS.ink},
  ctaWrap: {textAlign: "center" as const, padding: "8px 0 4px"},
  button: {display: "inline-block", backgroundColor: EMAIL_COLORS.brandPurple, color: "#ffffff", textDecoration: "none", borderRadius: "10px", padding: "12px 18px", fontSize: "16px", lineHeight: "20px", fontWeight: "700"},
  fallbackLinkText: {margin: "12px 0 0", fontSize: "12px", lineHeight: "18px", color: EMAIL_COLORS.muted},
  link: {color: EMAIL_COLORS.brandPurple, textDecoration: "none"},
  hr: {borderColor: EMAIL_COLORS.border, margin: "0"},
  footer: {padding: "18px 32px 22px", textAlign: "center" as const},
  footerText: {margin: "0 0 8px", fontSize: "12px", lineHeight: "18px", color: EMAIL_COLORS.muted},
  footerFinePrint: {margin: "0", fontSize: "11px", lineHeight: "16px", color: EMAIL_COLORS.muted},
} as const;

export async function EmailLayout(props: Props) {
  const {locale, title, preview, heading, badge, primaryCta, secondaryCta, showUnsubscribe = false, unsubscribeUrl, managePreferencesUrl, children} = props;

  const messages = await loadMessages(locale);
  const tLayout = createTranslator({locale, messages, namespace: "email.layout"});

  return (
    <Html lang={locale} dir='ltr'>
      <Head>
        <title>{title}</title>
        <meta name='x-apple-disable-message-reformatting' content='true' />
        <meta name='format-detection' content='telephone=no,address=no,email=no,date=no,url=no' />
      </Head>
      <Preview>{preview}</Preview>

      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.headerBar}>
            <Img src={BRAND.logoUrl} alt={BRAND.name} style={styles.logo} />
            <Text style={styles.headerTagline}>{tLayout("tagline")}</Text>
          </Section>

          <Section style={styles.content}>
            {badge ? <Text style={styles.badge}>{badge}</Text> : null}
            <Text style={styles.heading}>{heading}</Text>
            {children}

            {primaryCta ? (
              <Section style={styles.ctaWrap}>
                <Link href={primaryCta.href} style={styles.button}>
                  {primaryCta.label}
                </Link>
                <Text style={styles.fallbackLinkText}>
                  {tLayout("buttonFallback")}{" "}
                  <Link href={primaryCta.href} style={styles.link}>
                    {primaryCta.href}
                  </Link>
                </Text>
              </Section>
            ) : null}

            {secondaryCta ? (
              <Text style={styles.fallbackLinkText}>
                {tLayout("secondaryFallback")}{" "}
                <Link href={secondaryCta.href} style={styles.link}>
                  {secondaryCta.label}
                </Link>
              </Text>
            ) : null}
          </Section>

          <Hr style={styles.hr} />

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              <Link href={BRAND.url} style={styles.link}>{BRAND.name}</Link>
            </Text>
            <Text style={styles.footerText}>
              {BRAND.location} •{" "}
              <Link href={`mailto:${BRAND.supportEmail}`} style={styles.link}>{BRAND.supportEmail}</Link>
            </Text>

            {managePreferencesUrl ? (
              <Text style={styles.footerText}>
                <Link href={managePreferencesUrl} style={styles.link}>{tLayout("managePreferences")}</Link>
              </Text>
            ) : null}

            {showUnsubscribe && unsubscribeUrl ? (
              <Text style={styles.footerText}>
                <Link href={unsubscribeUrl} style={styles.link}>{tLayout("unsubscribe")}</Link>
              </Text>
            ) : null}

            <Text style={styles.footerFinePrint}>
              {tLayout("allRightsReserved", {year: new Date().getFullYear(), brand: BRAND.name})}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export const EmailParagraphStyles = styles.paragraph;
export const EmailLinkStyles = styles.link;
export const EmailHrStyles = styles.hr;

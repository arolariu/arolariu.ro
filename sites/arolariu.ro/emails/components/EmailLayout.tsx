/**
 * @fileoverview Shared layout wrapper for all React Email templates.
 * @module emails/components/EmailLayout
 */

import {Body, Container, Head, Hr, Html, Img, Link, Preview, Section, Text} from "@react-email/components";
import type {ReactNode} from "react";

import {BRAND, EMAIL_COLORS, EMAIL_TYPOGRAPHY} from "./brand";

type Cta = Readonly<{
  readonly href: string;
  readonly label: string;
}>;

type Props = Readonly<{
  /** HTML document title (shown by some clients). */
  readonly title: string;

  /** Preheader text (preview line in inbox list). */
  readonly preview: string;

  /** Main email headline. */
  readonly heading: string;

  /** Small “pill” label above the heading. */
  readonly badge?: string;

  /** Primary call-to-action. */
  readonly primaryCta?: Cta;

  /** Optional secondary action (displayed as a simple link). */
  readonly secondaryCta?: Cta;

  /** Whether to show an unsubscribe link in footer. */
  readonly showUnsubscribe?: boolean;

  /** URL used by the unsubscribe link (only if showUnsubscribe is true). */
  readonly unsubscribeUrl?: string;

  /** Optional “manage preferences” link shown in the footer. */
  readonly managePreferencesUrl?: string;

  /** Main body content (paragraphs, cards, etc.). */
  readonly children: ReactNode;
}>;

const styles = {
  body: {
    backgroundColor: EMAIL_COLORS.background,
    margin: "0",
    padding: "32px 0",
    fontFamily: EMAIL_TYPOGRAPHY.fontFamily,
  },
  container: {
    backgroundColor: EMAIL_COLORS.cardBackground,
    border: `1px solid ${EMAIL_COLORS.border}`,
    borderRadius: "10px",
    overflow: "hidden",
    width: "600px",
  },
  headerBar: {
    backgroundColor: EMAIL_COLORS.brandBlue,
    padding: "18px 24px",
    textAlign: "center" as const,
  },
  logo: {
    display: "block",
    margin: "0 auto",
    width: "140px",
    height: "auto",
    maxWidth: "100%",
  },
  headerTagline: {
    color: "rgba(255,255,255,0.92)",
    fontSize: "12px",
    lineHeight: "18px",
    margin: "10px 0 0",
  },
  content: {
    padding: "28px 32px",
  },
  badge: {
    display: "inline-block",
    border: `1px solid ${EMAIL_COLORS.border}`,
    borderRadius: "999px",
    padding: "6px 10px",
    fontSize: "12px",
    lineHeight: "12px",
    color: EMAIL_COLORS.muted,
    backgroundColor: EMAIL_COLORS.background,
    margin: "0 0 12px",
  },
  heading: {
    margin: "0 0 14px",
    fontSize: "24px",
    lineHeight: "30px",
    fontWeight: "700",
    color: EMAIL_COLORS.ink,
  },
  paragraph: {
    margin: "0 0 14px",
    fontSize: "16px",
    lineHeight: "24px",
    color: EMAIL_COLORS.ink,
  },
  ctaWrap: {
    textAlign: "center" as const,
    padding: "8px 0 4px",
  },
  button: {
    display: "inline-block",
    backgroundColor: EMAIL_COLORS.brandPurple,
    color: "#ffffff",
    textDecoration: "none",
    borderRadius: "10px",
    padding: "12px 18px",
    fontSize: "16px",
    lineHeight: "20px",
    fontWeight: "700",
  },
  fallbackLinkText: {
    margin: "12px 0 0",
    fontSize: "12px",
    lineHeight: "18px",
    color: EMAIL_COLORS.muted,
  },
  link: {
    color: EMAIL_COLORS.brandPurple,
    textDecoration: "none",
  },
  hr: {
    borderColor: EMAIL_COLORS.border,
    margin: "0",
  },
  footer: {
    padding: "18px 32px 22px",
    textAlign: "center" as const,
  },
  footerText: {
    margin: "0 0 8px",
    fontSize: "12px",
    lineHeight: "18px",
    color: EMAIL_COLORS.muted,
  },
  footerFinePrint: {
    margin: "0",
    fontSize: "11px",
    lineHeight: "16px",
    color: EMAIL_COLORS.muted,
  },
} as const;

export function EmailLayout(props: Props) {
  const {
    title,
    preview,
    heading,
    badge,
    primaryCta,
    secondaryCta,
    showUnsubscribe = false,
    unsubscribeUrl,
    managePreferencesUrl,
    children,
  } = props;

  return (
    <Html
      lang='en'
      dir='ltr'>
      <Head>
        <title>{title}</title>
        <meta
          name='x-apple-disable-message-reformatting'
          content='true'
        />
        <meta
          name='format-detection'
          content='telephone=no,address=no,email=no,date=no,url=no'
        />
      </Head>
      <Preview>{preview}</Preview>

      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.headerBar}>
            <Img
              src={BRAND.logoUrl}
              alt={BRAND.name}
              style={styles.logo}
            />
            <Text style={styles.headerTagline}>Practical tools. Clean insights. Built for everyday spending.</Text>
          </Section>

          <Section style={styles.content}>
            {badge ? <Text style={styles.badge}>{badge}</Text> : null}
            <Text style={styles.heading}>{heading}</Text>
            {children}

            {primaryCta ? (
              <Section style={styles.ctaWrap}>
                <Link
                  href={primaryCta.href}
                  style={styles.button}>
                  {primaryCta.label}
                </Link>
                <Text style={styles.fallbackLinkText}>
                  If the button doesn’t work, open this link:{" "}
                  <Link
                    href={primaryCta.href}
                    style={styles.link}>
                    {primaryCta.href}
                  </Link>
                </Text>
              </Section>
            ) : null}

            {secondaryCta ? (
              <Text style={styles.fallbackLinkText}>
                Or:{" "}
                <Link
                  href={secondaryCta.href}
                  style={styles.link}>
                  {secondaryCta.label}
                </Link>
              </Text>
            ) : null}
          </Section>

          <Hr style={styles.hr} />

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              <Link
                href={BRAND.url}
                style={styles.link}>
                {BRAND.name}
              </Link>
            </Text>
            <Text style={styles.footerText}>
              {BRAND.location} • Support:{" "}
              <Link
                href={`mailto:${BRAND.supportEmail}`}
                style={styles.link}>
                {BRAND.supportEmail}
              </Link>
            </Text>

            {managePreferencesUrl ? (
              <Text style={styles.footerText}>
                <Link
                  href={managePreferencesUrl}
                  style={styles.link}>
                  Manage email preferences
                </Link>
              </Text>
            ) : null}

            {showUnsubscribe && unsubscribeUrl ? (
              <Text style={styles.footerText}>
                <Link
                  href={unsubscribeUrl}
                  style={styles.link}>
                  Unsubscribe
                </Link>
              </Text>
            ) : null}

            <Text style={styles.footerFinePrint}>
              © 2022-{new Date().getFullYear()} {BRAND.name}. All rights reserved.
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

"use client";

import {Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle} from "@arolariu/components";
import {useTranslations} from "next-intl";
import Image from "next/image";
import Link from "next/link";
import {TbArrowRight, TbLock, TbShield, TbUserPlus} from "react-icons/tb";
import AuthTrustBadgesRow from "./_components/AuthTrustBadgesRow";
import styles from "./styles.module.scss";

type AuthCardKey = "signUp" | "signIn";

const gradientClassMap = {
  emerald: "gradientEmerald",
  violet: "gradientViolet",
} as const;

type AuthCard = Readonly<{
  key: AuthCardKey;
  href: string;
  imageSrc: string;
  illustrationAlt: string;
  title: string;
  description: string;
  bullets: Readonly<[string, string, string]>;
  cta: string;
  secondaryPrompt: string;
  secondaryAction: string;
  secondaryHref: string;
  icon: React.ComponentType<{className?: string}>;
  gradientKey: keyof typeof gradientClassMap;
}>;

/**
 * Enhanced client-side authentication screen with immersive animations.
 *
 * @remarks
 * **Rendering Context**: Client Component with interactive elements.
 *
 * **Design Features**:
 * - Staggered entrance animations with spring physics
 * - Gradient text effects and floating illustrations
 * - Interactive card hover states with glow effects
 * - Responsive grid layout with visual hierarchy
 * - Icon integration for quick visual recognition
 *
 * **Accessibility**:
 * - Semantic HTML structure with proper headings
 * - ARIA labels for interactive elements
 * - Keyboard navigation support
 * - High contrast text on all backgrounds
 * - Respects prefers-reduced-motion
 *
 * @returns The enhanced authentication screen component
 *
 * @example
 * ```tsx
 * <RenderAuthScreen />
 * ```
 */
export default function RenderAuthScreen(): React.JSX.Element {
  const t = useTranslations("Authentication.Island");

  const trustBadges: Readonly<[string, string, string]> = [t("trust.oauth"), t("trust.session"), t("trust.privacy")];

  const cards: ReadonlyArray<AuthCard> = [
    {
      key: "signUp",
      href: "/auth/sign-up/",
      imageSrc: "/images/auth/sign-up.svg",
      illustrationAlt: t("signUp.illustrationAlt"),
      title: t("signUp.title"),
      description: t("signUp.description"),
      bullets: [t("signUp.bullets.first"), t("signUp.bullets.second"), t("signUp.bullets.third")],
      cta: t("signUp.cta"),
      secondaryPrompt: t("signUp.secondaryPrompt"),
      secondaryAction: t("signUp.secondaryAction"),
      secondaryHref: "/auth/sign-in/",
      icon: TbUserPlus,
      gradientKey: "emerald",
    },
    {
      key: "signIn",
      href: "/auth/sign-in/",
      imageSrc: "/images/auth/sign-in.svg",
      illustrationAlt: t("signIn.illustrationAlt"),
      title: t("signIn.title"),
      description: t("signIn.description"),
      bullets: [t("signIn.bullets.first"), t("signIn.bullets.second"), t("signIn.bullets.third")],
      cta: t("signIn.cta"),
      secondaryPrompt: t("signIn.secondaryPrompt"),
      secondaryAction: t("signIn.secondaryAction"),
      secondaryHref: "/auth/sign-up/",
      icon: TbLock,
      gradientKey: "violet",
    },
  ];

  return (
    <section className={styles["section"]}>
      <div className={styles["container"]}>
        <div className={styles["heroSection"]}>
          <div className={styles["heroInner"]}>
            <Badge
              variant='secondary'
              className={styles["heroBadge"]}>
              <TbShield className={styles["heroBadgeIcon"]} />
              OAuth 2.0
            </Badge>

            <h1 className={styles["heroTitle"]}>{t("hero.title")}</h1>

            <p className={styles["heroSubtitle"]}>{t("hero.subtitle")}</p>
          </div>

          <div className={styles["trustBadgesCenter"]}>
            <AuthTrustBadgesRow badges={trustBadges} />
          </div>
        </div>

        <div className={styles["cardsGrid"]}>
          {cards.map((card, index) => (
            <div
              key={card.key}
              className={styles["cardWrapper"]}>
              <Card className={styles["card"]}>
                {/* Gradient overlay */}
                <div
                  className={`${styles["cardGradient"]} ${styles[gradientClassMap[card.gradientKey]]}`}
                  aria-hidden='true'
                />

                {/* Corner glow */}
                <div
                  aria-hidden='true'
                  className={styles["cardGlow"]}
                />

                <CardHeader className={styles["cardHeader"]}>
                  {/* Icon badge */}
                  <div className={styles["cardHeaderTop"]}>
                    <div className={styles["cardIconWrapper"]}>
                      <card.icon className={styles["cardIcon"]} />
                    </div>
                    <div className={styles["cardStep"]}>{index === 0 ? t("step1") : t("step2")}</div>
                  </div>

                  {/* Illustration */}
                  <div className={styles["cardIllustration"]}>
                    <Image
                      src={card.imageSrc}
                      alt={card.illustrationAlt}
                      width={200}
                      height={200}
                      className={styles["cardImage"]}
                      priority={index === 0}
                    />
                  </div>

                  <div className={styles["cardTitleSection"]}>
                    <CardTitle className={styles["cardTitle"]}>{card.title}</CardTitle>
                    <CardDescription className={styles["cardDescription"]}>{card.description}</CardDescription>
                  </div>
                </CardHeader>

                <CardContent className={styles["cardContent"]}>
                  {/* Benefits list */}
                  <ul className={styles["bulletsList"]}>
                    {card.bullets.map((bullet) => (
                      <li
                        key={`${card.key}-${bullet}`}
                        className={styles["bulletItem"]}>
                        <span
                          className={styles["bulletDot"]}
                          aria-hidden='true'
                        />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Section */}
                  <div className={styles["ctaSection"]}>
                    <div className={styles["ctaButtonWrapper"]}>
                      <Button
                        asChild
                        size='lg'
                        className={styles["ctaButton"]}>
                        <Link href={card.href}>
                          {card.cta}
                          <TbArrowRight className={styles["ctaArrowIcon"]} />
                        </Link>
                      </Button>
                    </div>

                    <p className={styles["secondaryPrompt"]}>
                      {card.secondaryPrompt}{" "}
                      <Link
                        href={card.secondaryHref}
                        className={styles["secondaryLink"]}>
                        {card.secondaryAction}
                      </Link>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Section footer note */}
        <p className={styles["footerNote"]}>{t("footer")}</p>
      </div>
    </section>
  );
}

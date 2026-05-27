"use client";

import {Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import Image from "next/image";
import Link from "next/link";
import {TbArrowRight, TbLock, TbShield, TbUserPlus} from "react-icons/tb";
import AuthTrustBadgesRow from "./_components/AuthTrustBadgesRow";
import styles from "./island.module.scss";

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
  const t = useTranslations();

  const trustBadges: Readonly<[string, string, string]> = [t((m) => m.pages.auth.island.trust.oauth), t((m) => m.pages.auth.island.trust.session), t((m) => m.pages.auth.island.trust.privacy)];

  const cards: ReadonlyArray<AuthCard> = [
    {
      key: "signUp",
      href: "/auth/sign-up/",
      imageSrc: "/images/auth/sign-up.svg",
      illustrationAlt: t((m) => m.pages.auth.island.signUp.illustrationAlt),
      title: t((m) => m.pages.auth.island.signUp.title),
      description: t((m) => m.pages.auth.island.signUp.description),
      bullets: [t((m) => m.pages.auth.island.signUp.bullets.first), t((m) => m.pages.auth.island.signUp.bullets.second), t((m) => m.pages.auth.island.signUp.bullets.third)],
      cta: t((m) => m.pages.auth.island.signUp.cta),
      secondaryPrompt: t((m) => m.pages.auth.island.signUp.secondaryPrompt),
      secondaryAction: t((m) => m.pages.auth.island.signUp.secondaryAction),
      secondaryHref: "/auth/sign-in/",
      icon: TbUserPlus,
      gradientKey: "emerald",
    },
    {
      key: "signIn",
      href: "/auth/sign-in/",
      imageSrc: "/images/auth/sign-in.svg",
      illustrationAlt: t((m) => m.pages.auth.island.signIn.illustrationAlt),
      title: t((m) => m.pages.auth.island.signIn.title),
      description: t((m) => m.pages.auth.island.signIn.description),
      bullets: [t((m) => m.pages.auth.island.signIn.bullets.first), t((m) => m.pages.auth.island.signIn.bullets.second), t((m) => m.pages.auth.island.signIn.bullets.third)],
      cta: t((m) => m.pages.auth.island.signIn.cta),
      secondaryPrompt: t((m) => m.pages.auth.island.signIn.secondaryPrompt),
      secondaryAction: t((m) => m.pages.auth.island.signIn.secondaryAction),
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

            <h1 className={styles["heroTitle"]}>{t((m) => m.pages.auth.island.hero.title)}</h1>

            <p className={styles["heroSubtitle"]}>{t((m) => m.pages.auth.island.hero.subtitle)}</p>
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
                    <div className={styles["cardStep"]}>{index === 0 ? t((m) => m.pages.auth.island.step1) : t((m) => m.pages.auth.island.step2)}</div>
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
        <p className={styles["footerNote"]}>{t((m) => m.pages.auth.island.footer)}</p>
      </div>
    </section>
  );
}

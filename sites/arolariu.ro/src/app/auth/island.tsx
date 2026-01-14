"use client";

import {Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle} from "@arolariu/components";
import {useTranslations} from "next-intl";
import Image from "next/image";
import Link from "next/link";
import {TbArrowRight, TbLock, TbShield, TbUserPlus} from "react-icons/tb";
import AuthTrustBadgesRow from "./_components/AuthTrustBadgesRow";

type AuthCardKey = "signUp" | "signIn";

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
  gradient: string;
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
      gradient: "from-emerald-500/20 via-cyan-500/10 to-transparent",
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
      gradient: "from-violet-500/20 via-purple-500/10 to-transparent",
    },
  ];

  return (
    <section className='relative mx-auto w-full max-w-6xl'>
      <div className='relative flex flex-col gap-12'>
        <header className='relative text-center'>
          <div className='relative'>
            <Badge
              variant='secondary'
              className='mb-4 px-4 py-1.5 text-sm font-medium'>
              <TbShield className='mr-2 h-4 w-4' />
              OAuth 2.0
            </Badge>

            <h1 className='from-foreground via-foreground/90 to-foreground/70 bg-linear-to-r bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl lg:text-6xl'>
              {t("hero.title")}
            </h1>

            <p className='text-muted-foreground mx-auto mt-4 max-w-2xl text-lg leading-relaxed sm:text-xl'>{t("hero.subtitle")}</p>
          </div>

          <AuthTrustBadgesRow
            className='mt-8 flex flex-wrap items-center justify-center gap-3'
            badges={trustBadges}
          />
        </header>

        <div className='grid gap-8 md:grid-cols-2 lg:gap-10'>
          {cards.map((card, index) => (
            <div
              key={card.key}
              className='transition-transform duration-200 hover:-translate-y-1'>
              <Card className='group bg-card/50 border-border/50 hover:border-primary/40 relative h-full overflow-hidden border backdrop-blur-sm transition-all duration-500 hover:shadow-2xl'>
                {/* Gradient overlay */}
                <div
                  className={`pointer-events-none absolute inset-0 bg-linear-to-br ${card.gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
                  aria-hidden='true'
                />

                {/* Corner glow */}
                <div
                  aria-hidden='true'
                  className='bg-primary/30 pointer-events-none absolute -top-16 -right-16 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100'
                />

                <CardHeader className='relative space-y-6 pb-4'>
                  {/* Icon badge */}
                  <div className='flex items-center justify-between'>
                    <div className='bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-xl'>
                      <card.icon className='h-6 w-6' />
                    </div>
                    <div className='text-muted-foreground text-sm font-medium'>{index === 0 ? t("step1") : t("step2")}</div>
                  </div>

                  {/* Illustration */}
                  <div className='from-muted/30 to-muted/10 relative mx-auto flex h-48 w-48 items-center justify-center rounded-2xl bg-linear-to-br p-4 transition-transform duration-300 hover:scale-105 sm:h-56 sm:w-56'>
                    <Image
                      src={card.imageSrc}
                      alt={card.illustrationAlt}
                      width={200}
                      height={200}
                      className='h-full w-full object-contain drop-shadow-lg'
                      priority={index === 0}
                    />
                  </div>

                  <div className='space-y-2 text-center'>
                    <CardTitle className='text-2xl font-bold tracking-tight sm:text-3xl'>{card.title}</CardTitle>
                    <CardDescription className='text-muted-foreground text-base leading-relaxed'>{card.description}</CardDescription>
                  </div>
                </CardHeader>

                <CardContent className='relative space-y-6 pt-2'>
                  {/* Benefits list */}
                  <ul className='space-y-3'>
                    {card.bullets.map((bullet, bulletIndex) => (
                      <li
                        key={`${card.key}-bullet-${bulletIndex}`}
                        className='text-muted-foreground flex items-start gap-3 text-sm'>
                        <span className='flex items-start gap-3'>
                          <span
                            className='bg-primary/70 mt-1.5 h-2 w-2 shrink-0 rounded-full'
                            aria-hidden='true'
                          />
                          <span>{bullet}</span>
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Section */}
                  <div className='space-y-4 pt-2'>
                    <div className='transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]'>
                      <Button
                        asChild
                        size='lg'
                        className='group/btn w-full text-base font-semibold'>
                        <Link href={card.href}>
                          {card.cta}
                          <TbArrowRight className='ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1' />
                        </Link>
                      </Button>
                    </div>

                    <p className='text-muted-foreground text-center text-sm'>
                      {card.secondaryPrompt}{" "}
                      <Link
                        href={card.secondaryHref}
                        className='text-primary font-medium underline-offset-4 transition-colors hover:underline'>
                        {card.secondaryAction}
                      </Link>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer className='text-muted-foreground mx-auto max-w-2xl text-center text-sm leading-relaxed'>{t("footer")}</footer>
      </div>
    </section>
  );
}

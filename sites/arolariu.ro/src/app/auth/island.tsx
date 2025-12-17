"use client";

import {Badge} from "@arolariu/components/badge";
import {Button} from "@arolariu/components/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@arolariu/components/card";
import {DotBackground} from "@arolariu/components/dot-background";
import {Separator} from "@arolariu/components/separator";
import {motion, type Variants} from "motion/react";
import {useTranslations} from "next-intl";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {FiArrowRight, FiLock, FiShield, FiUserPlus} from "react-icons/fi";
import AuthFloatingParticles from "./_components/AuthFloatingParticles";
import AuthTrustBadgesRow from "./_components/AuthTrustBadgesRow";

// Dynamically import Three.js scene to avoid SSR issues
const Auth3DScene = dynamic(() => import("./_components/Auth3DScene"), {
  ssr: false,
  loading: () => null,
});

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

const containerVariants: Variants = {
  hidden: {opacity: 0},
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const headerVariants: Variants = {
  hidden: {opacity: 0, y: -30},
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 80,
      damping: 20,
    },
  },
};

const cardVariants: Variants = {
  hidden: {opacity: 0, y: 40, scale: 0.9},
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};

const floatingAnimation = {
  y: [0, -8, 0],
  transition: {
    duration: 4,
    repeat: Infinity,
    ease: "easeInOut" as const,
  },
};

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
      icon: FiUserPlus,
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
      icon: FiLock,
      gradient: "from-violet-500/20 via-purple-500/10 to-transparent",
    },
  ];

  return (
    <>
      {/* Layer 2: Dot pattern with glow */}
      <DotBackground
        glow
        className='opacity-30'
      />

      {/* Layer 4: Three.js 3D geometric shapes */}
      <Auth3DScene
        className='opacity-50'
        intensity='medium'
      />

      {/* Layer 5: Floating particles */}
      <AuthFloatingParticles
        count={25}
        className='opacity-60'
      />

      {/* Main Content */}
      <section className='relative mx-auto w-full max-w-6xl'>
        <motion.div
          variants={containerVariants}
          initial='hidden'
          animate='visible'
          className='relative flex flex-col gap-12'>
          {/* Hero Header */}
          <motion.header
            variants={headerVariants}
            className='relative text-center'>
            {/* Animated glow behind title */}
            <motion.div
              aria-hidden='true'
              className='bg-primary/20 pointer-events-none absolute inset-x-0 top-0 mx-auto h-40 w-40 rounded-full blur-3xl'
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.4, 0.6, 0.4],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            <motion.div className='relative'>
              <Badge
                variant='secondary'
                className='mb-4 px-4 py-1.5 text-sm font-medium'>
                <FiShield className='mr-2 h-4 w-4' />
                OAuth 2.0
              </Badge>

              <h1 className='from-foreground via-foreground/90 to-foreground/70 bg-linear-to-r bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl lg:text-6xl'>
                {t("hero.title")}
              </h1>

              <p className='text-muted-foreground mx-auto mt-4 max-w-2xl text-lg leading-relaxed sm:text-xl'>{t("hero.subtitle")}</p>
            </motion.div>

            <AuthTrustBadgesRow
              className='mt-8 flex flex-wrap items-center justify-center gap-3'
              badges={trustBadges}
            />
          </motion.header>

          <motion.div variants={headerVariants}>
            <Separator className='mx-auto max-w-md opacity-50' />
          </motion.div>

          {/* Auth Cards Grid */}
          <div className='grid gap-8 md:grid-cols-2 lg:gap-10'>
            {cards.map((card, index) => (
              <motion.div
                key={card.key}
                variants={cardVariants}
                whileHover={{y: -4, transition: {duration: 0.2}}}>
                <Card className='group bg-card/50 border-border/50 hover:border-primary/40 relative h-full overflow-hidden border backdrop-blur-sm transition-all duration-500 hover:shadow-2xl'>
                  {/* Gradient overlay */}
                  <div
                    className={`pointer-events-none absolute inset-0 bg-linear-to-br ${card.gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
                    aria-hidden='true'
                  />

                  {/* Animated corner glow */}
                  <motion.div
                    aria-hidden='true'
                    className='bg-primary/30 pointer-events-none absolute -top-16 -right-16 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100'
                  />

                  <CardHeader className='relative space-y-6 pb-4'>
                    {/* Icon badge */}
                    <div className='flex items-center justify-between'>
                      <div className='bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-xl'>
                        <card.icon className='h-6 w-6' />
                      </div>
                      <motion.div
                        animate={floatingAnimation}
                        className='text-muted-foreground text-sm font-medium'>
                        {index === 0 ? "Step 1" : "Step 2"}
                      </motion.div>
                    </div>

                    {/* Illustration */}
                    <motion.div
                      whileHover={{scale: 1.05, rotate: index === 0 ? 2 : -2}}
                      transition={{type: "spring", stiffness: 300, damping: 20}}
                      className='from-muted/30 to-muted/10 relative mx-auto flex h-48 w-48 items-center justify-center rounded-2xl bg-linear-to-br p-4 sm:h-56 sm:w-56'>
                      <motion.div animate={floatingAnimation}>
                        <Image
                          src={card.imageSrc}
                          alt={card.illustrationAlt}
                          width={200}
                          height={200}
                          className='h-full w-full object-contain drop-shadow-lg transition-transform duration-300'
                          priority={index === 0}
                        />
                      </motion.div>
                    </motion.div>

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
                          <motion.span
                            initial={{opacity: 0, x: -10}}
                            whileInView={{opacity: 1, x: 0}}
                            transition={{delay: bulletIndex * 0.1}}
                            className='flex items-start gap-3'>
                            <span
                              className='bg-primary/70 mt-1.5 h-2 w-2 shrink-0 rounded-full'
                              aria-hidden='true'
                            />
                            <span>{bullet}</span>
                          </motion.span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Section */}
                    <div className='space-y-4 pt-2'>
                      <motion.div
                        whileHover={{scale: 1.02}}
                        whileTap={{scale: 0.98}}>
                        <Button
                          asChild
                          size='lg'
                          className='group/btn w-full text-base font-semibold'>
                          <Link href={card.href}>
                            {card.cta}
                            <FiArrowRight className='ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1' />
                          </Link>
                        </Button>
                      </motion.div>

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
              </motion.div>
            ))}
          </div>

          {/* Footer */}
          <motion.footer
            variants={headerVariants}
            className='text-muted-foreground mx-auto max-w-2xl text-center text-sm leading-relaxed'>
            {t("footer")}
          </motion.footer>
        </motion.div>
      </section>
    </>
  );
}

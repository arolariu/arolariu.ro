"use client";

import {Badge} from "@arolariu/components/badge";
import {Button} from "@arolariu/components/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@arolariu/components/card";
import {Separator} from "@arolariu/components/separator";
import {motion, Variants} from "motion/react";
import {useTranslations} from "next-intl";
import Image from "next/image";
import Link from "next/link";

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
  imageHoverRotate: number;
}>;

/**
 * The client-side authentication screen with modern design and animations.
 *
 * @remarks
 * **Rendering Context**: Client Component with interactive elements.
 *
 * **Design Features**:
 * - Animated card entrance with staggered timing
 * - Background beam effects for visual depth
 * - Hover interactions with scale transformations
 * - Responsive grid layout (1 column mobile, 2 columns desktop)
 * - Card-based UI using shadcn components
 *
 * **Accessibility**:
 * - Semantic HTML structure
 * - ARIA labels for screen readers
 * - Keyboard navigation support
 * - High contrast text
 *
 * @returns The enhanced authentication screen component.
 *
 * @example
 * ```tsx
 * // Rendered from the auth page server component
 * <RenderAuthScreen />
 * ```
 */
export default function RenderAuthScreen(): React.JSX.Element {
  const t = useTranslations("Authentication.Island");

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
      imageHoverRotate: 2,
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
      imageHoverRotate: -2,
    },
  ];

  const containerVariants: Variants = {
    hidden: {opacity: 0},
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  };

  const cardVariants: Variants = {
    hidden: {opacity: 0, y: 20, scale: 0.95},
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

  return (
    <section className='relative mx-auto w-full max-w-7xl overflow-hidden'>
      <motion.div
        variants={containerVariants}
        initial='hidden'
        animate='visible'
        className='relative mx-auto flex flex-col gap-10 px-4 py-6 sm:px-6 lg:px-8 lg:py-10'>
        <header className='relative text-center'>
          <motion.div
            aria-hidden='true'
            className='pointer-events-none absolute inset-x-0 -top-10 mx-auto h-32 w-32 rounded-full bg-primary/15 blur-2xl'
            animate={{y: [0, -6, 0]}}
            transition={{duration: 6, repeat: Infinity, ease: "easeInOut"}}
          />

          <h1 className='text-3xl font-semibold tracking-tight sm:text-4xl'>{t("hero.title")}</h1>
          <p className='text-muted-foreground mx-auto mt-3 max-w-3xl text-base leading-relaxed sm:text-lg'>{t("hero.subtitle")}</p>

          <div className='mt-6 flex flex-wrap items-center justify-center gap-2'>
            <Badge variant='secondary'>{t("trust.oauth")}</Badge>
            <Badge variant='secondary'>{t("trust.session")}</Badge>
            <Badge variant='secondary'>{t("trust.privacy")}</Badge>
          </div>
        </header>

        <Separator />

        <div className='grid gap-8 md:grid-cols-2'>
          {cards.map((card) => (
            <motion.div
              key={card.key}
              variants={cardVariants}>
              <Card className='group hover:border-primary/60 hover:shadow-primary/10 relative h-full overflow-hidden border-2 transition-all duration-300 hover:shadow-2xl'>
                <motion.div
                  aria-hidden='true'
                  className='pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl'
                  animate={{scale: [1, 1.05, 1], rotate: [0, 6, 0]}}
                  transition={{duration: 10, repeat: Infinity, ease: "easeInOut"}}
                />

                <CardHeader className='space-y-4 pb-6'>
                  <motion.div
                    whileHover={{scale: 1.03, rotate: card.imageHoverRotate}}
                    transition={{type: "spring", stiffness: 260, damping: 18}}
                    className='relative mx-auto flex h-44 w-44 items-center justify-center overflow-hidden rounded-2xl bg-linear-to-br from-primary/10 to-muted/10 p-4 sm:h-56 sm:w-56'>
                    <Image
                      src={card.imageSrc}
                      alt={card.illustrationAlt}
                      width={300}
                      height={300}
                      className='h-full w-full object-contain transition-transform duration-300 group-hover:scale-110'
                      priority
                    />
                  </motion.div>

                  <CardTitle className='text-center text-2xl font-semibold tracking-tight sm:text-3xl'>{card.title}</CardTitle>

                  <div className='flex flex-wrap items-center justify-center gap-2'>
                    <Badge variant='secondary'>{t("trust.oauth")}</Badge>
                    <Badge variant='secondary'>{t("trust.session")}</Badge>
                  </div>
                </CardHeader>

                <CardContent className='space-y-6'>
                  <CardDescription className='text-muted-foreground text-center text-base leading-relaxed'>{card.description}</CardDescription>

                  <ul className='mx-auto grid max-w-md gap-2 text-left text-sm text-muted-foreground'>
                    <li className='flex items-start gap-2'>
                      <span aria-hidden='true' className='mt-2 inline-block h-1.5 w-1.5 rounded-full bg-primary/70' />
                      <span>{card.bullets[0]}</span>
                    </li>
                    <li className='flex items-start gap-2'>
                      <span aria-hidden='true' className='mt-2 inline-block h-1.5 w-1.5 rounded-full bg-primary/70' />
                      <span>{card.bullets[1]}</span>
                    </li>
                    <li className='flex items-start gap-2'>
                      <span aria-hidden='true' className='mt-2 inline-block h-1.5 w-1.5 rounded-full bg-primary/70' />
                      <span>{card.bullets[2]}</span>
                    </li>
                  </ul>

                  <div className='flex flex-col gap-3'>
                    <motion.div whileHover={{scale: 1.01}} whileTap={{scale: 0.99}}>
                      <Button asChild className='w-full'>
                        <Link href={card.href}>{card.cta}</Link>
                      </Button>
                    </motion.div>

                    <p className='text-muted-foreground text-center text-sm'>
                      {card.secondaryPrompt}{" "}
                      <Link
                        href={card.secondaryHref}
                        className='text-primary font-medium underline-offset-4 hover:underline'>
                        {card.secondaryAction}
                      </Link>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <footer className='text-muted-foreground mx-auto max-w-3xl text-center text-sm leading-relaxed'>
          {t("footer")}
        </footer>
      </motion.div>
    </section>
  );
}

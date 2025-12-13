"use client";

import {BackgroundBeams} from "@arolariu/components/background-beams";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@arolariu/components/card";
import {motion, Variants} from "motion/react";
import {useTranslations} from "next-intl";
import Image from "next/image";
import Link from "next/link";

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
    <section className='relative min-h-[calc(100vh-200px)] w-full overflow-hidden'>
      <BackgroundBeams className='pointer-events-none' />

      <motion.div
        variants={containerVariants}
        initial='hidden'
        animate='visible'
        className='relative z-10 mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-2 lg:px-8 lg:py-16'>
        {/* Sign Up Card */}
        <motion.div variants={cardVariants}>
          <Card className='group hover:border-primary hover:shadow-primary/20 relative h-full overflow-hidden border-2 transition-all duration-300 hover:shadow-2xl'>
            <CardHeader className='space-y-4 pb-6'>
              <motion.div
                whileHover={{scale: 1.05, rotate: 2}}
                transition={{type: "spring", stiffness: 300}}
                className='relative mx-auto flex h-48 w-48 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-4 sm:h-64 sm:w-64'>
                <Image
                  src='/images/auth/sign-up.svg'
                  alt='Sign up illustration'
                  width={300}
                  height={300}
                  className='h-full w-full object-contain transition-transform duration-300 group-hover:scale-110'
                  priority
                />
              </motion.div>

              <CardTitle className='text-center text-3xl font-bold tracking-tight'>{t("callToAction")}</CardTitle>
            </CardHeader>

            <CardContent className='space-y-6'>
              <CardDescription className='text-muted-foreground text-center text-base leading-relaxed'>{t("description")}</CardDescription>

              <Link
                href='/auth/sign-up/'
                className='block w-full'>
                <motion.button
                  whileHover={{scale: 1.02}}
                  whileTap={{scale: 0.98}}
                  className='group relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/50'>
                  <span className='relative z-10'>Sign up now →</span>
                  <motion.div
                    className='absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600'
                    initial={{x: "100%"}}
                    whileHover={{x: 0}}
                    transition={{duration: 0.3}}
                  />
                </motion.button>
              </Link>

              <p className='text-muted-foreground text-center text-sm'>
                Already have an account?{" "}
                <Link
                  href='/auth/sign-in/'
                  className='text-primary font-medium underline-offset-4 hover:underline'>
                  Sign in here
                </Link>
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sign In Card */}
        <motion.div variants={cardVariants}>
          <Card className='group hover:border-primary hover:shadow-primary/20 relative h-full overflow-hidden border-2 transition-all duration-300 hover:shadow-2xl'>
            <CardHeader className='space-y-4 pb-6'>
              <motion.div
                whileHover={{scale: 1.05, rotate: -2}}
                transition={{type: "spring", stiffness: 300}}
                className='relative mx-auto flex h-48 w-48 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-4 sm:h-64 sm:w-64'>
                <Image
                  src='/images/auth/sign-in.svg'
                  alt='Sign in illustration'
                  width={300}
                  height={300}
                  className='h-full w-full object-contain transition-transform duration-300 group-hover:scale-110'
                  priority
                />
              </motion.div>

              <CardTitle className='text-center text-3xl font-bold tracking-tight'>{t("callToAction")}</CardTitle>
            </CardHeader>

            <CardContent className='space-y-6'>
              <CardDescription className='text-muted-foreground text-center text-base leading-relaxed'>{t("description")}</CardDescription>

              <Link
                href='/auth/sign-in/'
                className='block w-full'>
                <motion.button
                  whileHover={{scale: 1.02}}
                  whileTap={{scale: 0.98}}
                  className='group relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/50'>
                  <span className='relative z-10'>Sign in now →</span>
                  <motion.div
                    className='absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600'
                    initial={{x: "100%"}}
                    whileHover={{x: 0}}
                    transition={{duration: 0.3}}
                  />
                </motion.button>
              </Link>

              <p className='text-muted-foreground text-center text-sm'>
                Don&apos;t have an account?{" "}
                <Link
                  href='/auth/sign-up/'
                  className='text-primary font-medium underline-offset-4 hover:underline'>
                  Create one here
                </Link>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </section>
  );
}

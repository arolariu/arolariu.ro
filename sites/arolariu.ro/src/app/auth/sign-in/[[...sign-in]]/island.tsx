"use client";

import {SignIn} from "@clerk/nextjs";
import {motion, type Variants} from "motion/react";
import {useTranslations} from "next-intl";
import AuthFormShell from "../../_components/AuthFormShell";
import AuthMarketingPanel from "../../_components/AuthMarketingPanel";

const containerVariants: Variants = {
  hidden: {opacity: 0, y: 30, scale: 0.9},
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 80,
      damping: 15,
      duration: 0.6,
    },
  },
};

/**
 * Enhanced sign in client component with immersive animations.
 *
 * @remarks
 * **Rendering Context**: Client Component wrapping Clerk's SignIn.
 *
 * **Animation Features**:
 * - Smooth entrance with spring physics
 * - Scale-up effect with easing
 * - Hover state with glow enhancement
 * - Gradient background glow effects
 *
 * **Styling**:
 * - Glassmorphism card design
 * - Animated gradient borders
 * - Dark mode optimized
 * - Responsive padding
 *
 * @returns The animated sign in component with Clerk authentication
 */
export default function RenderSignInPage(): React.JSX.Element {
  const t = useTranslations("Authentication.SignIn");
  const trust = useTranslations("Authentication.Island.trust");

  return (
    <div className='grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-2'>
      <div className='order-2 lg:order-1'>
        <AuthMarketingPanel
          title={t("hero.title")}
          subtitle={t("hero.subtitle")}
          illustrationSrc='/images/auth/sign-in.svg'
          illustrationAlt={t("illustrationAlt")}
          bullets={[t("bullets.first"), t("bullets.second"), t("bullets.third")]}
          trustBadges={[trust("oauth"), trust("session"), trust("privacy")]}
        />
      </div>

      <div className='order-1 lg:order-2'>
        <AuthFormShell
          kicker={t("form.kicker")}
          secondaryPrompt={t("form.secondaryPrompt")}
          secondaryAction={t("form.secondaryAction")}
          secondaryHref='/auth/sign-up/'
          footer={t("footer")}>
          <motion.div
            variants={containerVariants}
            initial='hidden'
            animate='visible'
            className='relative mx-auto flex justify-center'>
            {/* Background glow */}
            <motion.div
              aria-hidden='true'
              className='bg-primary/20 pointer-events-none absolute -inset-4 rounded-3xl blur-2xl'
              animate={{
                opacity: [0.3, 0.5, 0.3],
                scale: [0.95, 1.02, 0.95],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* Card container */}
            <motion.div
              className='border-border/50 bg-card/60 hover:border-primary/30 hover:shadow-primary/10 relative w-full overflow-hidden rounded-2xl border p-3 shadow-2xl backdrop-blur-md transition-all duration-500 sm:p-4'
              whileHover={{
                boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
              }}>
              {/* Animated corner accent */}
              <motion.div
                aria-hidden='true'
                className='from-primary/20 pointer-events-none absolute -top-10 -right-10 h-24 w-24 rounded-full bg-linear-to-br to-transparent blur-2xl'
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              <SignIn />
            </motion.div>
          </motion.div>
        </AuthFormShell>
      </div>
    </div>
  );
}

"use client";

import {SignUp} from "@clerk/nextjs";
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
 * Enhanced sign up client component with immersive animations.
 *
 * @remarks
 * **Rendering Context**: Client Component wrapping Clerk's SignUp.
 *
 * **Animation Features**:
 * - Smooth entrance with spring physics
 * - Scale-up effect with easing
 * - Hover state with glow enhancement
 * - Animated gradient accents
 *
 * **Styling**:
 * - Glassmorphism card design
 * - Gradient background effects
 * - Dark mode optimized
 * - Responsive padding
 *
 * @returns The animated sign up component with Clerk authentication
 */
export default function RenderSignUpPage(): React.JSX.Element {
  const t = useTranslations("Authentication.SignUp");
  const trust = useTranslations("Authentication.Island.trust");

  return (
    <div className='grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-2'>
      <div>
        <AuthMarketingPanel
          title={t("hero.title")}
          subtitle={t("hero.subtitle")}
          illustrationSrc='/images/auth/sign-up.svg'
          illustrationAlt={t("illustrationAlt")}
          bullets={[t("bullets.first"), t("bullets.second"), t("bullets.third")]}
          trustBadges={[trust("oauth"), trust("session"), trust("privacy")]}
        />
      </div>

      <div>
        <AuthFormShell
          kicker={t("form.kicker")}
          secondaryPrompt={t("form.secondaryPrompt")}
          secondaryAction={t("form.secondaryAction")}
          secondaryHref='/auth/sign-in/'
          footer={t("footer")}>
          <motion.div
            variants={containerVariants}
            initial='hidden'
            animate='visible'
            className='relative mx-auto flex justify-center'>
            {/* Background glow */}
            <motion.div
              aria-hidden='true'
              className='bg-secondary/20 pointer-events-none absolute -inset-4 rounded-3xl blur-2xl'
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
              className='border-border/50 bg-card/60 hover:border-secondary/30 hover:shadow-secondary/10 relative w-full overflow-hidden rounded-2xl border p-3 shadow-2xl backdrop-blur-md transition-all duration-500 sm:p-4'
              whileHover={{
                boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
              }}>
              {/* Animated corner accent */}
              <motion.div
                aria-hidden='true'
                className='from-secondary/20 pointer-events-none absolute -top-10 -left-10 h-24 w-24 rounded-full bg-linear-to-br to-transparent blur-2xl'
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

              {/* Bottom accent */}
              <motion.div
                aria-hidden='true'
                className='from-primary/15 pointer-events-none absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-linear-to-tl to-transparent blur-2xl'
                animate={{
                  scale: [1, 1.15, 1],
                  opacity: [0.4, 0.7, 0.4],
                }}
                transition={{
                  duration: 4,
                  delay: 1,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              <SignUp />
            </motion.div>
          </motion.div>
        </AuthFormShell>
      </div>
    </div>
  );
}

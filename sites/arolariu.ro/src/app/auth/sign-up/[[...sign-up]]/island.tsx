"use client";

import {SignUp} from "@clerk/nextjs";
import {motion, type Variants} from "motion/react";
import {useTranslations} from "next-intl";
import AuthFormShell from "../../_components/AuthFormShell";
import AuthMarketingPanel from "../../_components/AuthMarketingPanel";
import styles from "./styles.module.scss";

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
 * - Gradient accents
 *
 * **Styling**:
 * - Glassmorphism card design
 * - Gradient background effects
 * - Dark mode optimized
 * - Responsive padding
 *
 * @returns The animated sign up component with Clerk authentication
 */
export default function RenderAuthSignUpPage(): React.JSX.Element {
  const t = useTranslations("Authentication.SignUp");
  const trust = useTranslations("Authentication.Island.trust");

  return (
    <div className={styles["grid"]}>
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
            className={styles["formContainer"]}>
            {/* Background glow - static for performance */}
            <div
              aria-hidden='true'
              className={styles["backgroundGlow"]}
            />

            {/* Card container */}
            <motion.div
              className={styles["card"]}
              whileHover={{
                boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
              }}>
              {/* Corner accent top - static for performance */}
              <div
                aria-hidden='true'
                className={styles["cornerAccentTop"]}
              />

              {/* Corner accent bottom - static for performance */}
              <div
                aria-hidden='true'
                className={styles["cornerAccentBottom"]}
              />

              <SignUp />
            </motion.div>
          </motion.div>
        </AuthFormShell>
      </div>
    </div>
  );
}

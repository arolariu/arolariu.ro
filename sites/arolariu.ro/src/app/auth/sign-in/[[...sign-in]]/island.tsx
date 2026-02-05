"use client";

import {SignIn} from "@clerk/nextjs";
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
 * - Gradient borders
 * - Dark mode optimized
 * - Responsive padding
 *
 * @returns The animated sign in component with Clerk authentication
 */
export default function RenderAuthSignInPage(): React.JSX.Element {
  const t = useTranslations("Authentication.SignIn");
  const trust = useTranslations("Authentication.Island.trust");

  return (
    <div className={styles["grid"]}>
      <div className={styles["marketingColumn"]}>
        <AuthMarketingPanel
          title={t("hero.title")}
          subtitle={t("hero.subtitle")}
          illustrationSrc='/images/auth/sign-in.svg'
          illustrationAlt={t("illustrationAlt")}
          bullets={[t("bullets.first"), t("bullets.second"), t("bullets.third")]}
          trustBadges={[trust("oauth"), trust("session"), trust("privacy")]}
        />
      </div>

      <div className={styles["formColumn"]}>
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
              {/* Corner accent - static for performance */}
              <div
                aria-hidden='true'
                className={styles["cornerAccent"]}
              />

              <SignIn />
            </motion.div>
          </motion.div>
        </AuthFormShell>
      </div>
    </div>
  );
}

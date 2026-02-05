"use client";

import {SignIn} from "@clerk/nextjs";
import {motion, type Variants} from "motion/react";
import {useTranslations} from "next-intl";
import AuthFormShell from "../../_components/AuthFormShell";
import AuthMarketingPanel from "../../_components/AuthMarketingPanel";
import styles from "../../_components/styles.module.scss";

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
 * Sign in page client component.
 *
 * @remarks
 * **Rendering Context**: Client Component wrapping Clerk's SignIn.
 *
 * @returns The sign in component with Clerk authentication
 */
export default function RenderAuthSignInPage(): React.JSX.Element {
  const t = useTranslations("Authentication.SignIn");
  const trust = useTranslations("Authentication.Island.trust");

  return (
    <div className={styles["grid"]}>
      <div className={`${styles["column"]} ${styles["columnReverse"]}`}>
        <AuthMarketingPanel
          title={t("hero.title")}
          subtitle={t("hero.subtitle")}
          illustrationSrc='/images/auth/sign-in.svg'
          illustrationAlt={t("illustrationAlt")}
          bullets={[t("bullets.first"), t("bullets.second"), t("bullets.third")]}
          trustBadges={[trust("oauth"), trust("session"), trust("privacy")]}
        />
      </div>

      <div className={`${styles["column"]} ${styles["columnForward"]}`}>
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
            {/* Background glow */}
            <div
              aria-hidden='true'
              className={`${styles["glow"]} ${styles["glowBackground"]} ${styles["glowBackgroundPrimary"]}`}
            />

            {/* Card */}
            <motion.div
              className={`${styles["card"]} ${styles["cardPrimary"]}`}
              whileHover={{
                boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
              }}>
              {/* Corner accent */}
              <div
                aria-hidden='true'
                className={`${styles["glow"]} ${styles["glowCorner"]} ${styles["glowCornerTopRight"]}`}
              />

              <SignIn />
            </motion.div>
          </motion.div>
        </AuthFormShell>
      </div>
    </div>
  );
}

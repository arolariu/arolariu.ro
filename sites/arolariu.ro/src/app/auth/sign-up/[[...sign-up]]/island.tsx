"use client";

import {SignUp} from "@clerk/nextjs";
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
 * Sign up page client component.
 *
 * @remarks
 * **Rendering Context**: Client Component wrapping Clerk's SignUp.
 *
 * @returns The sign up component with Clerk authentication
 */
export default function RenderAuthSignUpPage(): React.JSX.Element {
  const t = useTranslations("Authentication.SignUp");
  const trust = useTranslations("Authentication.Island.trust");

  return (
    <div className={styles["grid"]}>
      <div className={styles["column"]}>
        <AuthMarketingPanel
          title={t("hero.title")}
          subtitle={t("hero.subtitle")}
          illustrationSrc='/images/auth/sign-up.svg'
          illustrationAlt={t("illustrationAlt")}
          bullets={[t("bullets.first"), t("bullets.second"), t("bullets.third")]}
          trustBadges={[trust("oauth"), trust("session"), trust("privacy")]}
        />
      </div>

      <div className={styles["column"]}>
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
            {/* Background glow */}
            <div
              aria-hidden='true'
              className={`${styles["glow"]} ${styles["glowBackground"]} ${styles["glowBackgroundSecondary"]}`}
            />

            {/* Card */}
            <motion.div
              className={`${styles["card"]} ${styles["cardSecondary"]}`}
              whileHover={{
                boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
              }}>
              {/* Corner accent top-left */}
              <div
                aria-hidden='true'
                className={`${styles["glow"]} ${styles["glowCorner"]} ${styles["glowCornerTopLeft"]}`}
              />

              {/* Corner accent bottom-right */}
              <div
                aria-hidden='true'
                className={`${styles["glow"]} ${styles["glowCornerBottomRight"]}`}
              />

              <SignUp />
            </motion.div>
          </motion.div>
        </AuthFormShell>
      </div>
    </div>
  );
}

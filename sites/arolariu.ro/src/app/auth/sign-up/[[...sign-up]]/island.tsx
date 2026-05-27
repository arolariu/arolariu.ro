"use client";

import {SignUp} from "@clerk/nextjs";
import {motion, type Variants} from "motion/react";
import {useTranslations} from "next-intl-selector";
import dynamic from "next/dynamic";
import AuthFormShell from "../../_components/AuthFormShell";
import AuthMarketingPanel from "../../_components/AuthMarketingPanel";
import styles from "./island.module.scss";

/** Skeleton displayed while Clerk's SignUp component is mounting */
function ClerkSkeleton(): React.JSX.Element {
  return (
    <div className={styles["clerkSkeleton"]}>
      <div className={styles["clerkSkeletonHeader"]}>
        <div className={`${styles["clerkSkeletonLogo"]} ${styles["clerkShimmer"]}`} />
        <div className={`${styles["clerkSkeletonTitle"]} ${styles["clerkShimmer"]}`} />
        <div className={`${styles["clerkSkeletonSubtitle"]} ${styles["clerkShimmer"]}`} />
      </div>
      <div className={styles["clerkSkeletonSocial"]}>
        <div className={`${styles["clerkSkeletonSocialButton"]} ${styles["clerkShimmer"]}`} />
        <div className={`${styles["clerkSkeletonSocialButton"]} ${styles["clerkShimmer"]}`} />
        <div className={`${styles["clerkSkeletonSocialButton"]} ${styles["clerkShimmer"]}`} />
      </div>
      <div className={`${styles["clerkSkeletonDivider"]} ${styles["clerkShimmer"]}`} />
      {/* SignUp has more fields: email, password, first name, last name */}
      <div className={`${styles["clerkSkeletonInput"]} ${styles["clerkShimmer"]}`} />
      <div className={`${styles["clerkSkeletonInput"]} ${styles["clerkShimmer"]}`} />
      <div className={`${styles["clerkSkeletonInput"]} ${styles["clerkShimmer"]}`} />
      <div className={`${styles["clerkSkeletonInput"]} ${styles["clerkShimmer"]}`} />
      <div className={`${styles["clerkSkeletonButton"]} ${styles["clerkShimmer"]}`} />
      <div className={styles["clerkSkeletonFooter"]}>
        <div className={`${styles["clerkSkeletonFooterText"]} ${styles["clerkShimmer"]}`} />
      </div>
    </div>
  );
}

/** Wrapper using Clerk's fallback prop for loading state */
function SignUpWithFallback(): React.JSX.Element {
  return <SignUp fallback={<ClerkSkeleton />} />;
}

/** Dynamic import with ssr:false to prevent hydration errors */
const DynamicSignUp = dynamic(() => Promise.resolve(SignUpWithFallback), {
  ssr: false,
  loading: () => <ClerkSkeleton />,
});

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
  const t = useTranslations();
  const trust = useTranslations();

  return (
    <div className={styles["grid"]}>
      <div className={styles["column"]}>
        <AuthMarketingPanel
          title={t((m) => m.pages.auth.signUp.hero.title)}
          subtitle={t((m) => m.pages.auth.signUp.hero.subtitle)}
          illustrationSrc='/images/auth/sign-up.svg'
          illustrationAlt={t((m) => m.pages.auth.signUp.illustrationAlt)}
          bullets={[t((m) => m.pages.auth.signUp.bullets.first), t((m) => m.pages.auth.signUp.bullets.second), t((m) => m.pages.auth.signUp.bullets.third)]}
          trustBadges={[trust((m) => m.pages.auth.island.trust.oauth), trust((m) => m.pages.auth.island.trust.session), trust((m) => m.pages.auth.island.trust.privacy)]}
        />
      </div>

      <div className={styles["column"]}>
        <AuthFormShell
          kicker={t((m) => m.pages.auth.signUp.form.kicker)}
          secondaryPrompt={t((m) => m.pages.auth.signUp.form.secondaryPrompt)}
          secondaryAction={t((m) => m.pages.auth.signUp.form.secondaryAction)}
          secondaryHref='/auth/sign-in/'
          footer={t((m) => m.pages.auth.signUp.footer)}>
          <motion.div
            variants={containerVariants}
            initial='hidden'
            animate='visible'
            className={styles["formContainer"]}>
            {/* Background glow */}
            <div
              aria-hidden='true'
              className={`${styles["glow"]} ${styles["glowBackground"]}`}
            />

            {/* Card */}
            <motion.div
              className={styles["card"]}
              whileHover={{
                boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
              }}>
              <DynamicSignUp />
            </motion.div>
          </motion.div>
        </AuthFormShell>
      </div>
    </div>
  );
}

"use client";

import {motion, type Variants} from "motion/react";
import Image from "next/image";
import styles from "../Auth.module.scss";
import AuthBulletList from "./AuthBulletList";
import AuthTrustBadgesRow from "./AuthTrustBadgesRow";

export type AuthMarketingPanelProps = Readonly<{
  title: string;
  subtitle: string;
  illustrationSrc: string;
  illustrationAlt: string;
  bullets: Readonly<[string, string, string]>;
  trustBadges?: ReadonlyArray<string>;
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

const itemVariants: Variants = {
  hidden: {opacity: 0, x: -20},
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};


/**
 * Enhanced marketing panel for authentication pages with animations.
 *
 * @remarks
 * **Rendering Context**: Client Component with motion animations.
 *
 * **Features**:
 * - Staggered entrance animations
 * - Floating illustration effect
 * - Gradient glow backgrounds
 * - Trust badge integration
 * - Animated bullet points
 *
 * @param props - Component properties
 *
 * @returns Animated marketing panel JSX element
 */
export default function AuthMarketingPanel(props: AuthMarketingPanelProps): React.JSX.Element {
  return (
    <motion.div
      className={styles["marketingPanel"]}
      variants={containerVariants}
      initial='hidden'
      animate='visible'>
      {/* Background glow effect - static for performance */}
      <div
        aria-hidden='true'
        className={styles["marketingGlow"]}
      />

      {/* Header section */}
      <motion.div
        className={styles["marketingHeaderSection"]}
        variants={itemVariants}>
        <h1 className={styles["marketingTitle"]}>
          {props.title}
        </h1>
        <p className={styles["marketingSubtitle"]}>{props.subtitle}</p>

        {props.trustBadges && props.trustBadges.length > 0 ? (
          <motion.div variants={itemVariants}>
            <AuthTrustBadgesRow
              className={styles["marketingTrustBadges"]}
              badges={props.trustBadges}
            />
          </motion.div>
        ) : null}
      </motion.div>

      {/* Illustration card */}
      <motion.div
        variants={itemVariants}
        className={styles["marketingCard"]}>
        {/* Gradient glows - static for performance */}
        <div
          aria-hidden='true'
          className={styles["marketingCardGlowPrimary"]}
        />
        <div
          aria-hidden='true'
          className={styles["marketingCardGlowSecondary"]}
        />

        {/* Illustration */}
        <div className={styles["marketingIllustration"]}>
          <Image
            src={props.illustrationSrc}
            alt={props.illustrationAlt}
            width={320}
            height={320}
            className={styles["marketingImage"]}
            priority
          />
        </div>

        {/* Bullet list */}
        <motion.div
          className={styles["marketingBulletSection"]}
          variants={itemVariants}>
          <AuthBulletList
            className={`${styles["authBulletList"]} ${styles["authBulletListSpaced"]}`}
            bullets={props.bullets}
            bulletAdornment={
              <span
                className={styles["authBulletDot"]}
                aria-hidden='true'
              />
            }
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

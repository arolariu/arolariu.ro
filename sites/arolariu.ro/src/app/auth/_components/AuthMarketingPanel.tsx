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

const floatingAnimation = {
  y: [0, -10, 0],
  rotate: [0, 2, 0],
  transition: {
    duration: 5,
    repeat: Infinity,
    ease: "easeInOut" as const,
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
      {/* Background glow effects */}
      <motion.div
        aria-hidden='true'
        className={styles["marketingGlow"]}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
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
        {/* Gradient glows */}
        <motion.div
          aria-hidden='true'
          className={styles["marketingCardGlowPrimary"]}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          aria-hidden='true'
          className={styles["marketingCardGlowSecondary"]}
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 7,
            delay: 1,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Floating illustration */}
        <motion.div
          animate={floatingAnimation}
          className={styles["marketingIllustration"]}>
          <Image
            src={props.illustrationSrc}
            alt={props.illustrationAlt}
            width={320}
            height={320}
            className={styles["marketingImage"]}
            priority
          />
        </motion.div>

        {/* Animated bullet list */}
        <motion.div
          className={styles["marketingBulletSection"]}
          variants={itemVariants}>
          <AuthBulletList
            className={`${styles["authBulletList"]} ${styles["authBulletListSpaced"]}`}
            bullets={props.bullets}
            bulletAdornment={
              <motion.span
                className={styles["authBulletDotAnimated"]}
                aria-hidden='true'
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            }
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

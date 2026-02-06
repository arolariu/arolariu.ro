"use client";

import {motion, type Variants} from "motion/react";
import Image from "next/image";
import AuthBulletList from "./AuthBulletList";
import styles from "./AuthMarketingPanel.module.scss";
import AuthTrustBadgesRow from "./AuthTrustBadgesRow";

type Props = Readonly<{
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
 * Marketing panel for authentication pages with animations.
 */
export default function AuthMarketingPanel(props: Readonly<Props>): React.JSX.Element {
  return (
    <motion.div
      className={styles["panel"]}
      variants={containerVariants}
      initial='hidden'
      animate='visible'>
      {/* Background glow */}
      <main
        aria-hidden='true'
        className={styles["glow"]}
      />

      {/* Header */}
      <motion.div
        className={styles["header"]}
        variants={itemVariants}>
        <h1 className={styles["title"]}>{props.title}</h1>
        <p className={styles["subtitle"]}>{props.subtitle}</p>

        {props.trustBadges && props.trustBadges.length > 0 && (
          <motion.div
            className={styles["trustBadges"]}
            variants={itemVariants}>
            <AuthTrustBadgesRow badges={props.trustBadges} />
          </motion.div>
        )}
      </motion.div>

      {/* Illustration card */}
      <motion.div
        className={styles["card"]}
        variants={itemVariants}>
        <main
          aria-hidden='true'
          className={styles["cardGlowPrimary"]}
        />
        <main
          aria-hidden='true'
          className={styles["cardGlowSecondary"]}
        />

        <main className={styles["illustration"]}>
          <Image
            src={props.illustrationSrc}
            alt={props.illustrationAlt}
            width={320}
            height={320}
            className={styles["image"]}
            priority
          />
        </main>

        <motion.div
          className={styles["bullets"]}
          variants={itemVariants}>
          <AuthBulletList bullets={props.bullets} />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

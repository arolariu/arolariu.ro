"use client";

import {Badge, Button} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import Link from "next/link";
import {TbChevronDown, TbRocket, TbSparkles} from "react-icons/tb";
import styles from "./Hero.module.scss";

/**
 * Hero section for the About hub page.
 * Features animated background, gradient text, and CTAs.
 */
export default function Hero(): React.JSX.Element {
  const t = useTranslations("About.Hub.hero");

  return (
    <section className={styles["section"]}>
      {/* Animated background orbs */}
      <div className={styles["bgOrbs"]}>
        <motion.div
          className={styles["orbBlue"]}
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className={styles["orbPurple"]}
          animate={{
            x: [0, -40, 0],
            y: [0, -30, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className={styles["orbIndigo"]}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Grid pattern overlay */}
      <div
        className={styles["gridPattern"]}
        aria-hidden='true'
      />

      {/* Content */}
      <motion.div
        className={styles["content"]}
        initial={{opacity: 0, y: 20}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.6}}>
        {/* Badge */}
        <motion.div
          initial={{opacity: 0, scale: 0.9}}
          animate={{opacity: 1, scale: 1}}
          transition={{delay: 0.2}}>
          <Badge
            variant='secondary'
            className={styles["badge"]}>
            <TbSparkles className={styles["badgeIcon"]} />
            {t("badge")}
          </Badge>
        </motion.div>

        {/* Main title - starts visible for accessibility, animates position only */}
        <motion.h1
          className={styles["title"]}
          initial={{y: 20}}
          animate={{y: 0}}
          transition={{delay: 0.3}}>
          {t("title")}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className={styles["subtitle"]}
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{delay: 0.4}}>
          {t("subtitle")}
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          className={styles["cta"]}
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{delay: 0.5}}>
          <Button
            asChild
            size='lg'
            className={styles["ctaButton"]}>
            <Link href='/about/the-platform'>
              <TbRocket className={styles["ctaIcon"]} />
              {t("ctaPrimary")}
            </Link>
          </Button>
          <Button
            asChild
            variant='outline'
            size='lg'
            className={styles["ctaButton"]}>
            <Link href='/about/the-author'>{t("ctaSecondary")}</Link>
          </Button>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className={styles["scrollIndicator"]}
        initial={{opacity: 0}}
        animate={{opacity: 1}}
        transition={{delay: 1}}>
        <motion.div
          animate={{y: [0, 8, 0]}}
          transition={{duration: 2, repeat: Infinity, ease: "easeInOut"}}>
          <TbChevronDown className={styles["scrollIcon"]} />
        </motion.div>
      </motion.div>
    </section>
  );
}

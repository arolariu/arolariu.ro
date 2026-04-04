"use client";

import {Badge} from "@arolariu/components/badge";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import {useRef} from "react";
import {TbHeart, TbPackage} from "react-icons/tb";
import styles from "./Hero.module.scss";

type Props = Readonly<{
  lastUpdatedDate: string;
}>;

/**
 * Hero section for the Acknowledgements page with animated background.
 */
export default function Hero({lastUpdatedDate}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations("Acknowledgements.hero");
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true});

  return (
    <section
      ref={ref}
      className={styles["heroSection"]}>
      {/* Animated background */}
      <div className={styles["backgroundContainer"]}>
        <motion.div
          className={styles["backgroundBlobLeft"]}
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className={styles["backgroundBlobRight"]}
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [0, -90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Content */}
      <motion.div
        className={styles["contentContainer"]}
        initial={{opacity: 0, y: 30}}
        animate={isInView ? {opacity: 1, y: 0} : {}}
        transition={{duration: 0.8}}>
        {/* Badge */}
        <motion.div
          initial={{opacity: 0, scale: 0.9}}
          animate={isInView ? {opacity: 1, scale: 1} : {}}
          transition={{delay: 0.2, duration: 0.5}}>
          <Badge
            variant='secondary'
            className={styles["badge"]}>
            <TbHeart className={styles["badgeIcon"]} />
            {t("badge")}
          </Badge>
        </motion.div>

        {/* Title */}
        <motion.h1
          className={styles["title"]}
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{delay: 0.3, duration: 0.6}}>
          <span className={styles["titleGradient"]}>{t("title")}</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className={styles["subtitle"]}
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{delay: 0.4, duration: 0.6}}>
          {t("subtitle")}
        </motion.p>

        {/* Last updated */}
        <motion.div
          className={styles["lastUpdated"]}
          initial={{opacity: 0}}
          animate={isInView ? {opacity: 1} : {}}
          transition={{delay: 0.6, duration: 0.5}}>
          <TbPackage className={styles["lastUpdatedIcon"]} />
          <span>{t("lastUpdate", {date: lastUpdatedDate})}</span>
        </motion.div>
      </motion.div>
    </section>
  );
}

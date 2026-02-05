"use client";

import {Card, CardContent} from "@arolariu/components/card";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import {useRef} from "react";
import {TbBulb, TbHeart, TbTargetArrow} from "react-icons/tb";
import styles from "./Mission.module.scss";

// Map pillar keys to SCSS gradient class names
const gradientClassMap = {
  innovation: "iconBlue",
  quality: "iconGreen",
  openness: "iconPink",
} as const;

const pillars = [
  {key: "innovation", icon: TbBulb},
  {key: "quality", icon: TbTargetArrow},
  {key: "openness", icon: TbHeart},
] as const;

/**
 * Mission section displaying the platform's purpose and core pillars.
 */
export default function Mission(): React.JSX.Element {
  const t = useTranslations("About.Hub.mission");
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});

  return (
    <section
      ref={ref}
      className={styles["section"]}>
      <div className={styles["container"]}>
        {/* Section header */}
        <motion.div
          className={styles["header"]}
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.6}}>
          <h2 className={styles["title"]}>{t("title")}</h2>
          <motion.p
            className={styles["statement"]}
            initial={{opacity: 0, scale: 0.95}}
            animate={isInView ? {opacity: 1, scale: 1} : {}}
            transition={{delay: 0.2, duration: 0.5}}>
            {t("statement")}
          </motion.p>
          <p className={styles["description"]}>{t("description")}</p>
        </motion.div>

        {/* Pillars grid */}
        <div className={styles["grid"]}>
          {pillars.map((pillar, index) => (
            <motion.div
              key={pillar.key}
              initial={{opacity: 0, y: 30}}
              animate={isInView ? {opacity: 1, y: 0} : {}}
              transition={{delay: 0.3 + index * 0.1, duration: 0.5}}>
              <Card className={styles["card"]}>
                <div className={styles["cardGradient"]} />
                <CardContent className={styles["cardContent"]}>
                  <div className={`${styles["iconWrapper"]} ${styles[gradientClassMap[pillar.key]]}`}>
                    <pillar.icon className={styles["icon"]} />
                  </div>
                  <h3 className={styles["cardTitle"]}>{t(`pillars.${pillar.key}.title`)}</h3>
                  <p className={styles["cardDescription"]}>{t(`pillars.${pillar.key}.description`)}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

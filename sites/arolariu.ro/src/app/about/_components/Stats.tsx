"use client";

import {Card, CardContent} from "@arolariu/components/card";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import {useRef} from "react";
import {TbCalendar, TbCode, TbShieldCheck, TbStack2} from "react-icons/tb";
import styles from "./Stats.module.scss";

// Map stat keys to gradient/value SCSS class names
const gradientClassMap = {
  yearsActive: {gradient: "gradientBlue", value: "valueBlue"},
  linesOfCode: {gradient: "gradientPurple", value: "valuePurple"},
  technologies: {gradient: "gradientAmber", value: "valueAmber"},
  testCoverage: {gradient: "gradientGreen", value: "valueGreen"},
} as const;

const stats = [
  {key: "yearsActive", icon: TbCalendar},
  {key: "linesOfCode", icon: TbCode},
  {key: "technologies", icon: TbStack2},
  {key: "testCoverage", icon: TbShieldCheck},
] as const;

/**
 * Stats section displaying key metrics about the platform.
 */
export default function Stats(): React.JSX.Element {
  const t = useTranslations("About.Hub.stats");
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});

  return (
    <section
      ref={ref}
      className={styles["section"]}>
      <main className={styles["container"]}>
        {/* Section header */}
        <motion.div
          className={styles["header"]}
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.6}}>
          <h2 className={styles["title"]}>{t("title")}</h2>
          <p className={styles["subtitle"]}>{t("subtitle")}</p>
        </motion.div>

        {/* Stats grid */}
        <main className={styles["grid"]}>
          {stats.map((stat, index) => {
            const classes = gradientClassMap[stat.key];
            return (
              <motion.div
                key={stat.key}
                initial={{opacity: 0, scale: 0.9}}
                animate={isInView ? {opacity: 1, scale: 1} : {}}
                transition={{delay: 0.2 + index * 0.1, duration: 0.5}}>
                <Card className={styles["card"]}>
                  <CardContent className={styles["cardContent"]}>
                    {/* Background gradient */}
                    <main className={styles["cardGradient"]} />

                    {/* Icon */}
                    <main className={styles["iconWrapper"]}>
                      <main className={`${styles["iconInner"]} ${styles[classes.gradient]}`}>
                        <stat.icon className={styles["icon"]} />
                      </main>
                    </main>

                    {/* Value */}
                    <motion.div
                      className={styles[classes.value]}
                      initial={{opacity: 0}}
                      animate={isInView ? {opacity: 1} : {}}
                      transition={{delay: 0.4 + index * 0.1}}>
                      {t(`items.${stat.key}.value`)}
                    </motion.div>

                    {/* Label */}
                    <h3 className={styles["label"]}>{t(`items.${stat.key}.label`)}</h3>

                    {/* Description */}
                    <p className={styles["description"]}>{t(`items.${stat.key}.description`)}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </main>
      </main>
    </section>
  );
}

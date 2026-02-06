"use client";

import {Card, CardContent} from "@arolariu/components/card";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import {useRef} from "react";
import {TbBox, TbCode, TbLicense, TbTools} from "react-icons/tb";
import styles from "./Stats.module.scss";

const stats = [
  {key: "total", icon: TbBox, gradientClass: styles["gradientCyanBlue"]},
  {key: "production", icon: TbCode, gradientClass: styles["gradientGreenEmerald"]},
  {key: "development", icon: TbTools, gradientClass: styles["gradientAmberOrange"]},
  {key: "mitLicense", icon: TbLicense, gradientClass: styles["gradientPurplePink"]},
] as const;

/**
 * Statistics dashboard showing package breakdown.
 */
export default function Stats(): React.JSX.Element {
  const t = useTranslations("Acknowledgements.stats");
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});

  return (
    <section
      ref={ref}
      className={styles["statsSection"]}>
      <main className={styles["container"]}>
        {/* Section header */}
        <motion.div
          className={styles["sectionHeader"]}
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.6}}>
          <h2 className={styles["title"]}>
            <span className={styles["titleGradient"]}>{t("title")}</span>
          </h2>
          <p className={styles["subtitle"]}>{t("subtitle")}</p>
        </motion.div>

        {/* Stats grid */}
        <main className={styles["statsGrid"]}>
          {stats.map((stat, index) => (
            <motion.div
              key={stat.key}
              initial={{opacity: 0, y: 30}}
              animate={isInView ? {opacity: 1, y: 0} : {}}
              transition={{delay: 0.2 + index * 0.1, duration: 0.5}}>
              <Card className='group hover:border-primary/30 h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg'>
                <CardContent className={styles["cardContent"]}>
                  {/* Icon */}
                  <main className={`${styles["iconWrapper"]} ${stat.gradientClass}`}>
                    <stat.icon className={styles["icon"]} />
                  </main>

                  {/* Value */}
                  <motion.span
                    className={styles["statValue"]}
                    initial={{opacity: 0, scale: 0.5}}
                    animate={isInView ? {opacity: 1, scale: 1} : {}}
                    transition={{delay: 0.4 + index * 0.1, duration: 0.5, type: "spring"}}>
                    {t(`${stat.key}.value`)}
                  </motion.span>

                  {/* Label */}
                  <span className={styles["statLabel"]}>{t(`${stat.key}.label`)}</span>

                  {/* Description */}
                  <span className={styles["statDescription"]}>{t(`${stat.key}.description`)}</span>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </main>
      </main>
    </section>
  );
}

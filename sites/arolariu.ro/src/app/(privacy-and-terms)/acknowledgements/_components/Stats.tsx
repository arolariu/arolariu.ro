"use client";

import {selectorFromPath} from "next-intl-selector";

import type {NodePackagesJSON} from "@/types";
import {Card, CardContent} from "@arolariu/components/card";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl-selector";
import {useRef} from "react";
import {TbBox, TbCode, TbLicense, TbTools} from "react-icons/tb";
import styles from "./Stats.module.scss";

type Props = Readonly<{
  packages: NodePackagesJSON;
}>;

const stats = [
  {key: "total", icon: TbBox, gradientClass: styles["gradientCyanBlue"]},
  {key: "production", icon: TbCode, gradientClass: styles["gradientGreenEmerald"]},
  {key: "development", icon: TbTools, gradientClass: styles["gradientAmberOrange"]},
  {key: "mitLicense", icon: TbLicense, gradientClass: styles["gradientPurplePink"]},
] as const;

/**
 * Statistics dashboard showing package breakdown.
 */
export default function Stats({packages}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations();
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});

  const productionCount = packages.production?.length ?? 0;
  const developmentCount = packages.development?.length ?? 0;
  const peerCount = packages.peer?.length ?? 0;
  const totalCount = productionCount + developmentCount + peerCount;
  const mitCount = [...(packages.production ?? []), ...(packages.development ?? []), ...(packages.peer ?? [])].filter((pkg) =>
    pkg.license?.toUpperCase().includes("MIT"),
  ).length;

  const getStatValue = (key: string): number => {
    switch (key) {
      case "total":
        return totalCount;
      case "production":
        return productionCount;
      case "development":
        return developmentCount;
      case "mitLicense":
        return mitCount;
      default:
        return 0;
    }
  };

  return (
    <section
      ref={ref}
      className={styles["statsSection"]}>
      <div className={styles["container"]}>
        {/* Section header */}
        <motion.div
          className={styles["sectionHeader"]}
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.6}}>
          <h2 className={styles["title"]}>
            <span className={styles["titleGradient"]}>{t((m) => m.sections.legal.acknowledgements.stats.title)}</span>
          </h2>
          <p className={styles["subtitle"]}>{t((m) => m.sections.legal.acknowledgements.stats.subtitle)}</p>
        </motion.div>

        {/* Stats grid */}
        <div className={styles["statsGrid"]}>
          {stats.map((stat, index) => (
            <motion.div
              key={stat.key}
              initial={{opacity: 0, y: 30}}
              animate={isInView ? {opacity: 1, y: 0} : {}}
              transition={{delay: 0.2 + index * 0.1, duration: 0.5}}>
              <Card className={styles["statCard"]}>
                <CardContent className={styles["cardContent"]}>
                  {/* Icon */}
                  <div className={`${styles["iconWrapper"]} ${stat.gradientClass}`}>
                    <stat.icon className={styles["icon"]} />
                  </div>

                  {/* Value */}
                  <motion.span
                    className={styles["statValue"]}
                    initial={{opacity: 0, scale: 0.5}}
                    animate={isInView ? {opacity: 1, scale: 1} : {}}
                    transition={{delay: 0.4 + index * 0.1, duration: 0.5, type: "spring"}}>
                    {t(selectorFromPath(`sections.legal.acknowledgements.stats.${stat.key}.value`), {
                      count: String(getStatValue(stat.key)),
                    })}
                  </motion.span>

                  {/* Label */}
                  <span className={styles["statLabel"]}>
                    {t(selectorFromPath(`sections.legal.acknowledgements.stats.${stat.key}.label`))}
                  </span>

                  {/* Description */}
                  <span className={styles["statDescription"]}>
                    {t(selectorFromPath(`sections.legal.acknowledgements.stats.${stat.key}.description`))}
                  </span>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

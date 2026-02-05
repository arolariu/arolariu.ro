"use client";

import {Badge} from "@arolariu/components/badge";
import {Card, CardContent} from "@arolariu/components/card";
import {CountingNumber} from "@arolariu/components/counting-number";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import {useRef, useState} from "react";
import {TbBrandGithub, TbCode, TbDatabase, TbGlobe, TbServer, TbStar, TbUsers, TbWorld} from "react-icons/tb";
import styles from "./Statistics.module.scss";

interface StatConfig {
  id: string;
  icon: React.ComponentType<{className?: string}>;
  gradientKey: "blue" | "purple" | "green" | "orange" | "pink" | "indigo" | "yellow" | "teal";
}

const iconClassMap = {
  blue: "iconBlue",
  purple: "iconPurple",
  green: "iconGreen",
  orange: "iconOrange",
  pink: "iconPink",
  indigo: "iconIndigo",
  yellow: "iconYellow",
  teal: "iconTeal",
} as const;

const borderClassMap = {
  blue: "borderBlue",
  purple: "borderPurple",
  green: "borderGreen",
  orange: "borderOrange",
  pink: "borderPink",
  indigo: "borderIndigo",
  yellow: "borderYellow",
  teal: "borderTeal",
} as const;

const statConfigs: StatConfig[] = [
  {id: "projects", icon: TbCode, gradientKey: "blue"},
  {id: "commits", icon: TbBrandGithub, gradientKey: "purple"},
  {id: "linesOfCode", icon: TbDatabase, gradientKey: "green"},
  {id: "apis", icon: TbServer, gradientKey: "orange"},
  {id: "users", icon: TbUsers, gradientKey: "pink"},
  {id: "countries", icon: TbWorld, gradientKey: "indigo"},
  {id: "stars", icon: TbStar, gradientKey: "yellow"},
  {id: "contributors", icon: TbGlobe, gradientKey: "teal"},
];

/**
 * Statistics component displaying platform metrics with animated counters.
 * Features CountingNumber for animated number display.
 * @returns The Statistics component, CSR'ed.
 */
export default function Statistics(): React.JSX.Element {
  const t = useTranslations("About.Platform.statistics");
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});
  const [hoveredStat, setHoveredStat] = useState<string | null>(null);

  return (
    <section
      ref={ref}
      className={styles["section"]}>
      {/* Background */}
      <div className={styles["bgLayer"]}>
        <div className={styles["bgGradient"]} />
        <div className={styles["bgGrid"]} />
      </div>

      <div className={styles["container"]}>
        {/* Section Header */}
        <motion.div
          className={styles["header"]}
          initial={{opacity: 0, y: 30}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.6}}>
          <motion.div
            initial={{opacity: 0, scale: 0.9}}
            animate={isInView ? {opacity: 1, scale: 1} : {}}
            transition={{duration: 0.5}}>
            <Badge
              variant='outline'
              className={styles["badge"]}>
              {t("badge")}
            </Badge>
          </motion.div>
          <h2 className={styles["title"]}>
            {t("title")} <span className={styles["titleHighlight"]}>{t("titleHighlight")}</span>
          </h2>
          <p className={styles["description"]}>{t("description")}</p>
        </motion.div>

        {/* Statistics Grid */}
        <div className={styles["statsGrid"]}>
          {statConfigs.map((stat, index) => (
            <motion.div
              key={stat.id}
              initial={{opacity: 0, y: 30}}
              animate={isInView ? {opacity: 1, y: 0} : {}}
              transition={{duration: 0.5, delay: index * 0.1}}
              // eslint-disable-next-line react/jsx-no-bind -- simple page
              onHoverStart={() => setHoveredStat(stat.id)}
              // eslint-disable-next-line react/jsx-no-bind -- simple page
              onHoverEnd={() => setHoveredStat(null)}>
              <Card className={hoveredStat === stat.id ? styles["statCardActive"] : styles["statCard"]}>
                {/* Gradient overlay */}
                <motion.div
                  className={`${styles["statCardGradient"]} ${styles[iconClassMap[stat.gradientKey]]}`}
                  style={{opacity: hoveredStat === stat.id ? 0.1 : 0}}
                />

                <CardContent className={styles["statCardContent"]}>
                  {/* Icon */}
                  <motion.div
                    className={`${styles["statIconWrapper"]} ${styles[iconClassMap[stat.gradientKey]]}`}
                    animate={{
                      scale: hoveredStat === stat.id ? 1.1 : 1,
                      rotate: hoveredStat === stat.id ? 5 : 0,
                    }}
                    transition={{duration: 0.3}}>
                    <stat.icon className={styles["statIcon"]} />
                  </motion.div>

                  {/* Animated Number */}
                  <div className={styles["statValue"]}>
                    <CountingNumber
                      number={Number(t(`items.${stat.id}.value` as Parameters<typeof t>[0]))}
                      inView
                    />
                    {t(`items.${stat.id}.suffix` as Parameters<typeof t>[0])}
                  </div>

                  {/* Label */}
                  <h3 className={styles["statLabel"]}>{t(`items.${stat.id}.label` as Parameters<typeof t>[0])}</h3>
                  <p className={styles["statDescription"]}>{t(`items.${stat.id}.description` as Parameters<typeof t>[0])}</p>
                </CardContent>

                {/* Animated border */}
                <motion.div
                  className={`${styles["statCardBorder"]} ${styles[borderClassMap[stat.gradientKey]]}`}
                  initial={{scaleX: 0}}
                  animate={{scaleX: hoveredStat === stat.id ? 1 : 0}}
                  transition={{duration: 0.3}}
                  style={{transformOrigin: "left"}}
                />
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

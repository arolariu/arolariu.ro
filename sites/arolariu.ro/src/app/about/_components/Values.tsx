"use client";

import {Card, CardContent} from "@arolariu/components/card";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import {useRef} from "react";
import {TbAccessible, TbBook, TbCode, TbRocket, TbShield, TbUsers} from "react-icons/tb";
import styles from "./Values.module.scss";

// Map color keys to SCSS class names
const colorClassMap = {
  blue: "iconBlue",
  amber: "iconAmber",
  green: "iconGreen",
  purple: "iconPurple",
  pink: "iconPink",
  cyan: "iconCyan",
} as const;

const values = [
  {key: "engineering", icon: TbCode, colorKey: "blue"},
  {key: "learning", icon: TbBook, colorKey: "amber"},
  {key: "community", icon: TbUsers, colorKey: "green"},
  {key: "privacy", icon: TbShield, colorKey: "purple"},
  {key: "performance", icon: TbRocket, colorKey: "pink"},
  {key: "accessibility", icon: TbAccessible, colorKey: "cyan"},
] as const;

/**
 * Values section displaying the core values that guide development.
 */
export default function Values(): React.JSX.Element {
  const t = useTranslations("About.Hub.values");
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
          <p className={styles["subtitle"]}>{t("subtitle")}</p>
        </motion.div>

        {/* Values grid */}
        <div className={styles["grid"]}>
          {values.map((value, index) => (
            <motion.div
              key={value.key}
              initial={{opacity: 0, y: 30}}
              animate={isInView ? {opacity: 1, y: 0} : {}}
              transition={{delay: 0.2 + index * 0.1, duration: 0.5}}>
              <Card className={styles["card"]}>
                <CardContent className={styles["cardContent"]}>
                  <div className={styles["cardHeader"]}>
                    <div className={styles[colorClassMap[value.colorKey]]}>
                      <value.icon className={styles["icon"]} />
                    </div>
                    <h3 className={styles["cardTitle"]}>{t(`items.${value.key}.title`)}</h3>
                  </div>
                  <p className={styles["cardDescription"]}>{t(`items.${value.key}.description`)}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

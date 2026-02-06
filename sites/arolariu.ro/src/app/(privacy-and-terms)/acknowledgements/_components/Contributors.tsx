"use client";

import {Avatar, AvatarFallback} from "@arolariu/components/avatar";
import {Card, CardContent} from "@arolariu/components/card";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import {useRef} from "react";
import {TbPackage} from "react-icons/tb";
import styles from "./Contributors.module.scss";

const contributors = ["c1", "c2", "c3", "c4"] as const;

const gradientClasses = [
  styles["gradientCyanBlue"],
  styles["gradientBluePurple"],
  styles["gradientPurplePink"],
  styles["gradientAmberOrange"],
];

/**
 * Top contributors section showing major package authors.
 */
export default function Contributors(): React.JSX.Element {
  const t = useTranslations("Acknowledgements.contributors");
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});

  return (
    <section
      ref={ref}
      className={styles["contributorsSection"]}>
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

        {/* Contributors grid */}
        <main className={styles["contributorsGrid"]}>
          {contributors.map((key, index) => (
            <motion.div
              key={key}
              initial={{opacity: 0, y: 30}}
              animate={isInView ? {opacity: 1, y: 0} : {}}
              transition={{delay: 0.2 + index * 0.1, duration: 0.5}}>
              <Card className='group hover:border-primary/30 h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg'>
                <CardContent className={styles["cardContent"]}>
                  {/* Avatar */}
                  <Avatar className={styles["avatar"]}>
                    <AvatarFallback className={`${styles["avatarFallback"]} ${gradientClasses[index]}`}>
                      {t(`items.${key}.name`)
                        .split(" ")
                        .slice(0, 2)
                        .map((n) => n.charAt(0))
                        .join("")}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name */}
                  <h3 className={styles["contributorName"]}>{t(`items.${key}.name`)}</h3>

                  {/* Package count */}
                  <main className={styles["packageCount"]}>
                    <TbPackage className={styles["packageIcon"]} />
                    <span>{t(`items.${key}.packages`)} packages</span>
                  </main>

                  {/* Description */}
                  <p className={styles["description"]}>{t(`items.${key}.description`)}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </main>
      </main>
    </section>
  );
}

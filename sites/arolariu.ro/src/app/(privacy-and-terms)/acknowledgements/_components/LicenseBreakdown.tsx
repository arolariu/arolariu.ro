"use client";

import {Card, CardContent} from "@arolariu/components/card";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import {useRef} from "react";
import {TbLicense, TbScale} from "react-icons/tb";
import styles from "./LicenseBreakdown.module.scss";

/**
 * License distribution visualization showing MIT vs Apache breakdown.
 */
export default function LicenseBreakdown(): React.JSX.Element {
  const t = useTranslations("Acknowledgements.licenses");
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});

  // Calculate percentages (69 MIT out of 86 total = ~80%, 17 Apache = ~20%)
  const mitPercentage = Math.round((69 / 86) * 100);
  const apachePercentage = 100 - mitPercentage;

  return (
    <section
      ref={ref}
      className={styles["licenseSection"]}>
      <div className={styles["container"]}>
        {/* Section header */}
        <motion.div
          className={styles["sectionHeader"]}
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.6}}>
          <h2 className={styles["title"]}>
            <span className={styles["titleGradient"]}>{t("title")}</span>
          </h2>
        </motion.div>

        {/* License cards */}
        <div className={styles["licenseGrid"]}>
          {/* MIT License */}
          <motion.div
            initial={{opacity: 0, x: -30}}
            animate={isInView ? {opacity: 1, x: 0} : {}}
            transition={{delay: 0.2, duration: 0.5}}>
            <Card className='hover:border-primary/30 h-full transition-all duration-300 hover:-translate-y-1'>
              <CardContent className={styles["cardContent"]}>
                <div className={styles["cardHeader"]}>
                  <div className={`${styles["iconWrapper"]} ${styles["gradientCyanBlue"]}`}>
                    <TbLicense className={styles["icon"]} />
                  </div>
                  <div className={styles["licenseInfo"]}>
                    <h3 className={styles["licenseName"]}>{t("mit")}</h3>
                    <p className={styles["packageCount"]}>69 packages</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className={styles["progressBar"]}>
                  <motion.div
                    className={styles["progressFillCyan"]}
                    initial={{width: 0}}
                    animate={isInView ? {width: `${mitPercentage}%`} : {}}
                    transition={{delay: 0.5, duration: 1, ease: "easeOut"}}
                  />
                </div>

                <div className={styles["cardFooter"]}>
                  <span className={styles["description"]}>{t("mitDescription")}</span>
                  <span className={styles["percentage"]}>{mitPercentage}%</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Apache License */}
          <motion.div
            initial={{opacity: 0, x: 30}}
            animate={isInView ? {opacity: 1, x: 0} : {}}
            transition={{delay: 0.3, duration: 0.5}}>
            <Card className='hover:border-primary/30 h-full transition-all duration-300 hover:-translate-y-1'>
              <CardContent className={styles["cardContent"]}>
                <div className={styles["cardHeader"]}>
                  <div className={`${styles["iconWrapper"]} ${styles["gradientOrangeRed"]}`}>
                    <TbScale className={styles["icon"]} />
                  </div>
                  <div className={styles["licenseInfo"]}>
                    <h3 className={styles["licenseName"]}>{t("apache")}</h3>
                    <p className={styles["packageCount"]}>17 packages</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className={styles["progressBar"]}>
                  <motion.div
                    className={styles["progressFillOrange"]}
                    initial={{width: 0}}
                    animate={isInView ? {width: `${apachePercentage}%`} : {}}
                    transition={{delay: 0.6, duration: 1, ease: "easeOut"}}
                  />
                </div>

                <div className={styles["cardFooter"]}>
                  <span className={styles["description"]}>{t("apacheDescription")}</span>
                  <span className={styles["percentage"]}>{apachePercentage}%</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

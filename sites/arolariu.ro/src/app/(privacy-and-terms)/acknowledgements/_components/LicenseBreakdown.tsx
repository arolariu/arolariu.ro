"use client";

import type {NodePackagesJSON} from "@/types";
import {Card, CardContent} from "@arolariu/components/card";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl-selector";
import {useRef} from "react";
import {TbCopyright, TbInfoCircle, TbLicense, TbScale} from "react-icons/tb";
import styles from "./LicenseBreakdown.module.scss";

type Props = Readonly<{
  packages: NodePackagesJSON;
}>;

/**
 * License distribution visualization showing MIT vs Apache vs GPL vs Other breakdown.
 */
export default function LicenseBreakdown({packages}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations();
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});

  const allPackages = [...(packages.production ?? []), ...(packages.development ?? []), ...(packages.peer ?? [])];

  const totalCount = allPackages.length;

  const mitCount = allPackages.filter((pkg) => pkg.license?.toUpperCase().includes("MIT")).length;
  const apacheCount = allPackages.filter((pkg) => pkg.license?.toUpperCase().includes("APACHE")).length;
  const gplCount = allPackages.filter((pkg) => pkg.license?.toUpperCase().includes("GPL")).length;
  const otherCount = Math.max(0, totalCount - (mitCount + apacheCount + gplCount));

  const mitPercentage = totalCount > 0 ? Math.round((mitCount / totalCount) * 100) : 0;
  const apachePercentage = totalCount > 0 ? Math.round((apacheCount / totalCount) * 100) : 0;
  const gplPercentage = totalCount > 0 ? Math.round((gplCount / totalCount) * 100) : 0;
  const otherPercentage = totalCount > 0 ? Math.max(0, 100 - (mitPercentage + apachePercentage + gplPercentage)) : 0;

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
            <span className={styles["titleGradient"]}>{t((m) => m.sections.legal.acknowledgements.licenses.title)}</span>
          </h2>
        </motion.div>

        {/* License cards */}
        <div className={styles["licenseGrid"]}>
          {/* MIT License */}
          <motion.div
            initial={{opacity: 0, x: -30}}
            animate={isInView ? {opacity: 1, x: 0} : {}}
            transition={{delay: 0.1, duration: 0.5}}>
            <Card className={styles["licenseCard"]}>
              <CardContent className={styles["cardContent"]}>
                <div className={styles["cardHeader"]}>
                  <div className={styles["iconWrapper"]}>
                    <TbLicense className={styles["icon"]} />
                  </div>
                  <div className={styles["licenseInfo"]}>
                    <h3 className={styles["licenseName"]}>{t((m) => m.sections.legal.acknowledgements.licenses.mit)}</h3>
                    <p className={styles["packageCount"]}>
                      {t((m) => m.sections.legal.acknowledgements.licenses.packages, {count: mitCount})}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className={styles["progressBar"]}>
                  <motion.div
                    className={styles["progressFillCyan"]}
                    initial={{width: 0}}
                    animate={isInView ? {width: `${mitPercentage}%`} : {}}
                    transition={{delay: 0.4, duration: 1, ease: "easeOut"}}
                  />
                </div>

                <div className={styles["cardFooter"]}>
                  <span className={styles["description"]}>{t((m) => m.sections.legal.acknowledgements.licenses.mitDescription)}</span>
                  <span className={styles["percentage"]}>{mitPercentage}%</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Apache License */}
          <motion.div
            initial={{opacity: 0, x: 30}}
            animate={isInView ? {opacity: 1, x: 0} : {}}
            transition={{delay: 0.2, duration: 0.5}}>
            <Card className={styles["licenseCard"]}>
              <CardContent className={styles["cardContent"]}>
                <div className={styles["cardHeader"]}>
                  <div className={styles["iconWrapper"]}>
                    <TbScale className={styles["icon"]} />
                  </div>
                  <div className={styles["licenseInfo"]}>
                    <h3 className={styles["licenseName"]}>{t((m) => m.sections.legal.acknowledgements.licenses.apache)}</h3>
                    <p className={styles["packageCount"]}>
                      {t((m) => m.sections.legal.acknowledgements.licenses.packages, {count: apacheCount})}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className={styles["progressBar"]}>
                  <motion.div
                    className={styles["progressFillOrange"]}
                    initial={{width: 0}}
                    animate={isInView ? {width: `${apachePercentage}%`} : {}}
                    transition={{delay: 0.5, duration: 1, ease: "easeOut"}}
                  />
                </div>

                <div className={styles["cardFooter"]}>
                  <span className={styles["description"]}>{t((m) => m.sections.legal.acknowledgements.licenses.apacheDescription)}</span>
                  <span className={styles["percentage"]}>{apachePercentage}%</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* GPL License */}
          <motion.div
            initial={{opacity: 0, x: -30}}
            animate={isInView ? {opacity: 1, x: 0} : {}}
            transition={{delay: 0.3, duration: 0.5}}>
            <Card className={styles["licenseCard"]}>
              <CardContent className={styles["cardContent"]}>
                <div className={styles["cardHeader"]}>
                  <div className={styles["iconWrapper"]}>
                    <TbCopyright className={styles["icon"]} />
                  </div>
                  <div className={styles["licenseInfo"]}>
                    <h3 className={styles["licenseName"]}>{t((m) => m.sections.legal.acknowledgements.licenses.gpl)}</h3>
                    <p className={styles["packageCount"]}>
                      {t((m) => m.sections.legal.acknowledgements.licenses.packages, {count: gplCount})}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className={styles["progressBar"]}>
                  <motion.div
                    className={styles["progressFillGpl"]}
                    initial={{width: 0}}
                    animate={isInView ? {width: `${gplPercentage}%`} : {}}
                    transition={{delay: 0.6, duration: 1, ease: "easeOut"}}
                  />
                </div>

                <div className={styles["cardFooter"]}>
                  <span className={styles["description"]}>{t((m) => m.sections.legal.acknowledgements.licenses.gplDescription)}</span>
                  <span className={styles["percentage"]}>{gplPercentage}%</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Other Licenses */}
          <motion.div
            initial={{opacity: 0, x: 30}}
            animate={isInView ? {opacity: 1, x: 0} : {}}
            transition={{delay: 0.4, duration: 0.5}}>
            <Card className={styles["licenseCard"]}>
              <CardContent className={styles["cardContent"]}>
                <div className={styles["cardHeader"]}>
                  <div className={styles["iconWrapper"]}>
                    <TbInfoCircle className={styles["icon"]} />
                  </div>
                  <div className={styles["licenseInfo"]}>
                    <h3 className={styles["licenseName"]}>{t((m) => m.sections.legal.acknowledgements.licenses.other)}</h3>
                    <p className={styles["packageCount"]}>
                      {t((m) => m.sections.legal.acknowledgements.licenses.packages, {count: otherCount})}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className={styles["progressBar"]}>
                  <motion.div
                    className={styles["progressFillOther"]}
                    initial={{width: 0}}
                    animate={isInView ? {width: `${otherPercentage}%`} : {}}
                    transition={{delay: 0.7, duration: 1, ease: "easeOut"}}
                  />
                </div>

                <div className={styles["cardFooter"]}>
                  <span className={styles["description"]}>{t((m) => m.sections.legal.acknowledgements.licenses.otherDescription)}</span>
                  <span className={styles["percentage"]}>{otherPercentage}%</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

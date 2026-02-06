"use client";

import {Badge} from "@arolariu/components/badge";
import {Button} from "@arolariu/components/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@arolariu/components/card";
import {AnimatePresence, motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import Link from "next/link";
import {useRef, useState} from "react";
import {
  TbArrowRight,
  TbBrain,
  TbChartBar,
  TbCurrencyDollar,
  TbFileInvoice,
  TbLanguage,
  TbLock,
  TbReceipt,
  TbShieldCheck,
  TbToolsKitchen2,
} from "react-icons/tb";
import styles from "./Features.module.scss";

interface FeatureConfig {
  id: string;
  icon: React.ComponentType<{className?: string}>;
  colorKey: "blue" | "purple" | "green" | "orange" | "pink" | "cyan" | "red" | "indigo" | "amber";
  link: string;
}

// Color class maps for SCSS
const colorClassMap = {
  blue: "colorBlue",
  purple: "colorPurple",
  green: "colorGreen",
  orange: "colorOrange",
  pink: "colorPink",
  cyan: "colorCyan",
  red: "colorRed",
  indigo: "colorIndigo",
  amber: "colorAmber",
} as const;

const gradientClassMap = {
  blue: "gradientBlue",
  purple: "gradientPurple",
  green: "gradientGreen",
  orange: "gradientOrange",
  pink: "gradientPink",
  cyan: "gradientCyan",
  red: "gradientRed",
  indigo: "gradientIndigo",
  amber: "gradientAmber",
} as const;

const featureConfigs: FeatureConfig[] = [
  {id: "invoices", icon: TbFileInvoice, colorKey: "blue", link: "/domains/invoices"},
  {id: "merchants", icon: TbReceipt, colorKey: "purple", link: "/domains/invoices/view-merchants"},
  {id: "budgets", icon: TbCurrencyDollar, colorKey: "green", link: "/domains/invoices"},
  {id: "analytics", icon: TbChartBar, colorKey: "orange", link: "/domains/invoices"},
  {id: "recipes", icon: TbToolsKitchen2, colorKey: "pink", link: "/domains/recipes"},
  {id: "ai", icon: TbBrain, colorKey: "cyan", link: "/domains"},
  {id: "security", icon: TbShieldCheck, colorKey: "red", link: "/about/the-platform"},
  {id: "i18n", icon: TbLanguage, colorKey: "indigo", link: "/about/the-platform"},
  {id: "auth", icon: TbLock, colorKey: "amber", link: "/auth/sign-in"},
];

/**
 * Features component displaying the platform's main capabilities.
 * Features interactive cards with hover effects and detailed descriptions.
 * @returns The Features component, CSR'ed.
 */
export default function Features(): React.JSX.Element {
  const t = useTranslations("About.Platform.features");
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, {once: true, margin: "-100px"});
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<FeatureConfig | null>(null);

  return (
    <section
      ref={ref}
      className={styles["section"]}>
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

        {/* Features Grid */}
        <div className={styles["grid"]}>
          {featureConfigs.map((feature, index) => (
            <motion.div
              key={feature.id}
              initial={{opacity: 0, y: 30}}
              animate={isInView ? {opacity: 1, y: 0} : {}}
              transition={{duration: 0.5, delay: index * 0.1}}
              // eslint-disable-next-line react/jsx-no-bind -- simple page
              onHoverStart={() => setHoveredFeature(feature.id)}
              // eslint-disable-next-line react/jsx-no-bind -- simple page
              onHoverEnd={() => setHoveredFeature(null)}
              // eslint-disable-next-line react/jsx-no-bind -- simple page
              onClick={() => setSelectedFeature(feature)}>
              <Card className={hoveredFeature === feature.id ? styles["cardActive"] : index === 0 ? styles["cardHero"] : styles["card"]}>
                {/* Gradient background on hover */}
                <motion.div
                  className={`${styles["cardGradient"]} ${styles[gradientClassMap[feature.colorKey]]}`}
                  animate={{opacity: hoveredFeature === feature.id ? 1 : 0}}
                />

                <CardHeader className={styles["cardHeader"]}>
                  <div className={styles["cardHeaderInner"]}>
                    <motion.div
                      className={`${styles["iconWrapper"]} ${styles[gradientClassMap[feature.colorKey]]}`}
                      animate={{
                        scale: hoveredFeature === feature.id ? 1.1 : 1,
                        rotate: hoveredFeature === feature.id ? 5 : 0,
                      }}
                      transition={{duration: 0.3}}>
                      <feature.icon className={`${styles["icon"]} ${styles[colorClassMap[feature.colorKey]]}`} />
                    </motion.div>
                    <motion.div
                      animate={{
                        x: hoveredFeature === feature.id ? 0 : 10,
                        opacity: hoveredFeature === feature.id ? 1 : 0,
                      }}
                      transition={{duration: 0.3}}>
                      <TbArrowRight className={`${styles["arrowIcon"]} ${styles[colorClassMap[feature.colorKey]]}`} />
                    </motion.div>
                  </div>
                  <CardTitle className={styles["cardTitle"]}>{t(`items.${feature.id}.title` as Parameters<typeof t>[0])}</CardTitle>
                  <CardDescription className={styles["cardDescription"]}>
                    {t(`items.${feature.id}.description` as Parameters<typeof t>[0])}
                  </CardDescription>
                </CardHeader>

                <CardContent className={styles["cardContent"]}>
                  <div className={styles["tags"]}>
                    {t(`items.${feature.id}.tags` as Parameters<typeof t>[0])
                      .split(",")
                      .map((tag) => (
                        <Badge
                          key={tag}
                          variant='secondary'
                          className={styles["tag"]}>
                          {tag}
                        </Badge>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Feature Detail Modal */}
      <AnimatePresence>
        {selectedFeature !== null && (
          <motion.div
            className={styles["modal"]}
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            // eslint-disable-next-line react/jsx-no-bind -- simple modal
            onClick={() => setSelectedFeature(null)}>
            <motion.div
              className={styles["modalContent"]}
              initial={{scale: 0.9, y: 20}}
              animate={{scale: 1, y: 0}}
              exit={{scale: 0.9, y: 20}}
              // eslint-disable-next-line react/jsx-no-bind -- simple modal
              onClick={(e) => e.stopPropagation()}>
              <div className={styles["modalHeader"]}>
                <div className={`${styles["modalIconWrapper"]} ${styles[gradientClassMap[selectedFeature.colorKey]]}`}>
                  <selectedFeature.icon className={`${styles["modalIcon"]} ${styles[colorClassMap[selectedFeature.colorKey]]}`} />
                </div>
                <div>
                  <h3 className={styles["modalTitle"]}>{t(`items.${selectedFeature.id}.title` as Parameters<typeof t>[0])}</h3>
                  <p className={styles["modalSubtitle"]}>{t(`items.${selectedFeature.id}.description` as Parameters<typeof t>[0])}</p>
                </div>
              </div>

              <p className={styles["modalDescription"]}>{t(`items.${selectedFeature.id}.longDescription` as Parameters<typeof t>[0])}</p>

              <div className={styles["modalTags"]}>
                {t(`items.${selectedFeature.id}.tags` as Parameters<typeof t>[0])
                  .split(",")
                  .map((tag) => (
                    <Badge
                      key={tag}
                      variant='secondary'>
                      {tag}
                    </Badge>
                  ))}
              </div>

              <div className={styles["modalActions"]}>
                <Link
                  href={selectedFeature.link}
                  className={`${styles["modalLink"]} ${styles[gradientClassMap[selectedFeature.colorKey]]}`}>
                  {t("modal.exploreFeature")}
                  <TbArrowRight className={styles["modalLinkIcon"]} />
                </Link>
                <Button
                  variant='ghost'
                  // eslint-disable-next-line react/jsx-no-bind -- simple modal close
                  onClick={() => setSelectedFeature(null)}
                  className={styles["modalClose"]}>
                  {t("modal.close")}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

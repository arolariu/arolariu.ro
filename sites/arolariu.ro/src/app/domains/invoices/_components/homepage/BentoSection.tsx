"use client";

import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import Link from "next/link";
import {useRef} from "react";
import {TbBrain, TbChartPie, TbCloud, TbDeviceMobile, TbLock, TbReceipt, TbShare} from "react-icons/tb";
import styles from "./BentoSection.module.scss";

const bentoItemsConfig = [
  {
    key: "ai",
    icon: TbBrain,
    gradientKey: "gradientPurple",
    spanKey: "spanWide",
    href: "/domains/invoices/upload-scans",
    tooltip: "Start AI-powered invoice analysis from upload",
  },
  {
    key: "analyticsCard",
    icon: TbChartPie,
    gradientKey: "gradientEmerald",
    spanKey: "spanNormal",
    href: "/domains/invoices/view-invoices?view=statistics",
    tooltip: "View detailed invoice analytics and statistics",
  },
  {
    key: "cloud",
    icon: TbCloud,
    gradientKey: "gradientBlue",
    spanKey: "spanTall",
    href: "/domains/invoices/view-scans",
    tooltip: "Browse cloud-synced scans",
  },
  {
    key: "ocr",
    icon: TbReceipt,
    gradientKey: "gradientOrange",
    spanKey: "spanNormal",
    href: "/domains/invoices/upload-scans",
    tooltip: "Upload scans for OCR processing",
  },
  {
    key: "secure",
    icon: TbLock,
    gradientKey: "gradientSlate",
    spanKey: "spanNormal",
    href: null,
    tooltip: "Learn about our security features",
  },
  {
    key: "share",
    icon: TbShare,
    gradientKey: "gradientPink",
    spanKey: "spanNormal",
    href: "/domains/invoices/view-invoices",
    tooltip: "Share invoices with others",
  },
] as const;

type BentoKey = (typeof bentoItemsConfig)[number]["key"];

type BentoTranslations = Readonly<{
  title: string;
  description: string;
  mobile: string;
  items: Record<BentoKey, {title: string; description: string}>;
}>;

/**
 * Renders the capabilities bento grid section.
 *
 * @returns The bento section.
 */
export default function BentoSection(): React.JSX.Element {
  const t = useTranslations("Invoices.Homepage");
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, {once: true, margin: "-100px"});
  const translations: BentoTranslations = {
    title: t("bento.title"),
    description: t("bento.description"),
    mobile: t("bento.mobile"),
    items: {
      ai: {title: t("bento.ai.title"), description: t("bento.ai.description")},
      analyticsCard: {title: t("bento.analyticsCard.title"), description: t("bento.analyticsCard.description")},
      cloud: {title: t("bento.cloud.title"), description: t("bento.cloud.description")},
      ocr: {title: t("bento.ocr.title"), description: t("bento.ocr.description")},
      secure: {title: t("bento.secure.title"), description: t("bento.secure.description")},
      share: {title: t("bento.share.title"), description: t("bento.share.description")},
    },
  };

  return (
    <section
      ref={sectionRef}
      className={styles["bentoSection"]}>
      <div className={styles["bentoContainer"]}>
        <motion.div
          className={styles["sectionHeader"]}
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{duration: 0.5}}>
          <h2 className={styles["sectionTitle"]}>{translations.title}</h2>
          <p className={styles["sectionDescription"]}>{translations.description}</p>
        </motion.div>

        <TooltipProvider>
          <div className={styles["bentoGrid"]}>
            {bentoItemsConfig.map((item, index) => {
              const Icon = item.icon;
              const cardContent = (
                <>
                  <div className={styles["shimmerOverlay"]} />

                  <motion.div
                    className={styles["particleTopRight"]}
                    animate={{y: [0, -8, 0], opacity: [0.3, 0.6, 0.3]}}
                    transition={{duration: 3, repeat: Infinity, delay: index * 0.2}}
                  />
                  <motion.div
                    className={styles["particleBottomLeft"]}
                    animate={{y: [0, -6, 0], opacity: [0.2, 0.5, 0.2]}}
                    transition={{duration: 2.5, repeat: Infinity, delay: index * 0.3}}
                  />

                  <div className={styles["bentoContent"]}>
                    <motion.div
                      whileHover={{scale: 1.1, rotate: 5}}
                      transition={{duration: 0.3}}>
                      <Icon className={styles["bentoIcon"]} />
                    </motion.div>
                    <div>
                      <h3 className={styles["bentoItemTitle"]}>{translations.items[item.key].title}</h3>
                      <p className={styles["bentoItemDescription"]}>{translations.items[item.key].description}</p>
                    </div>
                  </div>
                </>
              );

              const cardMotion = (
                <motion.div
                  key={item.key}
                  className={`${styles["bentoItem"]} ${styles[item.gradientKey]} ${styles[item.spanKey]} ${item.href ? styles["bentoItemClickable"] : ""}`}
                  initial={{opacity: 0, y: 30, scale: 0.95}}
                  animate={isInView ? {opacity: 1, y: 0, scale: 1} : {}}
                  transition={{delay: 0.1 + index * 0.08, duration: 0.5, ease: "easeOut"}}
                  whileHover={item.href ? {scale: 1.02} : {}}>
                  {cardContent}
                </motion.div>
              );

              if (item.href) {
                return (
                  <Tooltip key={item.key}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={styles["bentoLink"]}>
                        {cardMotion}
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{item.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return cardMotion;
            })}
          </div>
        </TooltipProvider>

        <motion.div
          className={styles["mobileNote"]}
          initial={{opacity: 0}}
          animate={isInView ? {opacity: 1} : {}}
          transition={{delay: 0.8, duration: 0.5}}>
          <TbDeviceMobile className={styles["mobileIcon"]} />
          <span className={styles["mobileText"]}>{translations.mobile}</span>
        </motion.div>
      </div>
    </section>
  );
}

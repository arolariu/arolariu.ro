"use client";

import {Button} from "@arolariu/components";
import {motion, useInView} from "motion/react";
import {useTranslations} from "next-intl";
import Link from "next/link";
import {useRef} from "react";
import {TbArrowRight, TbBrain, TbCloud, TbLock, TbSparkles, TbUpload} from "react-icons/tb";
import styles from "./EnhancedCTASection.module.scss";

type CtaTranslations = Readonly<{
  title: string;
  description: string;
  uploadButton: string;
  learnMore: string;
  badges: {secure: string; cloud: string; ai: string};
}>;

/**
 * Renders the call-to-action section for invoices.
 *
 * @returns The CTA section.
 */
export default function EnhancedCTASection(): React.JSX.Element {
  const t = useTranslations("Invoices.Homepage");
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, {once: true, margin: "-50px"});
  const translations: CtaTranslations = {
    title: t("cta.title"),
    description: t("cta.description"),
    uploadButton: t("cta.uploadButton"),
    learnMore: t("cta.learnMore"),
    badges: {
      secure: t("cta.badges.secure"),
      cloud: t("cta.badges.cloud"),
      ai: t("cta.badges.ai"),
    },
  };

  return (
    <section
      ref={sectionRef}
      className={styles["ctaSection"]}>
      <div className={styles["ctaBackground"]}>
        <motion.div
          className={styles["orbTopLeft"]}
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{duration: 8, repeat: Infinity, ease: "easeInOut"}}
        />
        <motion.div
          className={styles["orbBottomRight"]}
          animate={{
            x: [0, -20, 0],
            y: [0, 20, 0],
            scale: [1.2, 1, 1.2],
          }}
          transition={{duration: 10, repeat: Infinity, ease: "easeInOut"}}
        />
        <motion.div
          className={styles["orbCenter"]}
          animate={{scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3]}}
          transition={{duration: 6, repeat: Infinity, ease: "easeInOut"}}
        />
      </div>

      <div className={styles["ctaContent"]}>
        <motion.div
          className={styles["ctaSparkle"]}
          initial={{opacity: 0, scale: 0}}
          animate={isInView ? {opacity: 1, scale: 1} : {}}
          transition={{duration: 0.5, type: "spring"}}>
          <motion.div
            animate={{rotate: [0, 10, -10, 0]}}
            transition={{duration: 2, repeat: Infinity, ease: "easeInOut"}}>
            <TbSparkles className={styles["sparklesIcon"]} />
          </motion.div>
        </motion.div>

        <motion.h2
          className={styles["ctaTitle"]}
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{delay: 0.1, duration: 0.5}}>
          {translations.title}
        </motion.h2>

        <motion.p
          className={styles["ctaDescription"]}
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{delay: 0.2, duration: 0.5}}>
          {translations.description}
        </motion.p>

        <motion.div
          className={styles["ctaButtons"]}
          initial={{opacity: 0, y: 20}}
          animate={isInView ? {opacity: 1, y: 0} : {}}
          transition={{delay: 0.3, duration: 0.5}}>
          <Button
            asChild
            size='lg'
            className={`group ${styles["ctaPrimaryBtn"]}`}>
            <Link href='/domains/invoices/upload-scans'>
              <TbUpload className={styles["ctaUploadIcon"]} />
              {translations.uploadButton}
            </Link>
          </Button>
          <Button
            asChild
            size='lg'
            variant='outline'
            className={styles["ctaSecondaryBtn"]}>
            <Link href='/about/the-platform'>
              {translations.learnMore}
              <TbArrowRight className={styles["ctaArrowIcon"]} />
            </Link>
          </Button>
        </motion.div>

        <motion.div
          className={styles["ctaBadges"]}
          initial={{opacity: 0}}
          animate={isInView ? {opacity: 1} : {}}
          transition={{delay: 0.5, duration: 0.5}}>
          <div className={styles["ctaBadge"]}>
            <TbLock className={styles["badgeIcon"]} />
            <span>{translations.badges.secure}</span>
          </div>
          <div className={styles["ctaBadge"]}>
            <TbCloud className={styles["badgeIcon"]} />
            <span>{translations.badges.cloud}</span>
          </div>
          <div className={styles["ctaBadge"]}>
            <TbBrain className={styles["badgeIcon"]} />
            <span>{translations.badges.ai}</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

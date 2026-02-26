"use client";

import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import Image from "next/image";
import {TbChartBar, TbFileInvoice, TbPhoto} from "react-icons/tb";
import FeatureItem from "./FeatureItem";
import styles from "./FeaturesSection.module.scss";

interface Props {
  isAuthenticated: boolean;
}

/**
 * Renders the features section of the invoices homepage.
 *
 * @param props - Component props.
 * @returns The features section.
 */
export default function FeaturesSection({isAuthenticated}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations("Invoices.Homepage");

  return (
    <section className={styles["featuresSection"]}>
      <div className={styles["featuresContainer"]}>
        <div className={styles["featuresFlex"]}>
          <motion.div
            className={styles["featuresImageWrapper"]}
            initial={{opacity: 0, x: -20}}
            animate={{opacity: 1, x: 0}}
            transition={{duration: 0.6}}>
            <Image
              src='/images/domains/invoices/invoice-bottom.svg'
              alt={t("features.imageAlt")}
              width={500}
              height={500}
              className={styles["featuresImage"]}
            />
          </motion.div>

          <motion.div
            className={styles["featuresContent"]}
            initial={{opacity: 0, x: 20}}
            animate={{opacity: 1, x: 0}}
            transition={{duration: 0.6, delay: 0.2}}>
            <div className={styles["featuresHeader"]}>
              <h2 className={styles["sectionTitle"]}>{t("features.title")}</h2>
              <p className={styles["sectionDescription"]}>{t("features.description")}</p>
            </div>

            <div className={styles["featuresList"]}>
              <FeatureItem
                icon={TbPhoto}
                title={t("features.ocr.title")}
                description={t("features.ocr.description")}
              />
              <FeatureItem
                icon={TbChartBar}
                title={t("features.analytics.title")}
                description={t("features.analytics.description")}
              />
              <FeatureItem
                icon={TbFileInvoice}
                title={t("features.batch.title")}
                description={t("features.batch.description")}
              />
            </div>

            {!isAuthenticated && (
              <div className={styles["signInPrompt"]}>
                <p className={styles["signInPromptText"]}>
                  <strong>{t("features.signIn")}</strong> {t("features.signInPrompt")}
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

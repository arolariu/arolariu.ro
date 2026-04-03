"use client";

import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import {TbEye, TbFileInvoice, TbUpload} from "react-icons/tb";
import WorkflowCard from "./WorkflowCard";
import styles from "./WorkflowSection.module.scss";

/**
 * Renders the 3-step workflow section for invoice management.
 *
 * @returns The workflow section.
 */
export default function WorkflowSection(): React.JSX.Element {
  const t = useTranslations("IMS--Landing");

  return (
    <section className={styles["workflowSection"]}>
      <div className={styles["workflowContainer"]}>
        <motion.div
          className={styles["workflowHeader"]}
          initial={{opacity: 0, y: 20}}
          animate={{opacity: 1, y: 0}}
          transition={{duration: 0.5}}>
          <h2 className={styles["sectionTitle"]}>{t("workflow.title")}</h2>
          <p className={styles["sectionDescription"]}>{t("workflow.description")}</p>
        </motion.div>

        <div className={styles["workflowGrid"]}>
          <WorkflowCard
            step={1}
            title={t("workflow.step1.title")}
            description={t("workflow.step1.description")}
            icon={TbUpload}
            href='/domains/invoices/upload-scans'
            buttonText={t("workflow.step1.button")}
            delay={0.1}
          />
          <WorkflowCard
            step={2}
            title={t("workflow.step2.title")}
            description={t("workflow.step2.description")}
            icon={TbEye}
            href='/domains/invoices/view-scans'
            buttonText={t("workflow.step2.button")}
            delay={0.2}
          />
          <WorkflowCard
            step={3}
            title={t("workflow.step3.title")}
            description={t("workflow.step3.description")}
            icon={TbFileInvoice}
            href='/domains/invoices/view-invoices'
            buttonText={t("workflow.step3.button")}
            delay={0.3}
          />
        </div>
      </div>
    </section>
  );
}

"use client";

import type {Invoice} from "@/types/invoices";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import {LocalInvoiceAssistantPanel} from "../../../_components/ai/LocalInvoiceAssistantPanel";
import styles from "./GenerativeView.module.scss";

type Props = Readonly<{
  invoices: ReadonlyArray<Invoice>;
}>;

/**
 * This function renders the generative view for invoice analysis.
 * It allows users to chat with an AI assistant to analyze invoices and get insights.
 * @returns This function renders the generative view for invoice analysis.
 */
export default function RenderGenerativeView({invoices}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations("IMS--List.generativeView");

  return (
    <motion.div
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      transition={{duration: 0.5}}
      className={styles["container"]}>
      <div className={styles["header"]}>
        <div>
          <h2 className={styles["title"]}>{t("title")}</h2>
          <p className={styles["subtitle"]}>{t("subtitle")}</p>
        </div>
      </div>

      <LocalInvoiceAssistantPanel invoices={invoices} />
    </motion.div>
  );
}

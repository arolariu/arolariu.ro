/**
 * @fileoverview Generative AI view for invoice analysis.
 *
 * Renders the local invoice AI assistant panel in the invoice list view
 * generative tab.
 *
 * @module app/domains/invoices/view-invoices/_components/views/GenerativeView
 */

"use client";

import type {Invoice} from "@/types/invoices";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import {LocalInvoiceAssistantPanel} from "../../../_components/ai/LocalInvoiceAssistantPanel";
import styles from "./GenerativeView.module.scss";

/**
 * Props for RenderGenerativeView component.
 */
type Props = Readonly<{
  /** Full invoice list for AI context. */
  invoices: ReadonlyArray<Invoice>;
}>;

/**
 * Generative AI view for invoice analysis and chat.
 *
 * @param props - Invoice list for AI assistant context.
 * @returns Animated view with local invoice assistant panel.
 *
 * @remarks
 * Renders the local-only AI assistant with multi-invoice context
 * for spend analysis, merchant insights, and invoice Q&A.
 *
 * **Scope:** All invoices in list (no single-invoice filter).
 * **Privacy:** All processing client-side, no server requests.
 *
 * @example
 * ```tsx
 * <RenderGenerativeView invoices={allInvoices} />
 * ```
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

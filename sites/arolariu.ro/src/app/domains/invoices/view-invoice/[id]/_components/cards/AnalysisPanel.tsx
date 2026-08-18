"use client";

/**
 * @fileoverview Honest asynchronous invoice analysis panel.
 * @module app/domains/invoices/view-invoice/[id]/_components/cards/AnalysisPanel
 */

import {InvoiceAnalysisForm} from "@/app/domains/invoices/_components/analysis/InvoiceAnalysisForm";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {TbSparkles} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";
import styles from "./AnalysisPanel.module.scss";

/**
 * Renders invoice analysis controls with acknowledgement-only status.
 *
 * @remarks
 * This panel submits a durable queue request and schedules a single hard reload
 * after acceptance. It intentionally does not infer worker stages, completion,
 * elapsed time, or percentage progress.
 *
 * @returns Client-rendered invoice analysis panel.
 */
export function AnalysisPanel(): React.JSX.Element {
  const t = useTranslations();
  const {invoice} = useInvoiceContext();

  return (
    <Card className={styles["card"]}>
      <CardHeader className={styles["header"]}>
        <div className={styles["titleRow"]}>
          <TbSparkles
            aria-hidden='true'
            className={styles["sparklesIcon"]}
          />
          <div className={styles["headingContent"]}>
            <CardTitle>{t((messages) => messages.forms.invoices.analysis.panel.title)}</CardTitle>
            <CardDescription>{t((messages) => messages.forms.invoices.analysis.panel.description)}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className={styles["content"]}>
        <InvoiceAnalysisForm
          invoiceIdentifier={invoice.id}
          refreshAfterAcceptance
        />
      </CardContent>
    </Card>
  );
}

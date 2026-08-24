"use client";

/**
 * @fileoverview Analysis control panel for triggering invoice re-analysis.
 * @module app/domains/invoices/view-invoice/[id]/_components/cards/AnalysisPanel
 *
 * @remarks
 * The backend analysis pipeline is **asynchronous**. A successful submit returns
 * `202 Accepted` with a queue message id. There is no completion signal.
 * This panel shows exactly four states: idle, submitting, queued, and error.
 * It never implies analysis has finished.
 *
 * **Rendering Context**: Client Component (`"use client"` directive).
 */

import InvoiceAnalysisControls from "../../../../_components/analysis/InvoiceAnalysisControls";
import QueuedAnalysisNotice from "../../../../_components/analysis/QueuedAnalysisNotice";
import {useAnalysisSubmission} from "../../../../_hooks/analysis/useAnalysisSubmission";
import {buildInvoiceAnalysisRequest, resolveInvoiceCapabilities} from "@/types/invoices/Analysis";
import type {AnalysisProfile, InvoiceAnalysisCapabilities} from "@/types/invoices/Analysis";
import {ClassificationOrigin} from "@/types/invoices/Classification";
import {formatDate} from "@/lib/utils.generic";
import {Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Spinner} from "@arolariu/components";
import {useLocale} from "next-intl";
import {useTranslations} from "next-intl-selector";
import {useCallback, useState} from "react";
import {TbBolt, TbClock, TbRefresh, TbSparkles} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";
import styles from "./AnalysisPanel.module.scss";

/**
 * Analysis control panel for triggering invoice re-analysis.
 *
 * @remarks
 * Renders only when `invoice.items` is empty. Once items appear (after RSC
 * refresh picks up backend-processed data), the panel hides itself.
 *
 * **Decision D4**: `manualClassificationPresent` prevents silently overwriting a
 * user's manual classification — InvoiceAnalysisControls surfaces a warning when
 * the user enables `invoiceClassification` in that case.
 *
 * @returns The AnalysisPanel card, or `null` when the invoice already has items.
 */
export function AnalysisPanel(): React.JSX.Element | null {
  const t = useTranslations();
  const locale = useLocale();
  const {invoice} = useInvoiceContext();

  const [profile, setProfile] = useState<AnalysisProfile>("comprehensive");
  const [capabilities, setCapabilities] = useState<InvoiceAnalysisCapabilities>(
    resolveInvoiceCapabilities("comprehensive"),
  );

  const {status, messageId, errorMessage, submit, refreshNow} = useAnalysisSubmission({
    target: "invoice",
    identifier: invoice.id,
    scheduleRefresh: true,
  });

  const manualClassificationPresent =
    invoice.classification?.origin === ClassificationOrigin.Manual;

  const handleChange = useCallback(
    (newProfile: AnalysisProfile, newCapabilities: InvoiceAnalysisCapabilities): void => {
      setProfile(newProfile);
      setCapabilities(newCapabilities);
    },
    [],
  );

  const handleSubmit = useCallback(async (): Promise<void> => {
    await submit(buildInvoiceAnalysisRequest(profile, capabilities));
  }, [profile, capabilities, submit]);

  // Panel is only relevant when the invoice has not yet been analysed (no items).
  if (invoice.items.length > 0) return null;

  return (
    <Card className={styles["card"]}>
      <CardHeader className={styles["header"]}>
        <div className={styles["headerContent"]}>
          <div className={styles["titleRow"]}>
            <TbSparkles className={styles["sparklesIcon"]} />
            <CardTitle className={styles["title"]}>
              {t((m) => m.pages.invoices.viewInvoice.analysisPanel.title)}
            </CardTitle>
          </div>
          <CardDescription className={styles["description"]}>
            {t((m) => m.pages.invoices.viewInvoice.analysisPanel.description)}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className={styles["content"]}>
        {status === "queued" ? (
          <QueuedAnalysisNotice messageId={messageId} onRefresh={refreshNow} />
        ) : (
          <div className={styles["idleState"]}>
            {invoice.lastUpdatedAt !== null && invoice.lastUpdatedAt !== undefined ? (
              <div className={styles["lastAnalyzed"]}>
                <div className={styles["infoRow"]}>
                  <TbClock className={styles["infoIcon"]} />
                  <span className={styles["infoLabel"]}>
                    {t((m) => m.pages.invoices.viewInvoice.analysisPanel.labels.lastAnalyzed)}
                  </span>
                </div>
                <p className={styles["infoValue"]}>
                  {formatDate(invoice.lastUpdatedAt, {locale, dateStyle: "medium", timeStyle: "short"})}
                </p>
                {typeof invoice.numberOfUpdates === "number" && invoice.numberOfUpdates > 0 && (
                  <div className={styles["updatesBadge"]}>
                    <Badge variant="outline">
                      {t((m) => m.pages.invoices.viewInvoice.analysisPanel.labels.updates, {
                        count: invoice.numberOfUpdates,
                      })}
                    </Badge>
                  </div>
                )}
              </div>
            ) : null}

            <InvoiceAnalysisControls
              profile={profile}
              value={capabilities}
              manualClassificationPresent={manualClassificationPresent}
              onChange={handleChange}
              disabled={status === "submitting"}
            />

            {status === "error" && (
              <div role="alert" className={styles["errorAlert"]}>
                {errorMessage ?? t((m) => m.dialogs.invoices.analyzeDialog.errors.genericError)}
              </div>
            )}

            <div className={styles["quickAction"]}>
              <Button
                onClick={handleSubmit}
                disabled={status === "submitting"}
                className={styles["primaryButton"]}
                variant="default"
                size="default">
                {status === "submitting" ? (
                  <>
                    <Spinner className={styles["buttonIcon"]} />
                    {t((m) => m.pages.invoices.viewInvoice.analysisPanel.labels.submitting)}
                  </>
                ) : (
                  <>
                    <TbRefresh className={styles["buttonIcon"]} />
                    {t((m) => m.pages.invoices.viewInvoice.analysisPanel.buttons.reanalyze)}
                  </>
                )}
              </Button>
            </div>

            <div className={styles["tip"]}>
              <TbBolt className={styles["tipIcon"]} />
              <p className={styles["tipText"]}>
                {t((m) => m.pages.invoices.viewInvoice.analysisPanel.tip)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

/**
 * @fileoverview AssistantPanel — composes input + history + Layer 2 CTA + state UI.
 * @module app/domains/invoices/_components/ai/AssistantPanel
 *
 * @remarks
 * Renders all 10+ assistant states with role/aria-live attributes; aria-busy
 * on input during pending; chip clicks re-submit canonical queries; Layer 2
 * opt-in CTA in header with download progress + active badge.
 */

import {Alert, AlertDescription, AlertTitle, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle} from "@arolariu/components";
import {useLocale, useTranslations} from "next-intl";
import {useState} from "react";
import {AssistantMessage} from "./AssistantMessage";
import {useInvoiceAssistant} from "./useInvoiceAssistant";
import type {AssistantLocale} from "./types";

export type AssistantPanelProps = Readonly<Record<string, never>>;

const EXAMPLE_CHIPS_KEYS = [
  "topMerchantsThisMonth",
  "totalGrocerySpendLastMonth",
  "topCategoriesLastQuarter",
  "averageBasketSize",
  "monthVsLastMonth",
  "topProducts",
] as const;

export function AssistantPanel(_props?: AssistantPanelProps): React.JSX.Element {
  const t = useTranslations();
  const locale = (useLocale() as AssistantLocale) ?? "en";

  const {state, submitQuestion, enableLayer2, resetConversation} = useInvoiceAssistant({
    locale,
    t: (key: string, params?: Record<string, unknown>) => t(key as never, params as never),
  });

  const [draft, setDraft] = useState("");

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!draft.trim()) return;
    await submitQuestion(draft);
    setDraft("");
  };

  const onChip = async (chipKey: string): Promise<void> => {
    const exampleQuestion = t(`InvoiceAssistant.exampleChips.${chipKey}` as never);
    setDraft(exampleQuestion);
    await submitQuestion(exampleQuestion);
    setDraft("");
  };

  if (state.status === "workers-unavailable") {
    return (
      <Alert role="alert">
        <AlertTitle>{t("InvoiceAssistant.states.workersUnavailable" as never)}</AlertTitle>
      </Alert>
    );
  }

  if (state.status === "capability-check") {
    return (
      <div role="status" aria-live="polite">
        {t("InvoiceAssistant.states.capabilityCheck" as never)}
      </div>
    );
  }

  if (state.status === "embedding-loading") {
    return (
      <Card>
        <CardContent className="space-y-2 p-4">
          <div role="status" aria-live="polite">
            {t("InvoiceAssistant.states.embeddingLoading" as never, {progress: state.progress})}
          </div>
          <div className="h-2 rounded-md bg-muted">
            <div className="h-full rounded-md bg-primary" style={{width: `${state.progress}%`}} />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state.status === "embedding-failed") {
    return (
      <Alert role="alert" variant="destructive">
        <AlertTitle>{t("InvoiceAssistant.states.embeddingFailed" as never)}</AlertTitle>
        <AlertDescription>
          <Button onClick={resetConversation}>{t("InvoiceAssistant.actions.retry" as never)}</Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card data-testid="invoice-assistant-panel" className="space-y-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("InvoiceAssistant.panel.title" as never)}</CardTitle>
            <CardDescription>{t("InvoiceAssistant.panel.subtitle" as never)}</CardDescription>
          </div>
          {state.layer2.status === "eligible" && (
            <Button data-testid="enable-layer2" variant="outline" onClick={() => void enableLayer2()}>
              {t("InvoiceAssistant.layer2.ctaButton" as never)}
            </Button>
          )}
          {state.layer2.status === "ready" && <Badge data-testid="layer2-active">{t("InvoiceAssistant.layer2.ready" as never)}</Badge>}
          {state.layer2.status === "downloading" && (
            <span role="status" aria-live="polite">
              {t("InvoiceAssistant.layer2.downloading" as never, {progress: state.layer2.progress})}
            </span>
          )}
          {state.layer2.status === "ineligible" && (
            <Badge
              variant="outline"
              title={t("InvoiceAssistant.layer2.unavailableTooltip" as never)}
              aria-label={t("InvoiceAssistant.layer2.unavailableTooltip" as never)}
            >
              i
            </Badge>
          )}
          {state.layer2.status === "failed" && (
            <Badge variant="destructive" data-testid="layer2-failed">
              {t("InvoiceAssistant.layer2.failed" as never)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            data-testid="assistant-input"
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("InvoiceAssistant.panel.inputPlaceholder" as never)}
            className="flex-1 rounded-md border px-3 py-2"
            disabled={state.status === "classifying" || state.status === "slot-extracting"}
            aria-busy={state.status === "classifying" || state.status === "slot-extracting"}
          />
          <Button type="submit" disabled={!draft.trim() || state.status === "classifying"}>
            {t("InvoiceAssistant.panel.submit" as never)}
          </Button>
        </form>

        {(state.status === "classifying" || state.status === "slot-extracting") && (
          <Alert>
            <AlertDescription role="status" aria-live="polite">
              {t(`InvoiceAssistant.states.${state.status === "classifying" ? "classifying" : "slotExtracting"}` as never)}
            </AlertDescription>
          </Alert>
        )}

        {state.status === "aggregator-error" && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{t("InvoiceAssistant.states.aggregatorError" as never)}</AlertDescription>
          </Alert>
        )}

        {(state.status === "embedding-ready" || state.status === "out-of-scope" || state.status === "answered") && (
          <div className="flex flex-wrap gap-2" data-testid="example-chips">
            {state.status === "out-of-scope" && (
              <p className="w-full text-sm" role="status" aria-live="polite">
                {t("InvoiceAssistant.states.outOfScope" as never)}
              </p>
            )}
            {EXAMPLE_CHIPS_KEYS.map((key) => (
              <Button key={key} variant="outline" size="sm" onClick={() => void onChip(key)}>
                {t(`InvoiceAssistant.exampleChips.${key}` as never)}
              </Button>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {state.history.map((entry, i) => (
            <AssistantMessage
              key={`${i}-${entry.question}`}
              question={entry.question}
              prose={entry.prose}
              viz={entry.viz}
              payload={entry.payload}
            />
          ))}
        </div>

        {state.history.length > 0 && (
          <Button variant="outline" size="sm" onClick={resetConversation}>
            {t("InvoiceAssistant.actions.reset" as never)}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
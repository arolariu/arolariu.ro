"use client";

import type {Invoice} from "@/types/invoices";
import {Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Label, Progress, Textarea} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {useCallback, useState} from "react";
import type {HardwareEligibilityResult} from "./hardwareEligibility";
import styles from "./LocalInvoiceAssistantPanel.module.scss";
import {useLocalInvoiceAssistant} from "./useLocalInvoiceAssistant";
import type {LocalInvoiceAssistantAdapter} from "./webLlmAdapter";

type LocalInvoiceAssistantPanelProps = Readonly<{
  activeInvoiceId?: string;
  adapter?: LocalInvoiceAssistantAdapter;
  analyzeHardware?: () => Promise<HardwareEligibilityResult>;
  createId?: () => string;
  invoices: ReadonlyArray<Invoice>;
  now?: () => Date;
}>;

/**
 * Renders the local-only invoice AI assistant panel.
 *
 * @param props - Invoice context and optional test dependencies.
 * @returns Client-side local invoice assistant UI.
 */
export function LocalInvoiceAssistantPanel({
  activeInvoiceId,
  adapter,
  analyzeHardware,
  createId,
  invoices,
  now,
}: LocalInvoiceAssistantPanelProps): React.JSX.Element {
  const t = useTranslations("IMS--LocalInvoiceAssistant");
  const [question, setQuestion] = useState("");
  const assistant = useLocalInvoiceAssistant({
    ...(activeInvoiceId ? {activeInvoiceId} : {}),
    ...(adapter ? {adapter} : {}),
    ...(analyzeHardware ? {analyzeHardware} : {}),
    ...(createId ? {createId} : {}),
    invoices,
    ...(now ? {now} : {}),
  });
  const {canLoadModel, canSendMessage, deleteCachedModel, dismissError, loadModel, resetSession, sendMessage, state} = assistant;
  const isDownloading = state.lifecycle === "downloading";
  const isGenerating = state.lifecycle === "generating";
  const progressPercent = Math.round(state.progress * 100);
  const shouldShowModelCard = state.lifecycle === "not-downloaded" || state.lifecycle === "compatibility-unknown" || isDownloading;
  const shouldShowChat = state.lifecycle === "ready" || state.lifecycle === "generating" || state.lifecycle === "error";
  const hasError = state.error !== null;

  const handleLoadModel = useCallback((): void => {
    void loadModel();
  }, [loadModel]);

  const handleDismissError = useCallback((): void => {
    dismissError();
  }, [dismissError]);

  const handleQuestionChange = useCallback((event: Readonly<{currentTarget: Readonly<{value: string}>}>): void => {
    setQuestion(event.currentTarget.value);
  }, []);

  const handleResetSession = useCallback((): void => {
    resetSession();
  }, [resetSession]);

  const handleDeleteCachedModel = useCallback((): void => {
    void deleteCachedModel();
  }, [deleteCachedModel]);

  const handleSubmit = useCallback((event: Readonly<{preventDefault: () => void}>): void => {
    event.preventDefault();
    const nextQuestion = question.trim();
    if (!nextQuestion || !canSendMessage || isGenerating) {
      return;
    }

    setQuestion("");
    void sendMessage(nextQuestion);
  }, [canSendMessage, isGenerating, question, sendMessage]);

  return (
    <Card className={styles["panel"]}>
      <CardHeader>
        <CardTitle>{t("chat.title")}</CardTitle>
        <CardDescription>{t("privacy")}</CardDescription>
      </CardHeader>
      <CardContent className={styles["content"]}>
        {state.lifecycle === "checking-hardware" && (
          <p
            className={styles["statusText"]}
            aria-live='polite'>
            {t("hardware.checking")}
          </p>
        )}

        {state.lifecycle === "hardware-ineligible" && (
          <div
            className={styles["fallback"]}
            role='status'>
            <h3 className={styles["fallbackTitle"]}>{t("hardware.ineligibleTitle")}</h3>
            <p className={styles["fallbackText"]}>{t("hardware.ineligibleMessage")}</p>
          </div>
        )}

        {shouldShowModelCard ? (
          <div className={styles["modelCard"]}>
            <div>
              <h3 className={styles["sectionTitle"]}>{t("model.title")}</h3>
              <p className={styles["statusText"]}>{t("model.description")}</p>
              <p className={styles["statusText"]}>{t("model.host", {host: state.activeModel.artifactHost})}</p>
              {state.lifecycle === "compatibility-unknown" && (
                <p
                  className={styles["warningText"]}
                  role='status'>
                  {t("status.compatibilityUnknown")}
                </p>
              )}
            </div>

            {isDownloading ? (
              <div className={styles["progressGroup"]}>
                <Progress value={progressPercent} />
                <span className={styles["statusText"]}>{t("model.progress", {progress: progressPercent})}</span>
              </div>
            ) : (
              <Button
                type='button'
                onClick={handleLoadModel}
                disabled={!canLoadModel}>
                {t("actions.download")}
              </Button>
            )}
          </div>
        ) : null}

        {shouldShowChat ? (
          <div className={styles["chatShell"]}>
            <p
              className={styles["readyText"]}
              aria-live='polite'>
              {t("chat.ready")}
            </p>

            {hasError ? (
              <div
                className={styles["errorBox"]}
                role='alert'>
                <div>
                  <h3 className={styles["sectionTitle"]}>{t("errors.title")}</h3>
                  <p className={styles["statusText"]}>{state.error}</p>
                </div>
                <Button
                  type='button'
                  variant='outline'
                  onClick={handleDismissError}>
                  {t("actions.dismissError")}
                </Button>
              </div>
            ) : null}

            <div className={styles["messages"]}>
              {state.messages.map((message) => (
                <article
                  key={message.id}
                  className={message.role === "user" ? styles["userMessage"] : styles["assistantMessage"]}>
                  <p className={styles["messageContent"]}>{message.content}</p>
                </article>
              ))}
            </div>

            <form
              className={styles["form"]}
              onSubmit={handleSubmit}>
              <Label htmlFor='local-invoice-assistant-input'>{t("chat.inputLabel")}</Label>
              <Textarea
                id='local-invoice-assistant-input'
                value={question}
                onChange={handleQuestionChange}
                placeholder={t("chat.inputPlaceholder")}
                disabled={!canSendMessage || isGenerating}
                className={styles["textarea"]}
              />
              <div className={styles["actions"]}>
                <Button
                  type='submit'
                  disabled={!question.trim() || !canSendMessage || isGenerating}>
                  {t("actions.send")}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={handleResetSession}>
                  {t("actions.reset")}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={handleDeleteCachedModel}>
                  {t("actions.clearCache")}
                </Button>
              </div>
            </form>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

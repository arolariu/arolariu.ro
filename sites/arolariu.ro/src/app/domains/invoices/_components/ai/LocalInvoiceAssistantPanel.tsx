"use client";

import type {Invoice} from "@/types/invoices";
import {Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Label, Progress, Textarea} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {useCallback, useState} from "react";
import type {HardwareEligibilityResult} from "./hardwareEligibility";
import styles from "./LocalInvoiceAssistantPanel.module.scss";
import type {LocalInvoiceAssistantLifecycle, LocalInvoiceAssistantState} from "./types";
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

type HardwareStatusProps = Readonly<{
  lifecycle: LocalInvoiceAssistantLifecycle;
}>;

type ModelPreparationCardProps = Readonly<{
  activeModelArtifactHost: string;
  canLoadModel: boolean;
  lifecycle: LocalInvoiceAssistantLifecycle;
  onLoadModel: () => void;
  progressPercent: number;
}>;

type ChatShellProps = Readonly<{
  canSendMessage: boolean;
  isGenerating: boolean;
  onDeleteCachedModel: () => void;
  onDismissError: () => void;
  onQuestionChange: (event: Readonly<{currentTarget: Readonly<{value: string}>}>) => void;
  onResetSession: () => void;
  onStopGenerating: () => void;
  onSubmit: (event: Readonly<{preventDefault: () => void}>) => void;
  question: string;
  state: LocalInvoiceAssistantState;
}>;

function HardwareStatus({lifecycle}: HardwareStatusProps): React.JSX.Element | null {
  const t = useTranslations("IMS--LocalInvoiceAssistant");

  if (lifecycle === "checking-hardware") {
    return (
      <p
        className={styles["statusText"]}
        aria-live='polite'>
        {t("hardware.checking")}
      </p>
    );
  }

  if (lifecycle === "hardware-ineligible") {
    return (
      <div
        className={styles["fallback"]}
        role='status'>
        <h3 className={styles["fallbackTitle"]}>{t("hardware.ineligibleTitle")}</h3>
        <p className={styles["fallbackText"]}>{t("hardware.ineligibleMessage")}</p>
      </div>
    );
  }

  return null;
}

function ModelPreparationCard({
  activeModelArtifactHost,
  canLoadModel,
  lifecycle,
  onLoadModel,
  progressPercent,
}: ModelPreparationCardProps): React.JSX.Element | null {
  const t = useTranslations("IMS--LocalInvoiceAssistant");
  const isDownloading = lifecycle === "downloading";
  const shouldShowModelCard = lifecycle === "not-downloaded" || lifecycle === "compatibility-unknown" || isDownloading;

  if (shouldShowModelCard) {
    return (
      <div className={styles["modelCard"]}>
        <div>
          <h3 className={styles["sectionTitle"]}>{t("model.title")}</h3>
          <p className={styles["statusText"]}>{t("model.description")}</p>
          <p className={styles["statusText"]}>{t("model.host", {host: activeModelArtifactHost})}</p>
          {lifecycle === "compatibility-unknown" && (
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
            <span className={styles["statusText"]}>{t("model.progress", {progress: String(progressPercent)})}</span>
          </div>
        ) : (
          <Button
            type='button'
            onClick={onLoadModel}
            disabled={!canLoadModel}>
            {t("actions.download")}
          </Button>
        )}
      </div>
    );
  }

  return null;
}

function ChatShell({
  canSendMessage,
  isGenerating,
  onDeleteCachedModel,
  onDismissError,
  onQuestionChange,
  onResetSession,
  onStopGenerating,
  onSubmit,
  question,
  state,
}: ChatShellProps): React.JSX.Element | null {
  const t = useTranslations("IMS--LocalInvoiceAssistant");
  const shouldShowChat =
    state.lifecycle === "ready" || state.lifecycle === "generating" || state.lifecycle === "error" || state.lifecycle === "cancelled";

  if (shouldShowChat) {
    return (
      <div className={styles["chatShell"]}>
        <p
          className={styles["readyText"]}
          aria-live='polite'>
          {t("chat.ready")}
        </p>

        {state.error === null ? null : (
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
              onClick={onDismissError}>
              {t("actions.dismissError")}
            </Button>
          </div>
        )}

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
          onSubmit={onSubmit}>
          <Label htmlFor='local-invoice-assistant-input'>{t("chat.inputLabel")}</Label>
          <Textarea
            id='local-invoice-assistant-input'
            value={question}
            onChange={onQuestionChange}
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
            {isGenerating ? (
              <Button
                type='button'
                variant='outline'
                onClick={onStopGenerating}>
                {t("actions.stop")}
              </Button>
            ) : null}
            <Button
              type='button'
              variant='outline'
              onClick={onResetSession}>
              {t("actions.reset")}
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={onDeleteCachedModel}>
              {t("actions.clearCache")}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return null;
}

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
  const {canLoadModel, canSendMessage, deleteCachedModel, dismissError, interrupt, loadModel, resetSession, sendMessage, state} = assistant;
  const isGenerating = state.lifecycle === "generating";
  const progressPercent = Math.round(state.progress * 100);

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

  const handleStopGenerating = useCallback((): void => {
    interrupt();
  }, [interrupt]);

  const handleSubmit = useCallback(
    (event: Readonly<{preventDefault: () => void}>): void => {
      event.preventDefault();
      const nextQuestion = question.trim();
      if (!nextQuestion || !canSendMessage || isGenerating) {
        return;
      }

      setQuestion("");
      void sendMessage(nextQuestion);
    },
    [canSendMessage, isGenerating, question, sendMessage],
  );

  return (
    <Card className={styles["panel"]}>
      <CardHeader>
        <CardTitle>{t("chat.title")}</CardTitle>
        <CardDescription>{t("privacy")}</CardDescription>
      </CardHeader>
      <CardContent className={styles["content"]}>
        <HardwareStatus lifecycle={state.lifecycle} />
        <ModelPreparationCard
          activeModelArtifactHost={state.activeModel.artifactHost}
          canLoadModel={canLoadModel}
          lifecycle={state.lifecycle}
          onLoadModel={handleLoadModel}
          progressPercent={progressPercent}
        />
        <ChatShell
          canSendMessage={canSendMessage}
          isGenerating={isGenerating}
          onDeleteCachedModel={handleDeleteCachedModel}
          onDismissError={handleDismissError}
          onQuestionChange={handleQuestionChange}
          onResetSession={handleResetSession}
          onStopGenerating={handleStopGenerating}
          onSubmit={handleSubmit}
          question={question}
          state={state}
        />
      </CardContent>
    </Card>
  );
}

"use client";

import type {Invoice} from "@/types/invoices";
import {Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Label, Progress, Textarea} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {useState} from "react";
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
  const isDownloading = assistant.state.lifecycle === "downloading";
  const isGenerating = assistant.state.lifecycle === "generating";
  const progressPercent = Math.round(assistant.state.progress * 100);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const nextQuestion = question.trim();
    if (!nextQuestion || !assistant.canSendMessage || isGenerating) {
      return;
    }

    setQuestion("");
    await assistant.sendMessage(nextQuestion);
  }

  return (
    <Card className={styles["panel"]}>
      <CardHeader>
        <CardTitle>{t("chat.title")}</CardTitle>
        <CardDescription>{t("privacy")}</CardDescription>
      </CardHeader>
      <CardContent className={styles["content"]}>
        {assistant.state.lifecycle === "checking-hardware" && (
          <p
            className={styles["statusText"]}
            aria-live='polite'>
            {t("hardware.checking")}
          </p>
        )}

        {assistant.state.lifecycle === "hardware-ineligible" && (
          <div
            className={styles["fallback"]}
            role='status'>
            <h3 className={styles["fallbackTitle"]}>{t("hardware.ineligibleTitle")}</h3>
            <p className={styles["fallbackText"]}>{t("hardware.ineligibleMessage")}</p>
          </div>
        )}

        {(assistant.state.lifecycle === "not-downloaded" || assistant.state.lifecycle === "compatibility-unknown" || isDownloading) && (
          <div className={styles["modelCard"]}>
            <div>
              <h3 className={styles["sectionTitle"]}>{t("model.title")}</h3>
              <p className={styles["statusText"]}>{t("model.description")}</p>
              <p className={styles["statusText"]}>{t("model.host", {host: assistant.state.activeModel.artifactHost})}</p>
              {assistant.state.lifecycle === "compatibility-unknown" && (
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
                onClick={() => void assistant.loadModel()}
                disabled={!assistant.canLoadModel}>
                {t("actions.download")}
              </Button>
            )}
          </div>
        )}

        {(assistant.state.lifecycle === "ready" || assistant.state.lifecycle === "generating" || assistant.state.lifecycle === "error") && (
          <div className={styles["chatShell"]}>
            <p
              className={styles["readyText"]}
              aria-live='polite'>
              {t("chat.ready")}
            </p>

            {assistant.state.error && (
              <div
                className={styles["errorBox"]}
                role='alert'>
                <div>
                  <h3 className={styles["sectionTitle"]}>{t("errors.title")}</h3>
                  <p className={styles["statusText"]}>{assistant.state.error}</p>
                </div>
                <Button
                  type='button'
                  variant='outline'
                  onClick={assistant.dismissError}>
                  {t("actions.dismissError")}
                </Button>
              </div>
            )}

            <div className={styles["messages"]}>
              {assistant.state.messages.map((message) => (
                <article
                  key={message.id}
                  className={message.role === "user" ? styles["userMessage"] : styles["assistantMessage"]}>
                  <p className={styles["messageContent"]}>{message.content}</p>
                </article>
              ))}
            </div>

            <form
              className={styles["form"]}
              onSubmit={(event) => void handleSubmit(event)}>
              <Label htmlFor='local-invoice-assistant-input'>{t("chat.inputLabel")}</Label>
              <Textarea
                id='local-invoice-assistant-input'
                value={question}
                onChange={(event) => setQuestion(event.currentTarget.value)}
                placeholder={t("chat.inputPlaceholder")}
                disabled={!assistant.canSendMessage || isGenerating}
                className={styles["textarea"]}
              />
              <div className={styles["actions"]}>
                <Button
                  type='submit'
                  disabled={!question.trim() || !assistant.canSendMessage || isGenerating}>
                  {t("actions.send")}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={assistant.resetSession}>
                  {t("actions.reset")}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => void assistant.deleteCachedModel()}>
                  {t("actions.clearCache")}
                </Button>
              </div>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * @fileoverview Local invoice AI assistant panel component.
 *
 * Renders hardware status, model download UI, and chat interface for the
 * client-only invoice AI assistant.
 *
 * @module app/domains/invoices/_components/ai/LocalInvoiceAssistantPanel
 */

"use client";

import type {Invoice} from "@/types/invoices";
import {Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Label, Progress, Textarea} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {memo, useCallback, useDeferredValue, useState} from "react";
import type {HardwareEligibilityResult} from "./hardwareEligibility";
import type {LocalInvoiceAssistantAnalytics} from "./invoiceContext";
import styles from "./LocalInvoiceAssistantPanel.module.scss";
import type {SuggestedPromptKey} from "./suggestedPrompts";
import {getSuggestedPromptKeys, shouldShowSuggestedPrompts} from "./suggestedPrompts";
import type {LocalInvoiceAssistantLifecycle, LocalInvoiceAssistantMessage, LocalInvoiceAssistantState} from "./types";
import {useLocalInvoiceAssistant} from "./useLocalInvoiceAssistant";
import type {LocalInvoiceAssistantAdapter} from "./webLlmAdapter";

/**
 * Props for LocalInvoiceAssistantPanel component.
 */
type LocalInvoiceAssistantPanelProps = Readonly<{
  /** If provided, scope context to single invoice (detail view). */
  activeInvoiceId?: string;
  /** Optional pre-configured adapter (for testing). */
  adapter?: LocalInvoiceAssistantAdapter;
  /** Optional hardware analysis override (for testing). */
  analyzeHardware?: () => Promise<HardwareEligibilityResult>;
  /** Optional message ID generator (for testing). */
  createId?: () => string;
  /** Full invoice list from store. */
  invoices: ReadonlyArray<Invoice>;
  /** Optional time provider (for testing). */
  now?: () => Date;
}>;

type HardwareStatusProps = Readonly<{
  error: string | null;
  hardware: HardwareEligibilityResult | null;
  lifecycle: LocalInvoiceAssistantLifecycle;
  onRetryHardwareAnalysis: () => void;
}>;

type ModelPreparationCardProps = Readonly<{
  activeModelArtifactHost: string;
  activeModelDisplayName: string;
  activeModelSizeMB: number;
  canLoadModel: boolean;
  hardware: HardwareEligibilityResult | null;
  lifecycle: LocalInvoiceAssistantLifecycle;
  onLoadModel: () => void;
  progressPercent: number;
}>;

type ChatShellProps = Readonly<{
  activeModelDisplayName: string;
  activeModelHost: string;
  activeModelSizeMB: number;
  analytics: LocalInvoiceAssistantAnalytics;
  canSendMessage: boolean;
  isGenerating: boolean;
  onDeleteCachedModel: () => void;
  onDismissError: () => void;
  onPromptClick: (promptKey: SuggestedPromptKey) => void;
  onQuestionChange: (event: Readonly<{currentTarget: Readonly<{value: string}>}>) => void;
  onResetSession: () => void;
  onStopGenerating: () => void;
  onSubmit: (event: Readonly<{preventDefault: () => void}>) => void;
  question: string;
  state: LocalInvoiceAssistantState;
}>;

type BenchmarkSectionProps = Readonly<{
  canRunBenchmark: boolean;
  isRunning: boolean;
  modelLoaded: boolean;
  onRunBenchmark: () => void;
  state: LocalInvoiceAssistantState;
}>;

function DeviceCompatibilityDetails({hardware}: Readonly<{hardware: HardwareEligibilityResult}>): React.JSX.Element | null {
  const t = useTranslations("IMS--LocalInvoiceAssistant");

  // Only show if we have enriched data
  if (!hardware.gpu && !hardware.device) {
    return null;
  }

  return (
    <div className={styles["deviceCompatibility"]}>
      <h4 className={styles["subsectionTitle"]}>{t("deviceCompatibility.title")}</h4>
      <ul className={styles["compatibilityList"]}>
        {hardware.gpu?.features && hardware.gpu.features.length > 0 ? (
          <li className={styles["compatibilityItem"]}>
            {t("deviceCompatibility.gpuFeatures", {
              features: hardware.gpu.features.join(", "),
            })}
          </li>
        ) : null}
        {hardware.gpu?.limits.maxBufferSize ? (
          <li className={styles["compatibilityItem"]}>
            {t("deviceCompatibility.gpuLimits", {
              maxBufferMB: Math.round(hardware.gpu.limits.maxBufferSize / (1024 * 1024)),
            })}
          </li>
        ) : null}
        {hardware.gpu?.limits.maxStorageBufferBindingSize ? (
          <li className={styles["compatibilityItem"]}>
            {t("deviceCompatibility.gpuStorageBufferLimit", {
              maxStorageBufferMB: Math.round(hardware.gpu.limits.maxStorageBufferBindingSize / (1024 * 1024)),
            })}
          </li>
        ) : null}
        {hardware.device?.deviceMemoryGB ? (
          <li className={styles["compatibilityItem"]}>
            {t("deviceCompatibility.memoryGB", {
              memory: hardware.device.deviceMemoryGB,
            })}
          </li>
        ) : null}
        {hardware.device?.logicalCores ? (
          <li className={styles["compatibilityItem"]}>
            {t("deviceCompatibility.logicalCores", {
              cores: hardware.device.logicalCores,
            })}
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function HardwareStatus({error, hardware, lifecycle, onRetryHardwareAnalysis}: HardwareStatusProps): React.JSX.Element | null {
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

  if (lifecycle === "error" && hardware === null && error !== null) {
    return (
      <div
        className={styles["errorBox"]}
        role='alert'>
        <div>
          <h3 className={styles["sectionTitle"]}>{t("errors.title")}</h3>
          <p className={styles["statusText"]}>{error}</p>
        </div>
        <Button
          type='button'
          variant='outline'
          onClick={onRetryHardwareAnalysis}>
          {t("actions.retryHardware")}
        </Button>
      </div>
    );
  }

  return null;
}

function ModelPreparationCard({
  activeModelArtifactHost,
  activeModelDisplayName,
  activeModelSizeMB,
  canLoadModel,
  hardware,
  lifecycle,
  onLoadModel,
  progressPercent,
}: ModelPreparationCardProps): React.JSX.Element | null {
  const t = useTranslations("IMS--LocalInvoiceAssistant");
  const isDownloading = lifecycle === "downloading";
  const shouldShowModelCard = lifecycle === "not-downloaded" || lifecycle === "compatibility-unknown" || isDownloading;
  const hasStorageWarning = hardware?.reasons.includes("storage-estimate-unavailable") ?? false;

  if (shouldShowModelCard) {
    return (
      <div className={styles["modelCard"]}>
        <div>
          <h3 className={styles["sectionTitle"]}>{t("model.title")}</h3>
          <p className={styles["statusText"]}>{t("model.description")}</p>
          <p className={styles["statusText"]}>
            {t("model.recommendedModel", {modelName: activeModelDisplayName})}
          </p>
          <p className={styles["statusText"]}>
            {t("model.size", {sizeMB: Math.round(activeModelSizeMB)})}
          </p>
          <p className={styles["statusText"]}>{t("cache.source", {host: activeModelArtifactHost})}</p>
          <p className={styles["statusText"]}>{t("cache.behavior")}</p>

          {hardware ? <DeviceCompatibilityDetails hardware={hardware} /> : null}

          {lifecycle === "compatibility-unknown" && (
            <p
              className={styles["warningText"]}
              role='status'>
              {t("status.compatibilityUnknown")}
            </p>
          )}

          {hasStorageWarning && (
            <p
              className={styles["warningText"]}
              role='alert'>
              {t("status.storageWarning")}
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
            {hasStorageWarning ? t("actions.downloadWithWarning") : t("actions.download")}
          </Button>
        )}
      </div>
    );
  }

  return null;
}

/**
 * Cache information and management section.
 *
 * @remarks
 * Displays model-specific cache information and clear-cache action.
 * Only shown when model is loaded (ready, generating, cancelled, error after load).
 */
function CacheInfoSection({
  modelDisplayName,
  modelHost,
  modelSizeMB,
  onDeleteCachedModel,
}: Readonly<{
  modelDisplayName: string;
  modelHost: string;
  modelSizeMB: number;
  onDeleteCachedModel: () => void;
}>): React.JSX.Element {
  const t = useTranslations("IMS--LocalInvoiceAssistant");

  return (
    <div className={styles["cacheInfo"]}>
      <h4 className={styles["subsectionTitle"]}>{t("cache.behavior")}</h4>
      <p className={styles["statusText"]}>
        {t("cache.source", {host: modelHost})}
      </p>
      <p className={styles["statusText"]}>
        {t("cache.clearImpact")}
      </p>
      <Button
        type='button'
        variant='outline'
        onClick={onDeleteCachedModel}>
        {t("actions.clearCache")} ({modelDisplayName}, ~{Math.round(modelSizeMB)} MB)
      </Button>
    </div>
  );
}

function BenchmarkSection({canRunBenchmark, isRunning, modelLoaded, onRunBenchmark, state}: BenchmarkSectionProps): React.JSX.Element | null {
  const t = useTranslations("IMS--LocalInvoiceAssistant");

  // Only show if hardware is available and model was successfully loaded
  if (!state.hardware || !modelLoaded) {
    return null;
  }

  const shouldShowBenchmark = state.lifecycle === "ready" || state.lifecycle === "generating" || state.lifecycle === "cancelled";

  if (!shouldShowBenchmark) {
    return null;
  }

  return (
    <div className={styles["benchmarkSection"]}>
      <h3 className={styles["sectionTitle"]}>{t("benchmark.title")}</h3>
      <p className={styles["statusText"]}>{t("benchmark.description")}</p>

      {/* Hardware summary */}
      <DeviceCompatibilityDetails hardware={state.hardware} />

      {state.latestBenchmark && (
        <div className={styles["metricsBox"]}>
          <h4 className={styles["subsectionTitle"]}>{t("benchmark.results.title")}</h4>
          <ul className={styles["metricsList"]}>
            <li>{t("benchmark.results.model", {modelName: state.latestBenchmark.modelId})}</li>
            <li>{t("benchmark.results.firstToken", {latencyMs: Math.round(state.latestBenchmark.firstTokenLatencyMs)})}</li>
            <li>
              {t("benchmark.results.throughput", {chunksPerSec: state.latestBenchmark.estimatedChunksPerSecond.toFixed(1)})}
            </li>
            <li>{t("benchmark.results.duration", {durationMs: Math.round(state.latestBenchmark.totalDurationMs)})}</li>
            <li>{t("benchmark.results.characters", {charsPerSec: Math.round(state.latestBenchmark.charactersPerSecond)})}</li>
          </ul>
        </div>
      )}

      {state.latestGeneration && (
        <details className={styles["metricsDetails"]}>
          <summary className={styles["subsectionTitle"]}>{t("benchmark.latestGeneration.title")}</summary>
          <ul className={styles["metricsList"]}>
            <li>{t("benchmark.latestGeneration.model", {modelName: state.latestGeneration.modelId})}</li>
            <li>{t("benchmark.latestGeneration.firstToken", {latencyMs: Math.round(state.latestGeneration.firstTokenLatencyMs)})}</li>
            <li>
              {t("benchmark.latestGeneration.throughput", {chunksPerSec: state.latestGeneration.estimatedChunksPerSecond.toFixed(1)})}
            </li>
            <li>{t("benchmark.latestGeneration.duration", {durationMs: Math.round(state.latestGeneration.totalDurationMs)})}</li>
            <li>{t("benchmark.latestGeneration.characters", {charsPerSec: Math.round(state.latestGeneration.charactersPerSecond)})}</li>
          </ul>
        </details>
      )}

      <Button
        type='button'
        onClick={onRunBenchmark}
        disabled={!canRunBenchmark || isRunning}>
        {isRunning ? t("benchmark.running") : t("benchmark.runButton")}
      </Button>
    </div>
  );
}

/**
 * Memoized message bubble component.
 *
 * @remarks
 * Prevents re-rendering static messages when streaming new content.
 */
const MessageBubble = memo(function MessageBubble({
  message,
}: Readonly<{
  message: LocalInvoiceAssistantMessage;
}>): React.JSX.Element {
  return (
    <article
      key={message.id}
      className={message.role === "user" ? styles["userMessage"] : styles["assistantMessage"]}>
      <p className={styles["messageContent"]}>{message.content}</p>
    </article>
  );
});

/**
 * Memoized message list component.
 *
 * @remarks
 * Uses useDeferredValue to keep UI responsive during streaming.
 */
const MessageList = memo(function MessageList({
  messages,
}: Readonly<{
  messages: ReadonlyArray<LocalInvoiceAssistantMessage>;
}>): React.JSX.Element {
  const deferredMessages = useDeferredValue(messages);

  return (
    <div className={styles["messages"]}>
      {deferredMessages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
        />
      ))}
    </div>
  );
});

/**
 * Memoized message composer form.
 *
 * @remarks
 * Isolated from message list to keep input responsive during streaming.
 */
const MessageComposer = memo(function MessageComposer({
  canSendMessage,
  isGenerating,
  onQuestionChange,
  onResetSession,
  onStopGenerating,
  onSubmit,
  question,
}: Readonly<{
  canSendMessage: boolean;
  isGenerating: boolean;
  onQuestionChange: (event: Readonly<{currentTarget: Readonly<{value: string}>}>) => void;
  onResetSession: () => void;
  onStopGenerating: () => void;
  onSubmit: (event: Readonly<{preventDefault: () => void}>) => void;
  question: string;
}>): React.JSX.Element {
  const t = useTranslations("IMS--LocalInvoiceAssistant");

  return (
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
      </div>
    </form>
  );
});

/**
 * Analytics preview component.
 *
 * @remarks
 * Shows deterministic analytics summary from invoice context,
 * providing instant insights without waiting for LLM generation.
 * Never cross-sums currencies - displays each currency separately.
 */
function AnalyticsPreview({analytics}: Readonly<{analytics: LocalInvoiceAssistantAnalytics}>): React.JSX.Element | null {
  const t = useTranslations("IMS--LocalInvoiceAssistant");

  if (analytics.invoiceCount === 0) {
    return (
      <div className={styles["analyticsPreview"]}>
        <h4 className={styles["subsectionTitle"]}>{t("analyticsPreview.title")}</h4>
        <p className={styles["statusText"]}>{t("analyticsPreview.noData")}</p>
      </div>
    );
  }

  const topMerchantEntry = Object.entries(analytics.merchantBreakdown).toSorted(
    ([, left], [, right]) => right.invoiceCount - left.invoiceCount,
  )[0];

  return (
    <div className={styles["analyticsPreview"]}>
      <h4 className={styles["subsectionTitle"]}>{t("analyticsPreview.title")}</h4>
      <ul className={styles["metricsList"]}>
        <li>
          {t("analyticsPreview.invoiceCountLabel")}: {analytics.invoiceCount}
        </li>
        <li>
          {t("analyticsPreview.totalSpendLabel")}:
          <ul className={styles["metricsList"]}>
            {Object.entries(analytics.totalSpendByCurrency)
              .toSorted(([, left], [, right]) => right - left)
              .map(([currency, amount]) => (
                <li key={currency}>
                  {currency}: {amount.toFixed(2)}
                </li>
              ))}
          </ul>
        </li>
        {topMerchantEntry ? (
          <li>
            {t("analyticsPreview.topMerchantLabel")}: {topMerchantEntry[0]} ({topMerchantEntry[1].invoiceCount} invoices)
          </li>
        ) : null}
      </ul>
    </div>
  );
}

/**
 * Suggested prompt chips component.
 *
 * @remarks
 * Displays localized suggested questions as clickable buttons,
 * helping users discover assistant capabilities.
 */
function SuggestedPrompts({
  analytics,
  onPromptClick,
}: Readonly<{
  analytics: LocalInvoiceAssistantAnalytics;
  onPromptClick: (promptKey: SuggestedPromptKey) => void;
}>): React.JSX.Element | null {
  const t = useTranslations("IMS--LocalInvoiceAssistant");

  if (!shouldShowSuggestedPrompts(analytics)) {
    return null;
  }

  const promptKeys = getSuggestedPromptKeys(analytics);

  return (
    <div className={styles["suggestedPrompts"]}>
      <h4 className={styles["subsectionTitle"]}>{t("suggestedPrompts.title")}</h4>
      <div className={styles["promptChips"]}>
        {promptKeys.map((key) => (
          <Button
            key={key}
            type='button'
            variant='outline'
            onClick={() => {
              onPromptClick(key);
            }}>
            {t(`suggestedPrompts.${key}`)}
          </Button>
        ))}
      </div>
    </div>
  );
}


function ChatShell({
  activeModelDisplayName,
  activeModelHost,
  activeModelSizeMB,
  analytics,
  canSendMessage,
  isGenerating,
  onDeleteCachedModel,
  onDismissError,
  onPromptClick,
  onQuestionChange,
  onResetSession,
  onStopGenerating,
  onSubmit,
  question,
  state,
}: ChatShellProps): React.JSX.Element | null {
  const t = useTranslations("IMS--LocalInvoiceAssistant");
  const shouldShowChat =
    state.hardware !== null
    && (state.lifecycle === "ready" || state.lifecycle === "generating" || state.lifecycle === "error" || state.lifecycle === "cancelled");
  const shouldShowReadyBanner = state.lifecycle === "ready";

  if (shouldShowChat) {
    return (
      <div className={styles["chatShell"]}>
        {shouldShowReadyBanner ? (
          <p
            className={styles["readyText"]}
            aria-live='polite'>
            {t("chat.ready")}
          </p>
        ) : null}

        <CacheInfoSection
          modelDisplayName={activeModelDisplayName}
          modelHost={activeModelHost}
          modelSizeMB={activeModelSizeMB}
          onDeleteCachedModel={onDeleteCachedModel}
        />

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

        <SuggestedPrompts
          analytics={analytics}
          onPromptClick={onPromptClick}
        />

        <MessageList messages={state.messages} />

        <MessageComposer
          canSendMessage={canSendMessage}
          isGenerating={isGenerating}
          onQuestionChange={onQuestionChange}
          onResetSession={onResetSession}
          onStopGenerating={onStopGenerating}
          onSubmit={onSubmit}
          question={question}
        />
      </div>
    );
  }

  return null;
}

/**
 * Local-only invoice AI assistant panel component.
 *
 * @param props - Invoice context and optional test dependencies.
 * @returns Client-side local invoice assistant UI with hardware status, model download, and chat.
 *
 * @remarks
 * **Component structure:**
 * 1. `HardwareStatus` → Hardware eligibility check and error recovery
 * 2. `ModelPreparationCard` → Model download UI with progress bar
 * 3. `ChatShell` → Message history and input form
 *
 * **Lifecycle states:**
 * - `checking-hardware` → Loading spinner
 * - `hardware-ineligible` → Fallback message with requirements
 * - `compatibility-unknown` → Warning banner, allow download with caveat
 * - `not-downloaded` → Download button
 * - `downloading` → Progress bar
 * - `ready` → Chat interface enabled
 * - `generating` → Streaming response with stop button
 * - `error` → Error banner with dismiss/retry
 *
 * **Accessibility:**
 * - `aria-live` regions for status updates
 * - `role="alert"` for errors
 * - `role="status"` for non-critical updates
 * - Keyboard-accessible form submission
 *
 * @example
 * ```tsx
 * <LocalInvoiceAssistantPanel invoices={allInvoices} />
 * <LocalInvoiceAssistantPanel
 *   activeInvoiceId="invoice-123"
 *   invoices={[invoice]}
 * />
 * ```
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
  const {
    canLoadModel,
    canRunBenchmark,
    canSendMessage,
    context,
    deleteCachedModel,
    dismissError,
    interrupt,
    loadModel,
    resetSession,
    retryHardwareAnalysis,
    runBenchmark,
    sendMessage,
    state,
  } = assistant;
  const isGenerating = state.lifecycle === "generating";
  const modelLoaded = state.lifecycle === "ready" || state.lifecycle === "generating" || state.lifecycle === "cancelled";
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

  const handleRetryHardwareAnalysis = useCallback((): void => {
    void retryHardwareAnalysis();
  }, [retryHardwareAnalysis]);

  const handleRunBenchmark = useCallback((): void => {
    void runBenchmark();
  }, [runBenchmark]);

  const handlePromptClick = useCallback(
    (promptKey: SuggestedPromptKey): void => {
      const promptText = t(`suggestedPrompts.${promptKey}`);
      setQuestion("");
      void sendMessage(promptText);
    },
    [sendMessage, t],
  );

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
        <HardwareStatus
          error={state.error}
          hardware={state.hardware}
          lifecycle={state.lifecycle}
          onRetryHardwareAnalysis={handleRetryHardwareAnalysis}
        />
        <ModelPreparationCard
          activeModelArtifactHost={state.activeModel.artifactHost}
          activeModelDisplayName={state.activeModel.displayName}
          activeModelSizeMB={state.activeModel.vramRequiredMB * 1.5}
          canLoadModel={canLoadModel}
          hardware={state.hardware}
          lifecycle={state.lifecycle}
          onLoadModel={handleLoadModel}
          progressPercent={progressPercent}
        />
        {state.hardware !== null && context.analytics.invoiceCount > 0 ? (
          <div>
            <AnalyticsPreview analytics={context.analytics} />
          </div>
        ) : null}
        <BenchmarkSection
          canRunBenchmark={canRunBenchmark}
          isRunning={isGenerating}
          modelLoaded={modelLoaded}
          onRunBenchmark={handleRunBenchmark}
          state={state}
        />
        <ChatShell
          activeModelDisplayName={state.activeModel.displayName}
          activeModelHost={state.activeModel.artifactHost}
          activeModelSizeMB={state.activeModel.vramRequiredMB * 1.5}
          analytics={context.analytics}
          canSendMessage={canSendMessage}
          isGenerating={isGenerating}
          onDeleteCachedModel={handleDeleteCachedModel}
          onDismissError={handleDismissError}
          onPromptClick={handlePromptClick}
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

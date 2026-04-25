"use client";

import type {Invoice} from "@/types/invoices";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {analyzeLocalAiHardwareEligibility, type HardwareEligibilityResult} from "./hardwareEligibility";
import {createLocalInvoiceAssistantContext, type LocalInvoiceAssistantContext} from "./invoiceContext";
import type {
  LocalInvoiceAssistantMessage,
  LocalInvoiceAssistantModelMetadata,
  LocalInvoiceAssistantPromptMessage,
  LocalInvoiceAssistantState,
} from "./types";
import {
  createWebLlmLocalInvoiceAssistantAdapter,
  DEFAULT_LOCAL_INVOICE_ASSISTANT_MODEL,
  type LocalInvoiceAssistantAdapter,
} from "./webLlmAdapter";

type UseLocalInvoiceAssistantInput = Readonly<{
  activeInvoiceId?: string;
  adapter?: LocalInvoiceAssistantAdapter;
  analyzeHardware?: () => Promise<HardwareEligibilityResult>;
  createAdapter?: () => LocalInvoiceAssistantAdapter;
  createId?: () => string;
  invoices: ReadonlyArray<Invoice>;
  model?: LocalInvoiceAssistantModelMetadata;
  now?: () => Date;
}>;

type UseLocalInvoiceAssistantResult = Readonly<{
  canLoadModel: boolean;
  canSendMessage: boolean;
  context: LocalInvoiceAssistantContext;
  deleteCachedModel: () => Promise<void>;
  dismissError: () => void;
  interrupt: () => void;
  loadModel: () => Promise<void>;
  resetSession: () => void;
  sendMessage: (content: string) => Promise<void>;
  state: LocalInvoiceAssistantState;
}>;

const LOCAL_INVOICE_ASSISTANT_SYSTEM_PROMPT =
  "You are a local-only invoice assistant. Answer using only the sanitized invoice JSON provided in this prompt. " +
  "Do not claim access to scans, raw OCR, hidden metadata, accounts, or remote services. " +
  "If the invoice data is insufficient, say what is missing and suggest a local-only next step.";

/**
 * Manages the browser-only lifecycle for the local invoice AI assistant.
 *
 * @param input - Invoice context and optional injectable dependencies for tests.
 * @returns Local assistant state plus actions for loading, chatting, and recovery.
 */
export function useLocalInvoiceAssistant(input: UseLocalInvoiceAssistantInput): UseLocalInvoiceAssistantResult {
  const activeModel = input.model ?? DEFAULT_LOCAL_INVOICE_ASSISTANT_MODEL;
  const adapterRef = useRef<LocalInvoiceAssistantAdapter | null>(null);
  const analyzeHardwareRef = useRef(input.analyzeHardware ?? analyzeLocalAiHardwareEligibility);
  const createIdRef = useRef(input.createId ?? createDefaultMessageId);
  const nowRef = useRef(input.now ?? (() => new Date()));
  const loadedRef = useRef(false);

  if (adapterRef.current === null) {
    adapterRef.current = input.adapter ?? input.createAdapter?.() ?? createWebLlmLocalInvoiceAssistantAdapter();
  }

  useEffect(() => {
    analyzeHardwareRef.current = input.analyzeHardware ?? analyzeLocalAiHardwareEligibility;
    createIdRef.current = input.createId ?? createDefaultMessageId;
    nowRef.current = input.now ?? (() => new Date());
  });

  const context = useMemo(
    () =>
      createLocalInvoiceAssistantContext({
        activeInvoiceId: input.activeInvoiceId,
        invoices: input.invoices,
      }),
    [input.activeInvoiceId, input.invoices],
  );

  const [state, setState] = useState<LocalInvoiceAssistantState>(() => ({
    activeModel,
    error: null,
    hardware: null,
    lifecycle: "checking-hardware",
    messages: [],
    progress: 0,
  }));
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let isActive = true;

    async function analyzeHardware(): Promise<void> {
      try {
        const hardware = await analyzeHardwareRef.current();
        if (!isActive) {
          return;
        }

        setState((current) => ({
          ...current,
          error: null,
          hardware,
          lifecycle: getLifecycleAfterHardwareAnalysis(hardware, loadedRef.current),
        }));
      } catch (error) {
        if (!isActive) {
          return;
        }

        setState((current) => ({
          ...current,
          error: getErrorMessage(error),
          lifecycle: "error",
        }));
      }
    }

    void analyzeHardware();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(
    () => () => {
      void adapterRef.current?.dispose();
    },
    [],
  );

  const loadModel = useCallback(async (): Promise<void> => {
    const adapter = adapterRef.current;
    if (!adapter || stateRef.current.hardware?.status === "ineligible") {
      return;
    }

    setState((current) => ({
      ...current,
      error: null,
      lifecycle: "downloading",
      progress: 0,
    }));

    try {
      await adapter.load({
        model: activeModel,
        onProgress: (report) => {
          setState((current) => ({
            ...current,
            progress: report.progress,
          }));
        },
      });
      loadedRef.current = true;
      setState((current) => ({
        ...current,
        error: null,
        lifecycle: "ready",
        progress: 1,
      }));
    } catch (error) {
      loadedRef.current = false;
      setState((current) => ({
        ...current,
        error: getErrorMessage(error),
        lifecycle: "error",
      }));
    }
  }, [activeModel]);

  const sendMessage = useCallback(
    async (content: string): Promise<void> => {
      const trimmedContent = content.trim();
      const adapter = adapterRef.current;

      if (!trimmedContent || !adapter || !loadedRef.current) {
        return;
      }

      const timestamp = nowRef.current().toISOString();
      const userMessage = createMessage(trimmedContent, "user", timestamp, createIdRef.current);
      const assistantMessage = createMessage("", "assistant", timestamp, createIdRef.current);
      const promptMessages = createPromptMessages(context, [...stateRef.current.messages, userMessage]);

      setState((current) => ({
        ...current,
        error: null,
        lifecycle: "generating",
        messages: [...current.messages, userMessage, assistantMessage],
      }));

      try {
        const response = await adapter.generate(promptMessages, {
          onToken: (_token, accumulatedResponse) => {
            setState((current) => ({
              ...current,
              messages: replaceMessageContent(current.messages, assistantMessage.id, accumulatedResponse),
            }));
          },
        });

        setState((current) => ({
          ...current,
          error: null,
          lifecycle: "ready",
          messages: replaceMessageContent(current.messages, assistantMessage.id, response),
        }));
      } catch (error) {
        setState((current) => ({
          ...current,
          error: getErrorMessage(error),
          lifecycle: "error",
          messages: current.messages.filter((message) => message.id !== assistantMessage.id),
        }));
      }
    },
    [context],
  );

  const dismissError = useCallback((): void => {
    setState((current) => ({
      ...current,
      error: null,
      lifecycle: getRecoveredLifecycle(current.hardware, loadedRef.current),
    }));
  }, []);

  const interrupt = useCallback((): void => {
    adapterRef.current?.interrupt();
    setState((current) => ({
      ...current,
      lifecycle: loadedRef.current ? "cancelled" : current.lifecycle,
    }));
  }, []);

  const resetSession = useCallback((): void => {
    setState((current) => ({
      ...current,
      error: null,
      lifecycle: getRecoveredLifecycle(current.hardware, loadedRef.current),
      messages: [],
    }));
  }, []);

  const deleteCachedModel = useCallback(async (): Promise<void> => {
    await adapterRef.current?.deleteCachedModel(activeModel);
    loadedRef.current = false;
    setState((current) => ({
      ...current,
      error: null,
      lifecycle: getRecoveredLifecycle(current.hardware, false),
      progress: 0,
    }));
  }, [activeModel]);

  const canLoadModel =
    state.lifecycle === "not-downloaded" || state.lifecycle === "compatibility-unknown" || (state.lifecycle === "error" && !loadedRef.current);
  const canSendMessage = state.lifecycle === "ready";

  return {
    canLoadModel,
    canSendMessage,
    context,
    deleteCachedModel,
    dismissError,
    interrupt,
    loadModel,
    resetSession,
    sendMessage,
    state,
  };
}

function createPromptMessages(
  context: LocalInvoiceAssistantContext,
  messages: ReadonlyArray<LocalInvoiceAssistantMessage>,
): LocalInvoiceAssistantPromptMessage[] {
  return [
    {
      content: `${LOCAL_INVOICE_ASSISTANT_SYSTEM_PROMPT}\n\nSanitized invoice context:\n${context.promptContext}`,
      role: "system",
    },
    ...messages.map((message) => ({
      content: message.content,
      role: message.role,
    })),
  ];
}

function createMessage(
  content: string,
  role: LocalInvoiceAssistantMessage["role"],
  timestamp: string,
  createId: () => string,
): LocalInvoiceAssistantMessage {
  return {
    content,
    id: createId(),
    role,
    timestamp,
  };
}

function replaceMessageContent(
  messages: ReadonlyArray<LocalInvoiceAssistantMessage>,
  messageId: string,
  content: string,
): LocalInvoiceAssistantMessage[] {
  return messages.map((message) => (message.id === messageId ? {...message, content} : message));
}

function getLifecycleAfterHardwareAnalysis(
  hardware: HardwareEligibilityResult,
  hasLoadedModel: boolean,
): LocalInvoiceAssistantState["lifecycle"] {
  if (hardware.status === "ineligible") {
    return "hardware-ineligible";
  }

  if (hasLoadedModel) {
    return "ready";
  }

  return hardware.status === "unknown" ? "compatibility-unknown" : "not-downloaded";
}

function getRecoveredLifecycle(
  hardware: HardwareEligibilityResult | null,
  hasLoadedModel: boolean,
): LocalInvoiceAssistantState["lifecycle"] {
  if (!hardware) {
    return "checking-hardware";
  }

  return getLifecycleAfterHardwareAnalysis(hardware, hasLoadedModel);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The local invoice assistant failed unexpectedly.";
}

function createDefaultMessageId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `local-invoice-ai-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

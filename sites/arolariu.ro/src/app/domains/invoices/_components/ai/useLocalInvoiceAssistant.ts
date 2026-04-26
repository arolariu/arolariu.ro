/**
 * @fileoverview React hook for managing local invoice AI assistant lifecycle.
 *
 * Orchestrates hardware analysis, model loading, chat state, and error recovery
 * for the client-only invoice AI assistant powered by WebLLM.
 *
 * @module app/domains/invoices/_components/ai/useLocalInvoiceAssistant
 */

"use client";

import type {Invoice} from "@/types/invoices";
import {startTransition, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {analyzeLocalAiHardwareEligibility, type HardwareEligibilityResult} from "./hardwareEligibility";
import {createLocalInvoiceAssistantContext, type LocalInvoiceAssistantContext} from "./invoiceContext";
import {DEFAULT_LOCAL_INVOICE_ASSISTANT_MODEL, recommendLocalInvoiceAssistantModel} from "./modelCatalog";
import {createStreamingResponseBuffer} from "./streamingBuffer";
import type {
  LocalInvoiceAssistantMessage,
  LocalInvoiceAssistantModelMetadata,
  LocalInvoiceAssistantPromptMessage,
  LocalInvoiceAssistantState,
} from "./types";
import {createWebLlmLocalInvoiceAssistantAdapter, type LocalInvoiceAssistantAdapter} from "./webLlmAdapter";

/**
 * Input parameters for useLocalInvoiceAssistant hook.
 */
type UseLocalInvoiceAssistantInput = Readonly<{
  /** If provided, scope context to single invoice (detail view). */
  activeInvoiceId?: string;
  /** Optional pre-configured adapter (for testing). */
  adapter?: LocalInvoiceAssistantAdapter;
  /** Optional injectable hardware analysis function (for testing). */
  analyzeHardware?: () => Promise<HardwareEligibilityResult>;
  /** Optional adapter factory (for testing). */
  createAdapter?: () => LocalInvoiceAssistantAdapter;
  /** Optional message ID generator (for testing). */
  createId?: () => string;
  /** Full invoice list from store. */
  invoices: ReadonlyArray<Invoice>;
  /** LLM model to use (defaults to Llama 3.2 1B). */
  model?: LocalInvoiceAssistantModelMetadata;
  /** Optional time provider (for testing). */
  now?: () => Date;
}>;

/**
 * Return value from useLocalInvoiceAssistant hook.
 */
type UseLocalInvoiceAssistantResult = Readonly<{
  /** Whether model download can be initiated (hardware eligible, not loaded). */
  canLoadModel: boolean;
  /** Whether benchmark can run (model loaded, not generating). */
  canRunBenchmark: boolean;
  /** Whether user can send messages (model loaded, not generating). */
  canSendMessage: boolean;
  /** Sanitized invoice context for prompts. */
  context: LocalInvoiceAssistantContext;
  /** Deletes cached model from Cache API (WebLLM-managed). */
  deleteCachedModel: () => Promise<void>;
  /** Dismisses error and recovers to last valid state. */
  dismissError: () => void;
  /** Interrupts active generation. */
  interrupt: () => void;
  /** Downloads and loads LLM model. */
  loadModel: () => Promise<void>;
  /** Retries hardware capability analysis. */
  retryHardwareAnalysis: () => Promise<void>;
  /** Resets chat session (clears messages). */
  resetSession: () => void;
  /** Runs a privacy-safe benchmark without adding to chat history. */
  runBenchmark: () => Promise<void>;
  /** Sends user message and generates assistant response. */
  sendMessage: (content: string) => Promise<void>;
  /** Current assistant state. */
  state: LocalInvoiceAssistantState;
}>;

/**
 * System prompt instructing LLM to use only sanitized invoice context.
 *
 * @remarks
 * Prevents LLM from hallucinating access to scans, raw OCR, or remote services.
 * Emphasizes local-only capabilities and transparent data limitations.
 *
 * @internal
 */
const LOCAL_INVOICE_ASSISTANT_SYSTEM_PROMPT =
  "You are a local-only invoice assistant. Answer using only the sanitized invoice JSON provided in this prompt. "
  + "Do not claim access to scans, raw OCR, hidden metadata, accounts, or remote services. "
  + "If the invoice data is insufficient, say what is missing and suggest a local-only next step.";

/**
 * Benchmark prompt that avoids invoice-specific content.
 *
 * @remarks
 * Tests model performance without sending invoice data.
 * Targets ~60 tokens for consistent benchmarking.
 *
 * @internal
 */
const LOCAL_INVOICE_ASSISTANT_BENCHMARK_PROMPT =
  "In 3 short sentences, explain how local invoice analysis ensures privacy by running models entirely in the browser without server uploads.";

/**
 * Benchmark prompt version for tracking metrics.
 *
 * @remarks
 * Increment when benchmark prompt changes to track results separately.
 *
 * @internal
 */
const LOCAL_INVOICE_ASSISTANT_BENCHMARK_PROMPT_VERSION = "1.0";

/**
 * Fallback message ID counter for browsers without crypto.randomUUID.
 *
 * @internal
 */
let fallbackMessageId = 0;

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

  fallbackMessageId += 1;
  return `local-invoice-ai-${Date.now()}-${fallbackMessageId}`;
}

/**
 * React hook managing browser-only lifecycle for local invoice AI assistant.
 *
 * @param input - Invoice context and optional injectable dependencies for testing.
 * @returns Local assistant state, chat actions, and error recovery functions.
 *
 * @remarks
 * **Lifecycle:**
 * 1. Mount → Analyze hardware capabilities
 * 2. User action → Download model (if eligible)
 * 3. Model loaded → Enable chat
 * 4. User sends message → Stream LLM response
 * 5. Unmount → Dispose adapter, cleanup resources
 *
 * **Privacy guarantees:**
 * - WebLLM import deferred until explicit load action (no automatic download)
 * - All inference client-side (no server requests)
 * - Session-only chat (no message persistence)
 * - Invoice context sanitized (IDs replaced with aliases)
 *
 * **Error recovery:**
 * - Hardware check failures → Retry button
 * - Download failures → Recoverable error state
 * - Generation failures → Dismiss error, retain chat history
 *
 * **Performance:**
 * - Hardware analysis async (non-blocking)
 * - Model download with progress reporting
 * - Token streaming for responsive UX
 * - Worker-based inference (non-blocking main thread)
 *
 * @example
 * ```typescript
 * function InvoiceAssistant({invoices}: {invoices: Invoice[]}) {
 *   const assistant = useLocalInvoiceAssistant({invoices});
 *
 *   if (assistant.state.lifecycle === 'not-downloaded') {
 *     return <button onClick={assistant.loadModel}>Download AI</button>;
 *   }
 *
 *   if (assistant.state.lifecycle === 'ready') {
 *     return (
 *       <form onSubmit={(e) => {
 *         e.preventDefault();
 *         assistant.sendMessage(inputValue);
 *       }}>
 *         <input />
 *         <button type="submit">Ask</button>
 *       </form>
 *     );
 *   }
 * }
 * ```
 */
export function useLocalInvoiceAssistant(input: UseLocalInvoiceAssistantInput): UseLocalInvoiceAssistantResult {
  const activeModel = input.model ?? DEFAULT_LOCAL_INVOICE_ASSISTANT_MODEL;
  const adapterRef = useRef<LocalInvoiceAssistantAdapter | null>(null);
  const analyzeHardwareRef = useRef(input.analyzeHardware ?? analyzeLocalAiHardwareEligibility);
  const createIdRef = useRef(input.createId ?? createDefaultMessageId);
  const generationIdRef = useRef(0);
  const generationInFlightRef = useRef(false);
  const isMountedRef = useRef(true);
  const nowRef = useRef(input.now ?? (() => new Date()));
  const loadedRef = useRef(false);
  const inputModelRef = useRef<LocalInvoiceAssistantModelMetadata | undefined>(input.model);
  const streamingBufferRef = useRef<ReturnType<typeof createStreamingResponseBuffer> | null>(null);
  const pendingLoadRef = useRef<{controller: AbortController; promise: Promise<void>} | null>(null);
  const canSendMessageRef = useRef(false);

  if (adapterRef.current === null) {
    adapterRef.current = input.adapter ?? input.createAdapter?.() ?? createWebLlmLocalInvoiceAssistantAdapter();
  }

  useEffect(() => {
    analyzeHardwareRef.current = input.analyzeHardware ?? analyzeLocalAiHardwareEligibility;
    createIdRef.current = input.createId ?? createDefaultMessageId;
    inputModelRef.current = input.model;
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
    latestBenchmark: null,
    latestGeneration: null,
    lifecycle: "checking-hardware",
    messages: [],
    progress: 0,
  }));
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const retryHardwareAnalysis = useCallback(async (): Promise<void> => {
    setState((current) => {
      const nextState = {
        ...current,
        error: null,
        hardware: null,
        lifecycle: "checking-hardware" as const,
      };
      stateRef.current = nextState;

      return nextState;
    });

    try {
      const hardware = await analyzeHardwareRef.current();
      if (!isMountedRef.current) {
        return;
      }

      // Task 3: Recommend model based on enriched hardware capabilities
      // GPU limits (maxBufferSize) are NOT VRAM; only pass features, not limits
      const recommendedModel =
        recommendLocalInvoiceAssistantModel({
          hardwareResult: hardware,
          gpuFeatures: hardware.gpu?.features,
          // Do NOT map maxBufferSize to maxVramMB - it's not VRAM
          // GPU limits kept for display/reporting only
        }) ?? DEFAULT_LOCAL_INVOICE_ASSISTANT_MODEL;

      setState((current) => {
        const nextState = {
          ...current,
          activeModel: inputModelRef.current ?? recommendedModel,
          error: null,
          hardware,
          lifecycle: getLifecycleAfterHardwareAnalysis(hardware, loadedRef.current),
        };
        stateRef.current = nextState;

        return nextState;
      });
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      setState((current) => {
        const nextState = {
          ...current,
          error: getErrorMessage(error),
          hardware: null,
          lifecycle: "error" as const,
        };
        stateRef.current = nextState;

        return nextState;
      });
    }
  }, []);

  useEffect(() => {
    void retryHardwareAnalysis();
  }, [retryHardwareAnalysis]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(
    () => () => {
      isMountedRef.current = false;
      pendingLoadRef.current?.controller.abort();
      pendingLoadRef.current = null;
      streamingBufferRef.current?.interrupt();
      streamingBufferRef.current = null;
      void adapterRef.current?.dispose();
    },
    [],
  );

  const loadModel = useCallback(async (): Promise<void> => {
    const adapter = adapterRef.current;
    if (!adapter || !stateRef.current.hardware || stateRef.current.hardware.status === "ineligible") {
      return;
    }

    // Use current recommended model from state, not closed-over default
    const currentModel = stateRef.current.activeModel;

    // If there's already a pending load
    const existingPendingLoad = pendingLoadRef.current;
    if (existingPendingLoad) {
      // If the existing load is aborted, wait for it to settle before starting new load
      if (existingPendingLoad.controller.signal.aborted) {
        // Wait for the aborted load to settle (prevents binding to stale adapter load)
        await existingPendingLoad.promise.catch(() => {
          // Intentional abort errors are expected, ignore them
        });
        const settledPendingLoad = pendingLoadRef.current;
        if (settledPendingLoad && settledPendingLoad !== existingPendingLoad) {
          return settledPendingLoad.promise;
        }

        if (settledPendingLoad === existingPendingLoad) {
          pendingLoadRef.current = null;
        }
      } else {
        // Existing load is still active, reuse it to prevent controller race
        return existingPendingLoad.promise;
      }
    }

    // Create abort controller for this load
    const abortController = new AbortController();

    setState((current) => ({
      ...current,
      error: null,
      lifecycle: "downloading",
      progress: 0,
    }));

    // Create the load promise
    const loadPromise = (async (): Promise<void> => {
      try {
        await adapter.load({
          model: currentModel,
          onProgress: (report) => {
            if (!isMountedRef.current) {
              return;
            }

            setState((current) => ({
              ...current,
              progress: report.progress,
            }));
          },
          signal: abortController.signal,
        });
        
        // Check both mounted state and abort status before marking ready
        if (!isMountedRef.current || abortController.signal.aborted) {
          return;
        }

        loadedRef.current = true;
        canSendMessageRef.current = true;
        setState((current) => ({
          ...current,
          error: null,
          lifecycle: "ready",
          progress: 1,
        }));
      } catch (error) {
        if (!isMountedRef.current) {
          return;
        }

        loadedRef.current = false;

        // If aborted, don't show scary error - just recover to not-downloaded
        if (abortController.signal.aborted) {
          setState((current) => ({
            ...current,
            error: null,
            lifecycle: getRecoveredLifecycle(current.hardware, false),
          }));
        } else {
          setState((current) => ({
            ...current,
            error: getErrorMessage(error),
            lifecycle: "error",
          }));
        }
      } finally {
        // Clean up pending load ref if it's still the current one
        if (pendingLoadRef.current?.controller === abortController) {
          pendingLoadRef.current = null;
        }
      }
    })();

    // Store controller and promise together to prevent race
    pendingLoadRef.current = {controller: abortController, promise: loadPromise};

    return loadPromise;
  }, [activeModel]);

  const sendMessage = useCallback(
    async (content: string): Promise<void> => {
      const trimmedContent = content.trim();
      const adapter = adapterRef.current;

      if (!trimmedContent || !adapter || !loadedRef.current) {
        return;
      }

      // Synchronous guard: only accept sends from send-ready lifecycle states
      if (!canSendMessageRef.current) {
        return;
      }

      // Synchronous guard: prevent overlapping generations
      if (generationInFlightRef.current) {
        return;
      }

      // Mark generation as in-flight before any async work
      generationInFlightRef.current = true;
      canSendMessageRef.current = false;

      const timestamp = nowRef.current().toISOString();
      const userMessage = createMessage(trimmedContent, "user", timestamp, createIdRef.current);
      const assistantMessage = createMessage("", "assistant", timestamp, createIdRef.current);
      const promptMessages = createPromptMessages(context, [...stateRef.current.messages, userMessage]);
      const generationId = generationIdRef.current + 1;
      generationIdRef.current = generationId;

      setState((current) => ({
        ...current,
        error: null,
        lifecycle: "generating",
        messages: [...current.messages, userMessage, assistantMessage],
      }));

      // Track full accumulated response from adapter across token callbacks
      let fullAccumulatedResponse = "";

      // Create streaming buffer with requestAnimationFrame scheduler
      const streamingBuffer = createStreamingResponseBuffer({
        cancel: (id) => globalThis.cancelAnimationFrame(id),
        flush: () => {
          if (!isMountedRef.current || generationIdRef.current !== generationId) {
            return;
          }

          // Use startTransition for non-urgent message updates
          // Replace message content with full accumulated response
          startTransition(() => {
            setState((current) => ({
              ...current,
              messages: replaceMessageContent(current.messages, assistantMessage.id, fullAccumulatedResponse),
            }));
          });
        },
        schedule: (callback) => globalThis.requestAnimationFrame(callback),
      });

      streamingBufferRef.current = streamingBuffer;

      try {
        const response = await adapter.generate(promptMessages, {
          onMetrics: (metrics) => {
            if (!isMountedRef.current || generationIdRef.current !== generationId) {
              return;
            }

            setState((current) => ({
              ...current,
              latestGeneration: metrics,
            }));
          },
          onToken: (_token, accumulatedResponse) => {
            if (!isMountedRef.current || generationIdRef.current !== generationId) {
              return;
            }

            // Update full response and compute delta for buffer
            const previousLength = fullAccumulatedResponse.length;
            fullAccumulatedResponse = accumulatedResponse;
            const delta = accumulatedResponse.slice(previousLength);

            // Append delta to buffer to schedule flush
            streamingBuffer.append(delta);
          },
        });

        if (!isMountedRef.current || generationIdRef.current !== generationId) {
          // Clear in-flight flag even if component unmounted or generation superseded
          generationInFlightRef.current = false;
          return;
        }

        // Force flush final response before returning to ready state
        streamingBuffer.forceFlush();
        streamingBufferRef.current = null;

        setState((current) => ({
          ...current,
          error: null,
          lifecycle: "ready",
          messages: replaceMessageContent(current.messages, assistantMessage.id, response),
        }));

        // Clear in-flight flag and restore send readiness after successful generation
        generationInFlightRef.current = false;
        canSendMessageRef.current = true;
      } catch (error) {
        if (!isMountedRef.current || generationIdRef.current !== generationId) {
          // Clear in-flight flag even if component unmounted or generation superseded
          generationInFlightRef.current = false;
          canSendMessageRef.current = false;
          return;
        }

        // Cancel pending flushes on error
        streamingBuffer.interrupt();
        streamingBufferRef.current = null;

        setState((current) => ({
          ...current,
          error: getErrorMessage(error),
          lifecycle: "error",
          messages: current.messages.filter((message) => message.id !== assistantMessage.id),
        }));

        // Clear in-flight flag after error (but do NOT restore send readiness - error state is not send-ready)
        generationInFlightRef.current = false;
        canSendMessageRef.current = false;
      }
    },
    [context],
  );

  const dismissError = useCallback((): void => {
    const recoveredLifecycle = getRecoveredLifecycle(stateRef.current.hardware, loadedRef.current);
    // Restore send readiness if recovered lifecycle is send-ready ("ready" or "cancelled")
    canSendMessageRef.current = recoveredLifecycle === "ready" || recoveredLifecycle === "cancelled";
    setState((current) => ({
      ...current,
      error: null,
      lifecycle: recoveredLifecycle,
    }));
  }, []);

  const interrupt = useCallback((): void => {
    generationIdRef.current += 1;
    adapterRef.current?.interrupt();
    streamingBufferRef.current?.interrupt();
    streamingBufferRef.current = null;
    // Interrupt transitions to "cancelled" which is send-ready
    if (loadedRef.current) {
      canSendMessageRef.current = true;
    }
    setState((current) => ({
      ...current,
      lifecycle: loadedRef.current ? "cancelled" : current.lifecycle,
    }));
  }, []);

  const resetSession = useCallback((): void => {
    generationIdRef.current += 1;
    // Abort the pending load but keep the ref until promise settles
    // This prevents retry from binding to stale adapter load
    pendingLoadRef.current?.controller.abort();
    streamingBufferRef.current?.interrupt();
    streamingBufferRef.current = null;
    const recoveredLifecycle = getRecoveredLifecycle(stateRef.current.hardware, loadedRef.current);
    // Restore send readiness if recovered lifecycle is send-ready ("ready" or "cancelled")
    canSendMessageRef.current = recoveredLifecycle === "ready" || recoveredLifecycle === "cancelled";
    setState((current) => ({
      ...current,
      error: null,
      lifecycle: recoveredLifecycle,
      messages: [],
    }));
  }, []);


  const runBenchmark = useCallback(async (): Promise<void> => {
    const adapter = adapterRef.current;

    if (!adapter || !loadedRef.current || stateRef.current.lifecycle !== "ready") {
      return;
    }

    const benchmarkMessages: LocalInvoiceAssistantPromptMessage[] = [
      {
        content: LOCAL_INVOICE_ASSISTANT_BENCHMARK_PROMPT,
        role: "user",
      },
    ];
    const generationId = generationIdRef.current + 1;
    generationIdRef.current = generationId;

    setState((current) => ({
      ...current,
      error: null,
      lifecycle: "generating",
    }));

    try {
      await adapter.generate(benchmarkMessages, {
        benchmarkPromptVersion: LOCAL_INVOICE_ASSISTANT_BENCHMARK_PROMPT_VERSION,
        onMetrics: (metrics) => {
          if (!isMountedRef.current || generationIdRef.current !== generationId) {
            return;
          }

          setState((current) => ({
            ...current,
            latestBenchmark: metrics,
          }));
        },
      });

      if (!isMountedRef.current || generationIdRef.current !== generationId) {
        return;
      }

      setState((current) => ({
        ...current,
        error: null,
        lifecycle: "ready",
      }));
    } catch (error) {
      if (!isMountedRef.current || generationIdRef.current !== generationId) {
        return;
      }

      setState((current) => ({
        ...current,
        error: getErrorMessage(error),
        lifecycle: "error",
      }));
    }
  }, []);

  const deleteCachedModel = useCallback(async (): Promise<void> => {
    generationIdRef.current += 1;
    streamingBufferRef.current?.interrupt();
    streamingBufferRef.current = null;

    // Abort any active load but keep the ref until promise settles
    // This prevents retry from binding to stale adapter load
    pendingLoadRef.current?.controller.abort();

    // Use current model from state, not closed-over default
    const currentModel = stateRef.current.activeModel;

    try {
      await adapterRef.current?.deleteCachedModel(currentModel);
      if (!isMountedRef.current) {
        return;
      }

      loadedRef.current = false;
      setState((current) => ({
        ...current,
        error: null,
        lifecycle: getRecoveredLifecycle(current.hardware, false),
        progress: 0,
      }));
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      loadedRef.current = false;
      setState((current) => ({
        ...current,
        error: getErrorMessage(error),
        lifecycle: "error",
        progress: 0,
      }));
    }
  }, [activeModel]);

  const canLoadModel =
    state.hardware !== null
    && state.hardware.status !== "ineligible"
    && (state.lifecycle === "not-downloaded"
      || state.lifecycle === "compatibility-unknown"
      || (state.lifecycle === "error" && !loadedRef.current));
  const canRunBenchmark = state.lifecycle === "ready";
  const canSendMessage = state.lifecycle === "ready" || state.lifecycle === "cancelled";

  return {
    canLoadModel,
    canRunBenchmark,
    canSendMessage,
    context,
    deleteCachedModel,
    dismissError,
    interrupt,
    loadModel,
    retryHardwareAnalysis,
    resetSession,
    runBenchmark,
    sendMessage,
    state,
  };
}


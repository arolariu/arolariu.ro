"use client";

/**
 * @fileoverview useInvoiceAssistant hook — ties reducer + hosts + pipeline.
 * @module app/domains/invoices/_components/ai/useInvoiceAssistant
 *
 * @remarks
 * The two worker hosts are MODULE-LEVEL SINGLETONS. They survive React
 * unmount/remount cycles (e.g. the user switching between the Chat and
 * Settings tabs) so the embedding model doesn't have to reload every
 * time. Only a full page navigation or browser tab close tears them
 * down (the host's beforeunload handler — see workers/host).
 *
 * The reducer state, by contrast, is per-hook-instance (per mount).
 * This means conversation history clears on hook unmount, matching the
 * H1 architectural lock from the spec brainstorm.
 *
 * The hook is responsible for:
 * 1. The reducer state machine.
 * 2. Subscribing to the singleton hosts and reflecting their load
 *    progress into the reducer.
 * 3. The classify -> resolve -> aggregate -> render pipeline on
 *    submitQuestion().
 * 4. Auto-restart of the slot host when consecutiveTimeouts >= 2.
 * 5. Re-creating a singleton if it has been disposed (Strict-Mode safe).
 */

import {useInvoicesStore} from "@/stores";
import {WorkerCrashError, WorkerTimeoutError, type WorkerHost} from "@/workers";
import {useCallback, useEffect, useReducer} from "react";
import {runAggregator} from "./aggregators";
import {assistantReducer, initialState, type State} from "./assistantReducer";
import {checkHardwareEligibility} from "./hardwareEligibility";
import {createEmbeddingHost} from "./hosts/embeddingHost";
import {createSlotExtractorHost} from "./hosts/slotExtractorHost";
import {resolveIntent} from "./intents/intentResolver";
import {renderAnswer, type Translator} from "./renderer/answerRenderer";
import {CONFIDENCE_THRESHOLDS, type AssistantLocale, type IntentId} from "./types";
import type {EmbeddingWorkerApi} from "./workers/embedding.api";
import type {SlotExtractorWorkerApi} from "./workers/slotExtractor.api";

// ── Module-level singleton hosts ──────────────────────────────────────────

let embedHostSingleton: WorkerHost<EmbeddingWorkerApi> | null = null;
let slotHostSingleton: WorkerHost<SlotExtractorWorkerApi> | null = null;
let embedLoadPromise: Promise<void> | null = null;

function getEmbedHost(): WorkerHost<EmbeddingWorkerApi> {
  if (!embedHostSingleton || embedHostSingleton.state === "disposed") {
    embedHostSingleton = createEmbeddingHost();
    embedLoadPromise = null;
  }
  return embedHostSingleton;
}

function getSlotHost(): WorkerHost<SlotExtractorWorkerApi> {
  if (!slotHostSingleton || slotHostSingleton.state === "disposed") {
    slotHostSingleton = createSlotExtractorHost();
  }
  return slotHostSingleton;
}

function ensureEmbedLoaded(): Promise<void> {
  if (embedLoadPromise) return embedLoadPromise;
  const host = getEmbedHost();
  embedLoadPromise = host.api.ensureLoaded();
  return embedLoadPromise;
}

function clearEmbedSingleton(): void {
  if (embedHostSingleton) {
    void embedHostSingleton.dispose();
  }
  embedHostSingleton = null;
  embedLoadPromise = null;
}

function clearSlotSingleton(): void {
  if (slotHostSingleton) {
    void slotHostSingleton.dispose();
  }
  slotHostSingleton = null;
}

// ── Hook ──────────────────────────────────────────────────────────────────

export type UseInvoiceAssistantOptions = Readonly<{
  locale: AssistantLocale;
  t?: Translator;
}>;

export type UseInvoiceAssistantReturn = Readonly<{
  state: State;
  submitQuestion: (question: string) => Promise<void>;
  enableLayer2: () => Promise<void>;
  resetConversation: () => void;
  retryEmbeddingLoad: () => void;
}>;

export function useInvoiceAssistant(opts: UseInvoiceAssistantOptions): UseInvoiceAssistantReturn {
  const [state, dispatch] = useReducer(assistantReducer, {...initialState, locale: opts.locale} as State);

  // On mount: probe hardware, ensure the singleton embed host is loaded.
  // If the host is already loaded (singleton survived a remount), we simply
  // reflect "embedding-ready" immediately — no reload, no progress bar.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const eligibility = await checkHardwareEligibility();
      if (cancelled) return;
      dispatch({
        type: "capabilityResolved",
        workersAvailable: typeof Worker !== "undefined",
        layer2Eligibility: eligibility,
      });
      try {
        await ensureEmbedLoaded();
        if (cancelled) return;
        dispatch({type: "embeddingLoaded"});
      } catch (err) {
        if (cancelled) return;
        dispatch({type: "embeddingFailed", error: String(err)});
      }
    })();
    return () => {
      cancelled = true;
      // Intentionally NOT disposing the embed host on unmount — the
      // singleton outlives this React tree so tab-switches don't reload
      // the ~118 MB model.
    };
  }, []);

  // Reflect Layer 2 ready state if the singleton was already loaded
  // before this hook instance mounted (e.g. user switched to Settings
  // and back).
  useEffect(() => {
    if (slotHostSingleton && slotHostSingleton.state !== "disposed" && state.layer2.status !== "ready") {
      dispatch({type: "layer2Loaded"});
    }
    // We only want this to run on mount. The reducer sub-state comparison
    // guards against repeat dispatches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-restart slot host on consecutive timeouts.
  useEffect(() => {
    if (state.shouldRestartSlotHost && slotHostSingleton) {
      void (slotHostSingleton as unknown as {restart?: () => Promise<void>}).restart?.();
      dispatch({type: "resetSlotHostFlag"});
    }
  }, [state.shouldRestartSlotHost]);

  const submitQuestion = useCallback(async (question: string): Promise<void> => {
    dispatch({type: "questionSubmitted", question, locale: opts.locale});
    try {
      const embedHost = getEmbedHost();
      const c = await embedHost.api.classify({question, locale: opts.locale});
      let resolved: ReturnType<typeof resolveIntent>;
      const slotHostReady = slotHostSingleton && slotHostSingleton.state !== "disposed";
      if (c.topScore >= CONFIDENCE_THRESHOLDS.canonical) {
        resolved = resolveIntent({intent: c.topIntent as IntentId, slots: {}, question, locale: opts.locale});
      } else if (c.topScore >= CONFIDENCE_THRESHOLDS.uncertain && slotHostReady) {
        dispatch({type: "slotExtracting"});
        try {
          const ext = await slotHostSingleton!.api.extract({
            question,
            locale: opts.locale,
            candidateIntents: c.candidates.map((x) => x.intent),
          });
          resolved = resolveIntent({intent: ext.intent as IntentId, slots: ext.slots, question, locale: opts.locale});
        } catch (err) {
          if (err instanceof WorkerTimeoutError) {
            dispatch({type: "slotLlmTimeout"});
            return;
          }
          throw err;
        }
      } else {
        dispatch({type: "outOfScope", reason: "low-confidence"});
        return;
      }
      if (resolved.status === "out-of-scope") {
        dispatch({type: "outOfScope", reason: resolved.reason});
        return;
      }
      const invoices = useInvoicesStore.getState().entities;
      const answer = runAggregator(resolved.intent, invoices, resolved.slots, new Date());
      const t: Translator = opts.t ?? ((key: string) => key);
      const rendered = renderAnswer(answer, t);
      dispatch({
        type: "answerReady",
        question,
        intent: resolved.intent,
        slots: resolved.slots,
        prose: rendered.prose,
        viz: rendered.viz,
        payload: rendered.payload,
      });
    } catch (err) {
      if (err instanceof WorkerCrashError) {
        dispatch({type: "aggregatorError", error: "Worker crashed"});
        return;
      }
      dispatch({type: "aggregatorError", error: String(err)});
    }
  }, [opts.locale, opts.t]);

  const enableLayer2 = useCallback(async (): Promise<void> => {
    if (slotHostSingleton && slotHostSingleton.state !== "disposed") return;
    dispatch({type: "layer2OptInClicked"});
    const newHost = getSlotHost();
    try {
      await newHost.api.ensureLoaded();
      dispatch({type: "layer2Loaded"});
    } catch (err) {
      // Tear down the dead host so the user can retry — the slotHost null check
      // would otherwise permanently block enableLayer2 after a failed load.
      clearSlotSingleton();
      dispatch({type: "layer2Failed", error: String(err)});
    }
  }, []);

  const resetConversation = useCallback(() => dispatch({type: "resetConversation"}), []);

  const retryEmbeddingLoad = useCallback((): void => {
    dispatch({type: "retryEmbeddingLoad"});
    clearEmbedSingleton();
    void (async () => {
      try {
        await ensureEmbedLoaded();
        dispatch({type: "embeddingLoaded"});
      } catch (err) {
        dispatch({type: "embeddingFailed", error: String(err)});
      }
    })();
  }, []);

  return {state, submitQuestion, enableLayer2, resetConversation, retryEmbeddingLoad};
}
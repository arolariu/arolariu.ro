"use client";

/**
 * @fileoverview useInvoiceAssistant hook — ties reducer + hosts + pipeline.
 * @module app/domains/invoices/_components/ai/useInvoiceAssistant
 *
 * @remarks
 * Owns:
 * 1. The reducer state machine.
 * 2. Two worker hosts: Layer 1 (embedding) eager, Layer 2 (slot LLM) lazy on opt-in.
 * 3. Strict-Mode-safe mounting pattern (re-create host on `state === "disposed"`).
 * 4. The classify -> resolve -> aggregate -> render pipeline on submitQuestion().
 * 5. Auto-restart of the slot host when consecutiveTimeouts >= 2.
 */

import {useInvoicesStore} from "@/stores";
import {WorkerCrashError, WorkerTimeoutError, type WorkerHost} from "@/workers";
import {useCallback, useEffect, useReducer, useState} from "react";
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

export type UseInvoiceAssistantOptions = Readonly<{
  locale: AssistantLocale;
  t?: Translator;
}>;

export type UseInvoiceAssistantReturn = Readonly<{
  state: State;
  submitQuestion: (question: string) => Promise<void>;
  enableLayer2: () => Promise<void>;
  resetConversation: () => void;
}>;

export function useInvoiceAssistant(opts: UseInvoiceAssistantOptions): UseInvoiceAssistantReturn {
  const [state, dispatch] = useReducer(assistantReducer, {...initialState, locale: opts.locale} as State);
  const [embedHost, setEmbedHost] = useState<WorkerHost<EmbeddingWorkerApi>>(() => createEmbeddingHost());
  const [slotHost, setSlotHost] = useState<WorkerHost<SlotExtractorWorkerApi> | null>(null);

  useEffect(() => {
    if (embedHost.state === "disposed") {
      setEmbedHost(createEmbeddingHost());
      return;
    }
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
        await embedHost.api.ensureLoaded();
        if (cancelled) return;
        dispatch({type: "embeddingLoaded"});
      } catch (err) {
        if (cancelled) return;
        dispatch({type: "embeddingFailed", error: String(err)});
      }
    })();
    return () => {
      cancelled = true;
      void embedHost.dispose();
    };
  }, [embedHost]);

  useEffect(() => {
    if (state.shouldRestartSlotHost && slotHost) {
      void (slotHost as unknown as {restart?: () => Promise<void>}).restart?.();
      dispatch({type: "resetSlotHostFlag"});
    }
  }, [state.shouldRestartSlotHost, slotHost]);

  // Dispose the slot host (Layer 2 LLM, ~1 GB resident) on unmount or replacement.
  // Without this the Worker thread + MLCEngine survive every navigation.
  useEffect(() => {
    return () => {
      void slotHost?.dispose();
    };
  }, [slotHost]);

  const submitQuestion = useCallback(
    async (question: string): Promise<void> => {
      dispatch({type: "questionSubmitted", question, locale: opts.locale});
      try {
        const c = await embedHost.api.classify({question, locale: opts.locale});
        let resolved: ReturnType<typeof resolveIntent>;
        if (c.topScore >= CONFIDENCE_THRESHOLDS.canonical) {
          resolved = resolveIntent({intent: c.topIntent as IntentId, slots: {}, question, locale: opts.locale});
        } else if (c.topScore >= CONFIDENCE_THRESHOLDS.uncertain && slotHost) {
          dispatch({type: "slotExtracting"});
          try {
            const ext = await slotHost.api.extract({
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
    },
    [embedHost, slotHost, opts.locale, opts.t],
  );

  const enableLayer2 = useCallback(async (): Promise<void> => {
    if (slotHost) return;
    dispatch({type: "layer2OptInClicked"});
    const newHost = createSlotExtractorHost();
    setSlotHost(newHost);
    try {
      await newHost.api.ensureLoaded();
      dispatch({type: "layer2Loaded"});
    } catch (err) {
      // Tear down the dead host so the user can retry — the slotHost null check
      // would otherwise permanently block enableLayer2 after a failed load.
      void newHost.dispose();
      setSlotHost(null);
      dispatch({type: "layer2Failed", error: String(err)});
    }
  }, [slotHost]);

  const resetConversation = useCallback(() => dispatch({type: "resetConversation"}), []);

  return {state, submitQuestion, enableLayer2, resetConversation};
}

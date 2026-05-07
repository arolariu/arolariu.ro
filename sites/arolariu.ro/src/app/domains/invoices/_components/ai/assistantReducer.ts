/**
 * @fileoverview Assistant state machine reducer.
 * @module app/domains/invoices/_components/ai/assistantReducer
 *
 * @remarks
 * Discriminated State union covering the full UX state machine. Action
 * union covers every transition surface from the hook. History is capped
 * at HISTORY_CAP entries (oldest evicted). Two consecutive slotLlmTimeout
 * actions raise the shouldRestartSlotHost one-shot flag, which the hook
 * reads then clears via resetSlotHostFlag.
 *
 * Layer 2 sub-state is independent of the main status; the assistant can
 * be answering questions while the Layer-2 model is downloading.
 */

import type {AssistantLocale, IntentId, VizHint} from "./types";
import type {ResolvedSlots} from "./intents/intentResolver";
import type {HardwareEligibilityResult} from "./hardwareEligibility";

const HISTORY_CAP = 50;

export type HistoryEntry = Readonly<{
  question: string;
  intent: IntentId;
  slots: ResolvedSlots;
  prose: string;
  viz: VizHint;
  payload: unknown;
}>;

export type Layer2State =
  | Readonly<{status: "ineligible"; reasons: ReadonlyArray<string>}>
  | Readonly<{status: "eligible"}>
  | Readonly<{status: "downloading"; progress: number}>
  | Readonly<{status: "ready"}>
  | Readonly<{status: "failed"; error: string}>;

type Common = Readonly<{
  locale: AssistantLocale;
  history: ReadonlyArray<HistoryEntry>;
  consecutiveTimeouts: number;
  shouldRestartSlotHost: boolean;
  layer2: Layer2State;
}>;

export type State = Common &
  (
    | Readonly<{status: "capability-check"}>
    | Readonly<{status: "workers-unavailable"}>
    | Readonly<{status: "embedding-loading"; progress: number}>
    | Readonly<{status: "embedding-failed"; error: string}>
    | Readonly<{status: "embedding-ready"}>
    | Readonly<{status: "classifying"; question: string}>
    | Readonly<{status: "slot-extracting"; question: string}>
    | Readonly<{status: "answered"; question: string; intent: IntentId; slots: ResolvedSlots; prose: string; viz: VizHint; payload: unknown}>
    | Readonly<{status: "out-of-scope"; reason: string}>
    | Readonly<{status: "aggregator-error"; error: string}>
  );

export type Action =
  | Readonly<{type: "capabilityResolved"; workersAvailable: boolean; layer2Eligibility: HardwareEligibilityResult}>
  | Readonly<{type: "embeddingProgress"; progress: number}>
  | Readonly<{type: "embeddingLoaded"}>
  | Readonly<{type: "embeddingFailed"; error: string}>
  | Readonly<{type: "questionSubmitted"; question: string; locale: AssistantLocale}>
  | Readonly<{type: "slotExtracting"}>
  | Readonly<{type: "slotLlmTimeout"}>
  | Readonly<{type: "answerReady"; question: string; intent: IntentId; slots: ResolvedSlots; prose: string; viz: VizHint; payload: unknown}>
  | Readonly<{type: "outOfScope"; reason: string}>
  | Readonly<{type: "aggregatorError"; error: string}>
  | Readonly<{type: "layer2OptInClicked"}>
  | Readonly<{type: "layer2Progress"; progress: number}>
  | Readonly<{type: "layer2Loaded"}>
  | Readonly<{type: "layer2Failed"; error: string}>
  | Readonly<{type: "resetConversation"}>
  | Readonly<{type: "resetSlotHostFlag"}>
  | Readonly<{type: "retryEmbeddingLoad"}>;

export const initialState: State = {
  status: "capability-check",
  locale: "en",
  history: [],
  consecutiveTimeouts: 0,
  shouldRestartSlotHost: false,
  layer2: {status: "ineligible", reasons: []},
};

function appendHistory(history: ReadonlyArray<HistoryEntry>, entry: HistoryEntry): ReadonlyArray<HistoryEntry> {
  const next = [...history, entry];
  return next.length > HISTORY_CAP ? next.slice(next.length - HISTORY_CAP) : next;
}

export function assistantReducer(state: State, action: Action): State {
  switch (action.type) {
    case "capabilityResolved": {
      if (!action.workersAvailable) {
        return {...state, status: "workers-unavailable"};
      }
      const layer2: Layer2State =
        action.layer2Eligibility.status === "eligible" || action.layer2Eligibility.status === "unknown"
          ? {status: "eligible"}
          : {status: "ineligible", reasons: action.layer2Eligibility.reasons};
      return {...state, status: "embedding-loading", progress: 0, layer2};
    }
    case "embeddingProgress":
      if (state.status !== "embedding-loading") return state;
      return {...state, status: "embedding-loading", progress: action.progress};
    case "embeddingLoaded":
      return {...state, status: "embedding-ready"};
    case "embeddingFailed":
      return {...state, status: "embedding-failed", error: action.error};
    case "questionSubmitted":
      return {...state, status: "classifying", question: action.question, locale: action.locale};
    case "slotExtracting": {
      const question = "question" in state && typeof (state as {question?: unknown}).question === "string" ? (state as {question: string}).question : "";
      return {...state, status: "slot-extracting", question};
    }
    case "slotLlmTimeout": {
      const next = state.consecutiveTimeouts + 1;
      return {
        ...state,
        status: "out-of-scope",
        reason: "slot-llm-timeout",
        consecutiveTimeouts: next,
        shouldRestartSlotHost: next >= 2 ? true : state.shouldRestartSlotHost,
      };
    }
    case "answerReady": {
      const entry: HistoryEntry = {
        question: action.question,
        intent: action.intent,
        slots: action.slots,
        prose: action.prose,
        viz: action.viz,
        payload: action.payload,
      };
      return {
        ...state,
        status: "answered",
        question: action.question,
        intent: action.intent,
        slots: action.slots,
        prose: action.prose,
        viz: action.viz,
        payload: action.payload,
        history: appendHistory(state.history, entry),
        consecutiveTimeouts: 0,
        shouldRestartSlotHost: false,
      };
    }
    case "outOfScope":
      return {...state, status: "out-of-scope", reason: action.reason};
    case "aggregatorError":
      return {...state, status: "aggregator-error", error: action.error};
    case "layer2OptInClicked": {
      if (state.layer2.status !== "eligible") return state;
      return {...state, layer2: {status: "downloading", progress: 0}};
    }
    case "layer2Progress":
      if (state.layer2.status !== "downloading") return state;
      return {...state, layer2: {status: "downloading", progress: action.progress}};
    case "layer2Loaded":
      return {...state, layer2: {status: "ready"}};
    case "layer2Failed":
      return {...state, layer2: {status: "failed", error: action.error}};
    case "resetConversation":
      return {
        ...state,
        status: state.status === "embedding-loading" || state.status === "capability-check" || state.status === "embedding-failed" || state.status === "workers-unavailable" ? state.status : "embedding-ready",
        history: [],
        consecutiveTimeouts: 0,
        shouldRestartSlotHost: false,
      } as State;
    case "resetSlotHostFlag":
      return {...state, shouldRestartSlotHost: false};
    case "retryEmbeddingLoad":
      // Allow the user to retry from the embedding-failed terminal.
      // The hook will dispose+recreate the embed host so the load cycle
      // restarts; the reducer just resets the visible status.
      return {...state, status: "capability-check"};
  }
}
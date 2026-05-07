import {describe, expect, it} from "vitest";
import {assistantReducer, initialState, type State} from "./assistantReducer";

describe("assistantReducer", () => {
  it("starts in capability-check", () => {
    expect(initialState.status).toBe("capability-check");
    expect(initialState.history).toEqual([]);
    expect(initialState.layer2.status).toBe("ineligible");
  });

  it("capabilityResolved with workers=false transitions to workers-unavailable", () => {
    const next = assistantReducer(initialState, {type: "capabilityResolved", workersAvailable: false, layer2Eligibility: {status: "ineligible", reasons: ["workers-unavailable"]}});
    expect(next.status).toBe("workers-unavailable");
  });

  it("capabilityResolved with eligible Layer 2 transitions to embedding-loading", () => {
    const next = assistantReducer(initialState, {type: "capabilityResolved", workersAvailable: true, layer2Eligibility: {status: "eligible", reasons: []}});
    expect(next.status).toBe("embedding-loading");
    expect(next.layer2.status).toBe("eligible");
  });

  it("embeddingLoaded transitions from embedding-loading to embedding-ready", () => {
    const loading = assistantReducer(initialState, {type: "capabilityResolved", workersAvailable: true, layer2Eligibility: {status: "eligible", reasons: []}});
    const ready = assistantReducer(loading, {type: "embeddingLoaded"});
    expect(ready.status).toBe("embedding-ready");
  });

  it("questionSubmitted -> classifying with question stored", () => {
    const ready: State = {...initialState, status: "embedding-ready"};
    const next = assistantReducer(ready, {type: "questionSubmitted", question: "top merchants", locale: "en"});
    expect(next.status).toBe("classifying");
    if (next.status === "classifying") expect(next.question).toBe("top merchants");
  });

  it("answerReady appends to history and resets consecutiveTimeouts", () => {
    const classifying: State = {...initialState, status: "classifying", question: "q", consecutiveTimeouts: 1};
    const next = assistantReducer(classifying, {type: "answerReady", question: "q", intent: "totalSpend", slots: {}, prose: "p", viz: "single-stat", payload: {}});
    expect(next.status).toBe("answered");
    expect(next.history).toHaveLength(1);
    expect(next.consecutiveTimeouts).toBe(0);
  });

  it("two consecutive slotLlmTimeout actions raise shouldRestartSlotHost", () => {
    const ready: State = {...initialState, status: "slot-extracting", question: "q"};
    const after1 = assistantReducer(ready, {type: "slotLlmTimeout"});
    expect(after1.shouldRestartSlotHost).toBe(false);
    expect(after1.consecutiveTimeouts).toBe(1);
    const after2 = assistantReducer(after1, {type: "slotLlmTimeout"});
    expect(after2.shouldRestartSlotHost).toBe(true);
    expect(after2.consecutiveTimeouts).toBe(2);
  });

  it("history caps at 50 entries (oldest evicted)", () => {
    let s: State = {...initialState, status: "embedding-ready"};
    for (let i = 0; i < 55; i++) {
      s = assistantReducer(s, {type: "answerReady", question: `q${i}`, intent: "totalSpend", slots: {}, prose: `p${i}`, viz: "single-stat", payload: {}});
    }
    expect(s.history).toHaveLength(50);
    expect(s.history[0]!.question).toBe("q5");
    expect(s.history[49]!.question).toBe("q54");
  });

  it("resetConversation clears history and timeout counters", () => {
    const populated: State = {...initialState, status: "answered", question: "q", intent: "totalSpend", slots: {}, prose: "p", viz: "single-stat", payload: {}, history: [{question: "q", intent: "totalSpend", slots: {}, prose: "p", viz: "single-stat", payload: {}}], consecutiveTimeouts: 1, shouldRestartSlotHost: true};
    const next = assistantReducer(populated, {type: "resetConversation"});
    expect(next.history).toHaveLength(0);
    expect(next.consecutiveTimeouts).toBe(0);
    expect(next.shouldRestartSlotHost).toBe(false);
    expect(next.status).toBe("embedding-ready");
  });

  it("layer2OptInClicked transitions Layer 2 from eligible to downloading", () => {
    const eligible: State = {...initialState, status: "embedding-ready", layer2: {status: "eligible"}};
    const next = assistantReducer(eligible, {type: "layer2OptInClicked"});
    expect(next.layer2.status).toBe("downloading");
  });

  it("layer2Loaded transitions Layer 2 to ready", () => {
    const downloading: State = {...initialState, status: "embedding-ready", layer2: {status: "downloading", progress: 50}};
    const next = assistantReducer(downloading, {type: "layer2Loaded"});
    expect(next.layer2.status).toBe("ready");
  });

  it("resetSlotHostFlag clears the one-shot flag", () => {
    const flagged: State = {...initialState, status: "embedding-ready", shouldRestartSlotHost: true};
    const next = assistantReducer(flagged, {type: "resetSlotHostFlag"});
    expect(next.shouldRestartSlotHost).toBe(false);
  });
});
import {act, renderHook, waitFor} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

const mocks = vi.hoisted(() => {
  return {
    ensureLoaded: vi.fn(async () => undefined),
    classify: vi.fn(async () => ({
      topIntent: "totalSpend",
      topScore: 0.9,
      candidates: [{intent: "totalSpend", score: 0.9}],
    })),
    dispose: vi.fn(async () => undefined),
    subscribe: vi.fn(() => () => {}),
  };
});

vi.mock("./hosts/embeddingHost", () => ({
  createEmbeddingHost: () => ({
    api: {ensureLoaded: mocks.ensureLoaded, classify: mocks.classify},
    state: "idle",
    subscribe: mocks.subscribe,
    dispose: mocks.dispose,
    capabilities: {hasWebGpu: true, crossOriginIsolated: false},
    restart: vi.fn(),
    warmUp: vi.fn(),
  }),
}));

vi.mock("./hosts/slotExtractorHost", () => ({
  createSlotExtractorHost: () => ({
    api: {ensureLoaded: vi.fn(async () => undefined), extract: vi.fn(), unload: vi.fn()},
    state: "idle",
    subscribe: vi.fn(() => () => {}),
    dispose: vi.fn(async () => undefined),
    restart: vi.fn(),
    warmUp: vi.fn(),
  }),
}));

vi.mock("./hardwareEligibility", () => ({
  checkHardwareEligibility: vi.fn(async () => ({status: "eligible", reasons: []})),
}));

vi.mock("@/stores", () => ({
  useInvoicesStore: {getState: () => ({entities: []})},
}));

const {useInvoiceAssistant} = await import("./useInvoiceAssistant");

describe("useInvoiceAssistant", () => {
  it("transitions through capability-check -> embedding-loading -> embedding-ready", async () => {
    const {result} = renderHook(() => useInvoiceAssistant({locale: "en"}));
    await waitFor(() => expect(result.current.state.status).toBe("embedding-ready"));
  });

  it("submitQuestion handles canonical question end-to-end (answered or out-of-scope on empty corpus)", async () => {
    const {result} = renderHook(() => useInvoiceAssistant({locale: "en"}));
    await waitFor(() => expect(result.current.state.status).toBe("embedding-ready"));
    await act(async () => {
      await result.current.submitQuestion("how much last month");
    });
    expect(["answered", "out-of-scope"]).toContain(result.current.state.status);
  });
});
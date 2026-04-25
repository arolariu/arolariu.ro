import {InvoiceBuilder} from "@/data/mocks";
import {act, renderHook, waitFor} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import type {HardwareEligibilityResult} from "./hardwareEligibility";
import {DEFAULT_LOCAL_AI_HARDWARE_REQUIREMENTS} from "./hardwareEligibility";
import {useLocalInvoiceAssistant} from "./useLocalInvoiceAssistant";
import type {LocalInvoiceAssistantAdapter, LocalInvoiceAssistantProgressReport} from "./webLlmAdapter";

const eligibleHardware = {
  availableStorageBytes: 8 * 1024 ** 3,
  reasons: [],
  requirements: DEFAULT_LOCAL_AI_HARDWARE_REQUIREMENTS,
  status: "eligible",
} as const satisfies HardwareEligibilityResult;

const ineligibleHardware = {
  availableStorageBytes: 2 * 1024 ** 3,
  reasons: ["webgpu-unavailable", "storage-quota-too-low"],
  requirements: DEFAULT_LOCAL_AI_HARDWARE_REQUIREMENTS,
  status: "ineligible",
} as const satisfies HardwareEligibilityResult;

describe("useLocalInvoiceAssistant", () => {
  it("marks hardware-ineligible devices as unavailable before model loading", async () => {
    const adapter = createFakeAdapter();

    const {result} = renderHook(() =>
      useLocalInvoiceAssistant({
        adapter,
        analyzeHardware: async () => ineligibleHardware,
        createId: createSequentialIdFactory(),
        invoices: [],
        now: () => new Date("2026-01-01T00:00:00.000Z"),
      }),
    );

    await waitFor(() => {
      expect(result.current.state.lifecycle).toBe("hardware-ineligible");
    });

    expect(result.current.canLoadModel).toBe(false);
    expect(result.current.canSendMessage).toBe(false);
    expect(adapter.load).not.toHaveBeenCalled();
  });

  it("loads the local model after eligible hardware and tracks progress", async () => {
    const progressReport: LocalInvoiceAssistantProgressReport = {
      progress: 0.56,
      text: "Fetching model shard",
      timeElapsed: 2,
    };
    const adapter = createFakeAdapter({
      load: vi.fn(async ({onProgress}) => {
        onProgress?.(progressReport);
      }),
    });

    const {result} = renderHook(() =>
      useLocalInvoiceAssistant({
        adapter,
        analyzeHardware: async () => eligibleHardware,
        createId: createSequentialIdFactory(),
        invoices: [],
        now: () => new Date("2026-01-01T00:00:00.000Z"),
      }),
    );

    await waitFor(() => {
      expect(result.current.state.lifecycle).toBe("not-downloaded");
    });

    await act(async () => {
      await result.current.loadModel();
    });

    expect(adapter.load).toHaveBeenCalledOnce();
    expect(result.current.state.lifecycle).toBe("ready");
    expect(result.current.state.progress).toBe(1);
  });

  it("streams responses into session messages using only sanitized invoice context", async () => {
    const capturedPrompts: string[] = [];
    const invoice = new InvoiceBuilder()
      .withId("invoice-local-ai")
      .withName("Sensitive grocery receipt")
      .withAdditionalMetadata({rawOcr: "secret raw OCR"})
      .withSharedWith(["shared-user"])
      .withPaymentAmount(125)
      .withPaymentCurrency("RON")
      .build();
    const adapter = createFakeAdapter({
      generate: vi.fn(async (messages, options) => {
        capturedPrompts.push(JSON.stringify(messages));
        options?.onToken?.("Largest ", "Largest ");
        options?.onToken?.("invoice is 125 RON.", "Largest invoice is 125 RON.");

        return "Largest invoice is 125 RON.";
      }),
    });

    const {result} = renderHook(() =>
      useLocalInvoiceAssistant({
        adapter,
        analyzeHardware: async () => eligibleHardware,
        createId: createSequentialIdFactory(),
        invoices: [invoice],
        now: () => new Date("2026-01-01T00:00:00.000Z"),
      }),
    );

    await waitFor(() => {
      expect(result.current.state.lifecycle).toBe("not-downloaded");
    });
    await act(async () => {
      await result.current.loadModel();
      await result.current.sendMessage("Which invoice is largest?");
    });

    expect(result.current.state.lifecycle).toBe("ready");
    expect(result.current.state.messages).toEqual([
      {
        content: "Which invoice is largest?",
        id: "message-1",
        role: "user",
        timestamp: "2026-01-01T00:00:00.000Z",
      },
      {
        content: "Largest invoice is 125 RON.",
        id: "message-2",
        role: "assistant",
        timestamp: "2026-01-01T00:00:00.000Z",
      },
    ]);
    expect(capturedPrompts[0]).toContain("Sensitive grocery receipt");
    expect(capturedPrompts[0]).toContain("invoice-local-ai");
    expect(capturedPrompts[0]).not.toContain("secret raw OCR");
    expect(capturedPrompts[0]).not.toContain("shared-user");
  });

  it("surfaces generation errors while preserving the user message for recovery", async () => {
    const adapter = createFakeAdapter({
      generate: vi.fn(async () => {
        throw new Error("Model crashed");
      }),
    });

    const {result} = renderHook(() =>
      useLocalInvoiceAssistant({
        adapter,
        analyzeHardware: async () => eligibleHardware,
        createId: createSequentialIdFactory(),
        invoices: [],
        now: () => new Date("2026-01-01T00:00:00.000Z"),
      }),
    );

    await waitFor(() => {
      expect(result.current.state.lifecycle).toBe("not-downloaded");
    });
    await act(async () => {
      await result.current.loadModel();
      await result.current.sendMessage("Summarize my invoices.");
    });

    expect(result.current.state.lifecycle).toBe("error");
    expect(result.current.state.error).toBe("Model crashed");
    expect(result.current.state.messages).toEqual([
      {
        content: "Summarize my invoices.",
        id: "message-1",
        role: "user",
        timestamp: "2026-01-01T00:00:00.000Z",
      },
    ]);

    act(() => {
      result.current.dismissError();
    });

    expect(result.current.state.lifecycle).toBe("ready");
    expect(result.current.state.error).toBeNull();
  });
});

function createSequentialIdFactory(): () => string {
  let index = 0;

  return () => {
    index += 1;

    return `message-${index}`;
  };
}

function createFakeAdapter(overrides: Partial<LocalInvoiceAssistantAdapter> = {}): LocalInvoiceAssistantAdapter {
  return {
    deleteCachedModel: vi.fn(async () => undefined),
    dispose: vi.fn(async () => undefined),
    generate: vi.fn(async () => "Done."),
    interrupt: vi.fn(),
    load: vi.fn(async () => undefined),
    ...overrides,
  };
}

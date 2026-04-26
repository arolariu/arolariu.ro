import {InvoiceBuilder} from "@/data/mocks";
import {act, renderHook, waitFor} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import type {HardwareEligibilityResult} from "./hardwareEligibility";
import {DEFAULT_LOCAL_AI_HARDWARE_REQUIREMENTS} from "./hardwareEligibility";
import {LOCAL_INVOICE_ASSISTANT_MODELS} from "./modelCatalog";
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
    expect(capturedPrompts[0]).toContain("invoice-1");
    expect(capturedPrompts[0]).not.toContain("invoice-local-ai");
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

  it("keeps interrupted generation cancelled when a late response resolves", async () => {
    const pendingResponse = createDeferred<string>();
    const adapter = createFakeAdapter({
      generate: vi.fn(async (_messages, options) => {
        options?.onToken?.("Partial answer", "Partial answer");

        return pendingResponse.promise;
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

    let sendPromise: Promise<void> = Promise.resolve();
    act(() => {
      sendPromise = result.current.sendMessage("Stop this response.");
    });
    await waitFor(() => {
      expect(result.current.state.lifecycle).toBe("generating");
    });

    act(() => {
      result.current.interrupt();
    });
    pendingResponse.resolve("Late complete response");
    await act(async () => {
      await sendPromise;
    });

    expect(adapter.interrupt).toHaveBeenCalledOnce();
    expect(result.current.state.lifecycle).toBe("cancelled");
    expect(result.current.state.messages.at(-1)?.content).toBe("Partial answer");
  });

  it("surfaces cached model deletion errors through assistant state", async () => {
    const adapter = createFakeAdapter({
      deleteCachedModel: vi.fn(async () => {
        throw new Error("Cache delete failed");
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
      await result.current.deleteCachedModel();
    });

    expect(result.current.state.lifecycle).toBe("error");
    expect(result.current.state.error).toBe("Cache delete failed");
  });

  it("retries hardware analysis after an initial analyzer failure", async () => {
    let attempts = 0;
    const adapter = createFakeAdapter();

    const {result} = renderHook(() =>
      useLocalInvoiceAssistant({
        adapter,
        analyzeHardware: async () => {
          attempts += 1;

          if (attempts === 1) {
            throw new Error("Storage probe failed");
          }

          return eligibleHardware;
        },
        createId: createSequentialIdFactory(),
        invoices: [],
        now: () => new Date("2026-01-01T00:00:00.000Z"),
      }),
    );

    await waitFor(() => {
      expect(result.current.state.lifecycle).toBe("error");
    });

    expect(result.current.state.hardware).toBeNull();
    expect(result.current.canLoadModel).toBe(false);

    await act(async () => {
      await result.current.retryHardwareAnalysis();
    });

    expect(result.current.state.lifecycle).toBe("not-downloaded");
    expect(result.current.state.error).toBeNull();
    expect(result.current.canLoadModel).toBe(true);
    expect(attempts).toBe(2);
  });

  it("loads the recommended model from state, not the closed-over default", async () => {
    const adapter = createFakeAdapter();
    const recommendedModelId = "SmolLM2-360M-Instruct-q4f16_1-MLC";
    const hardwareWithGpu = {
      ...eligibleHardware,
      availableStorageBytes: 700 * 1024 * 1024,
      gpu: {
        features: ["shader-f16"],
        limits: {
          maxBufferSize: 1024 * 1024 * 1024,
          maxStorageBufferBindingSize: 512 * 1024 * 1024,
        },
      },
    } as const satisfies HardwareEligibilityResult;

    const {result} = renderHook(() =>
      useLocalInvoiceAssistant({
        adapter,
        analyzeHardware: async () => hardwareWithGpu,
        createId: createSequentialIdFactory(),
        invoices: [],
        now: () => new Date("2026-01-01T00:00:00.000Z"),
      }),
    );

    await waitFor(() => {
      expect(result.current.state.lifecycle).toBe("not-downloaded");
    });

    // Recommended model should differ from the default Llama model so this test catches stale closures.
    expect(result.current.state.activeModel.id).toBe(recommendedModelId);

    await act(async () => {
      await result.current.loadModel();
    });

    // Adapter should be called with the recommended model from state, not default
    expect(adapter.load).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.objectContaining({id: recommendedModelId}),
      }),
    );
  });

  it("uses the latest model override when retrying hardware analysis", async () => {
    const adapter = createFakeAdapter();
    const initialModel = LOCAL_INVOICE_ASSISTANT_MODELS[0];
    const updatedModel = LOCAL_INVOICE_ASSISTANT_MODELS[2];

    const {rerender, result} = renderHook(
      ({model}) =>
        useLocalInvoiceAssistant({
          adapter,
          analyzeHardware: async () => eligibleHardware,
          createId: createSequentialIdFactory(),
          invoices: [],
          model,
          now: () => new Date("2026-01-01T00:00:00.000Z"),
        }),
      {
        initialProps: {model: initialModel},
      },
    );

    await waitFor(() => {
      expect(result.current.state.lifecycle).toBe("not-downloaded");
    });
    expect(result.current.state.activeModel.id).toBe(initialModel.id);

    rerender({model: updatedModel});
    await act(async () => {
      await result.current.retryHardwareAnalysis();
    });

    expect(result.current.state.activeModel.id).toBe(updatedModel.id);
    await act(async () => {
      await result.current.loadModel();
    });
    expect(adapter.load).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.objectContaining({id: updatedModel.id}),
      }),
    );
  });

  it("deletes the current model from state cache, not the closed-over default", async () => {
    const adapter = createFakeAdapter();
    const recommendedModelId = "SmolLM2-360M-Instruct-q4f16_1-MLC";
    const hardwareWithGpu = {
      ...eligibleHardware,
      availableStorageBytes: 700 * 1024 * 1024,
      gpu: {
        features: ["shader-f16"],
        limits: {
          maxBufferSize: 1024 * 1024 * 1024,
          maxStorageBufferBindingSize: 512 * 1024 * 1024,
        },
      },
    } as const satisfies HardwareEligibilityResult;

    const {result} = renderHook(() =>
      useLocalInvoiceAssistant({
        adapter,
        analyzeHardware: async () => hardwareWithGpu,
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
      await result.current.deleteCachedModel();
    });

    // Adapter should be called with the recommended model from state
    expect(adapter.deleteCachedModel).toHaveBeenCalledWith(
      expect.objectContaining({id: recommendedModelId}),
    );
  });

  it("does not pass GPU limits as VRAM to model recommendation", async () => {
    const adapter = createFakeAdapter();
    const hardwareWithSmallBufferLimit = {
      ...eligibleHardware,
      gpu: {
        features: ["shader-f16"],
        limits: {
          maxBufferSize: 850 * 1024 * 1024, // 850 MB buffer limit, not VRAM.
          maxStorageBufferBindingSize: 512 * 1024 * 1024,
        },
      },
    } as const satisfies HardwareEligibilityResult;

    const {result} = renderHook(() =>
      useLocalInvoiceAssistant({
        adapter,
        analyzeHardware: async () => hardwareWithSmallBufferLimit,
        createId: createSequentialIdFactory(),
        invoices: [],
        now: () => new Date("2026-01-01T00:00:00.000Z"),
      }),
    );

    await waitFor(() => {
      expect(result.current.state.lifecycle).toBe("not-downloaded");
    });

    // Llama needs ~879 MB VRAM, so the old maxBufferSize-as-VRAM bug would filter it out.
    // Since buffer limits are display-only, Llama remains the selected balanced model.
    expect(result.current.state.activeModel.id).toBe("Llama-3.2-1B-Instruct-q4f16_1-MLC");
  });

  it("stores benchmark metrics without adding messages to chat history", async () => {
    const mockMetrics = {
      benchmarkPromptVersion: "1.0",
      characterCount: 180,
      charactersPerSecond: 90,
      chunkCount: 45,
      estimatedChunksPerSecond: 22.5,
      firstTokenLatencyMs: 120,
      modelId: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
      totalDurationMs: 2000,
    };

    const adapter = createFakeAdapter({
      generate: vi.fn(async (_messages, options) => {
        options?.onMetrics?.(mockMetrics);

        return "Benchmark response";
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

    expect(result.current.state.latestBenchmark).toBeNull();
    expect(result.current.canRunBenchmark).toBe(true);

    await act(async () => {
      await result.current.runBenchmark();
    });

    expect(result.current.state.latestBenchmark).toEqual(mockMetrics);
    expect(result.current.state.messages).toEqual([]); // No messages added to chat
    expect(result.current.state.lifecycle).toBe("ready");
    // Verify benchmark prompt version is recorded
    expect(result.current.state.latestBenchmark?.benchmarkPromptVersion).toBe("1.0");
  });

  it("recovers from benchmark failure without losing chat history", async () => {
    let callCount = 0;
    const adapter = createFakeAdapter({
      generate: vi.fn(async (_messages, options) => {
        callCount += 1;

        // First call is sendMessage, second is benchmark
        if (callCount === 1) {
          options?.onMetrics?.({
            characterCount: 10,
            charactersPerSecond: 5,
            chunkCount: 3,
            estimatedChunksPerSecond: 1.5,
            firstTokenLatencyMs: 100,
            modelId: "test-model",
            totalDurationMs: 2000,
          });

          return "Chat response";
        }

        // Benchmark call fails
        throw new Error("Benchmark failed");
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
      await result.current.sendMessage("Test message");
    });

    const chatHistoryBeforeBenchmark = result.current.state.messages;
    expect(chatHistoryBeforeBenchmark.length).toBe(2); // User + assistant

    await act(async () => {
      await result.current.runBenchmark();
    });

    expect(result.current.state.lifecycle).toBe("error");
    expect(result.current.state.error).toBe("Benchmark failed");
    expect(result.current.state.messages).toEqual(chatHistoryBeforeBenchmark); // History preserved
  });

  it("requires ready state to run benchmark", async () => {
    const adapter = createFakeAdapter();

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

    // Try benchmark before model loaded
    await act(async () => {
      await result.current.runBenchmark();
    });

    expect(adapter.generate).not.toHaveBeenCalled(); // Benchmark rejected
  });

  it("tracks latest generation metrics for normal chat messages", async () => {
    const mockMetrics = {
      benchmarkPromptVersion: null, // Normal chat has null version
      characterCount: 50,
      charactersPerSecond: 25,
      chunkCount: 12,
      estimatedChunksPerSecond: 6,
      firstTokenLatencyMs: 150,
      modelId: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
      totalDurationMs: 2000,
    };

    const adapter = createFakeAdapter({
      generate: vi.fn(async (_messages, options) => {
        options?.onMetrics?.(mockMetrics);

        return "Chat response";
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
      await result.current.sendMessage("Test");
    });

    expect(result.current.state.latestGeneration).toEqual(mockMetrics);
    expect(result.current.state.latestGeneration?.benchmarkPromptVersion).toBeNull(); // Normal chat
  });

  it("streams multi-token response correctly without duplication across multiple flushes", async () => {
    let flushCallbackScheduled: (() => void) | null = null;
    const scheduledFlushes: Array<() => void> = [];

    const adapter = createFakeAdapter({
      generate: vi.fn(async (_messages, options) => {
        // Simulate tokens arriving incrementally (adapter accumulates)
        options?.onToken?.("First", "First");
        options?.onToken?.(" second", "First second");
        options?.onToken?.(" third", "First second third");
        options?.onToken?.(" token", "First second third token");

        return "First second third token";
      }),
    });

    // Mock requestAnimationFrame to capture scheduled flushes
    const originalRAF = globalThis.requestAnimationFrame;
    const originalCAF = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = vi.fn((callback: () => void) => {
      scheduledFlushes.push(callback);
      flushCallbackScheduled = callback;

      return scheduledFlushes.length;
    }) as typeof requestAnimationFrame;
    globalThis.cancelAnimationFrame = vi.fn();

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

    // Start generation
    act(() => {
      void result.current.sendMessage("Test");
    });

    await waitFor(() => {
      expect(result.current.state.lifecycle).toBe("generating");
    });

    // Execute first scheduled flush (should show accumulated content)
    if (flushCallbackScheduled) {
      act(() => {
        flushCallbackScheduled?.();
      });
    }

    await waitFor(() => {
      const assistantMessage = result.current.state.messages.find((message) => message.role === "assistant");
      // After flush, message should contain full accumulated content without duplication
      expect(assistantMessage?.content).toBe("First second third token");
    });

    // Verify final state after completion
    await waitFor(() => {
      expect(result.current.state.lifecycle).toBe("ready");
    });

    const finalAssistantMessage = result.current.state.messages.find((message) => message.role === "assistant");
    expect(finalAssistantMessage?.content).toBe("First second third token");

    // Restore globals
    globalThis.requestAnimationFrame = originalRAF;
    globalThis.cancelAnimationFrame = originalCAF;
  });

  it("forces final flush before returning to ready state", async () => {
    let flushCallbackScheduled: (() => void) | null = null;
    let flushWasExecuted = false;

    const adapter = createFakeAdapter({
      generate: vi.fn(async (_messages, options) => {
        // Tokens arrive but flush not executed yet
        options?.onToken?.("Pending", "Pending");
        options?.onToken?.(" content", "Pending content");

        return "Pending content";
      }),
    });

    // Mock requestAnimationFrame to defer execution
    const originalRAF = globalThis.requestAnimationFrame;
    const originalCAF = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = vi.fn((callback: () => void) => {
      flushCallbackScheduled = callback;

      return 1;
    }) as typeof requestAnimationFrame;
    globalThis.cancelAnimationFrame = vi.fn();

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
      await result.current.sendMessage("Test");
    });

    // Verify lifecycle is ready (forced flush happened)
    expect(result.current.state.lifecycle).toBe("ready");

    // Verify final content is visible even though scheduled flush didn't execute
    const assistantMessage = result.current.state.messages.find((message) => message.role === "assistant");
    expect(assistantMessage?.content).toBe("Pending content");

    // Verify scheduled flush was cancelled (forceFlush cancels pending schedule)
    expect(globalThis.cancelAnimationFrame).toHaveBeenCalled();

    // Restore globals
    globalThis.requestAnimationFrame = originalRAF;
    globalThis.cancelAnimationFrame = originalCAF;
  });

  it("cancels pending buffer flush on reset during streaming", async () => {
    let resolveGeneration: ((value: string) => void) | null = null;
    const generationPromise = new Promise<string>((resolve) => {
      resolveGeneration = resolve;
    });

    const adapter = createFakeAdapter({
      generate: vi.fn(async (_messages, options) => {
        options?.onToken?.("Streaming", "Streaming");
        options?.onToken?.(" content", "Streaming content");

        return generationPromise;
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

    // Start generation without awaiting
    act(() => {
      void result.current.sendMessage("Test");
    });

    await waitFor(() => {
      expect(result.current.state.lifecycle).toBe("generating");
    });

    // Reset session during streaming
    act(() => {
      result.current.resetSession();
    });

    await waitFor(() => {
      expect(result.current.state.lifecycle).toBe("ready");
    });

    // Messages should be cleared
    expect(result.current.state.messages).toEqual([]);

    // Complete generation (late)
    act(() => {
      resolveGeneration?.("Late response");
    });

    // Messages should still be empty (generation was invalidated)
    expect(result.current.state.messages).toEqual([]);
  });

  it("interrupts streaming and cancels pending buffer flushes", async () => {
    let resolveGeneration: ((value: string) => void) | null = null;
    const generationPromise = new Promise<string>((resolve) => {
      resolveGeneration = resolve;
    });
    let tokenCallbackCount = 0;

    const adapter = createFakeAdapter({
      generate: vi.fn(async (_messages, options) => {
        // Simulate multiple token callbacks that would normally trigger setState
        for (let index = 0; index < 10; index += 1) {
          const accumulated = Array.from({length: index + 1}, (_, idx) => `Token${idx}`).join(" ");
          options?.onToken?.(`Token${index}`, accumulated);
          tokenCallbackCount += 1;
        }

        return generationPromise;
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

    // Start generation without awaiting
    act(() => {
      void result.current.sendMessage("Test");
    });

    await waitFor(() => {
      expect(result.current.state.lifecycle).toBe("generating");
    });

    // Verify tokens were appended
    expect(tokenCallbackCount).toBe(10);

    // Interrupt before completion
    act(() => {
      result.current.interrupt();
    });

    await waitFor(() => {
      expect(result.current.state.lifecycle).toBe("cancelled");
    });

    // Complete the generation (late)
    act(() => {
      resolveGeneration?.("Complete response");
    });

    // Lifecycle should remain cancelled, not change to ready
    expect(result.current.state.lifecycle).toBe("cancelled");
    expect(adapter.interrupt).toHaveBeenCalledOnce();
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

function createDeferred<T>(): Readonly<{
  promise: Promise<T>;
  resolve: (value: T) => void;
}> {
  let resolve: (value: T) => void = () => {
    throw new Error("Deferred promise resolved before initialization.");
  };
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return {promise, resolve};
}

import {describe, expect, it, vi} from "vitest";
import {createWebLlmLocalInvoiceAssistantAdapter, DEFAULT_LOCAL_INVOICE_ASSISTANT_MODEL, UPGRADE_GATED_MODEL_CANDIDATES} from "./webLlmAdapter";
import type {LocalInvoiceAssistantModelMetadata} from "./types";

type FakeProgressReport = Readonly<{
  progress: number;
  text: string;
  timeElapsed: number;
}>;

type FakeRequestMessage = Readonly<{
  content: string;
  role: "assistant" | "system" | "user";
}>;

type FakeChatCompletionRequest = Readonly<{
  max_tokens: number;
  messages: ReadonlyArray<FakeRequestMessage>;
  stream: true;
  temperature: number;
  top_p: number;
}>;

type FakeChatCompletionChunk = Readonly<{
  choices: ReadonlyArray<
    Readonly<{
      delta: Readonly<{
        content?: string | null;
      }>;
    }>
  >;
}>;

type FakeWebWorker = {
  terminated: boolean;
  terminate: () => void;
};

function createFakeWorker(): FakeWebWorker {
  return {
    terminated: false,
    terminate() {
      this.terminated = true;
    },
  };
}

async function* createTokenStream(tokens: ReadonlyArray<string>): AsyncIterable<FakeChatCompletionChunk> {
  for (const token of tokens) {
    yield {choices: [{delta: {content: token}}]};
  }
}

describe("createWebLlmLocalInvoiceAssistantAdapter", () => {
  it("loads the default model in a module worker and reports download progress", async () => {
    const progressReports: FakeProgressReport[] = [];
    const workers: FakeWebWorker[] = [];
    const fakeEngine = createFakeEngine(["Ready"]);
    const fakeModule = {
      CreateWebWorkerMLCEngine: vi.fn(
        async (
          worker: FakeWebWorker,
          modelId: string,
          engineConfig: Readonly<{initProgressCallback?: (report: FakeProgressReport) => void}>,
        ) => {
          engineConfig.initProgressCallback?.({progress: 0.42, text: "Downloading model shards", timeElapsed: 1});
          expect(worker).toBe(workers[0]);
          expect(modelId).toBe(DEFAULT_LOCAL_INVOICE_ASSISTANT_MODEL.id);

          return fakeEngine;
        },
      ),
      deleteModelAllInfoInCache: vi.fn(async () => undefined),
    };
    const adapter = createWebLlmLocalInvoiceAssistantAdapter({
      createWorker: () => {
        const worker = createFakeWorker();
        workers.push(worker);

        return worker;
      },
      importWebLlm: async () => fakeModule,
    });

    await adapter.load({
      onProgress: (report) => progressReports.push(report),
    });

    expect(fakeModule.CreateWebWorkerMLCEngine).toHaveBeenCalledOnce();
    expect(progressReports).toEqual([{progress: 0.42, text: "Downloading model shards", timeElapsed: 1}]);
    expect(workers).toHaveLength(1);
    expect(workers[0]?.terminated).toBe(false);
  });

  it("streams assistant tokens and returns the full generated response", async () => {
    const requests: FakeChatCompletionRequest[] = [];
    const fakeEngine = createFakeEngine(["This ", "invoice ", "looks reconciled."], requests);
    const adapter = createWebLlmLocalInvoiceAssistantAdapter({
      createWorker: createFakeWorker,
      importWebLlm: async () => ({
        CreateWebWorkerMLCEngine: async () => fakeEngine,
        deleteModelAllInfoInCache: vi.fn(async () => undefined),
      }),
    });
    const streamedTokens: string[] = [];

    await adapter.load();
    const response = await adapter.generate(
      [
        {content: "You answer questions about sanitized local invoice JSON only.", role: "system"},
        {content: "Which invoice is largest?", role: "user"},
      ],
      {
        onToken: (token) => streamedTokens.push(token),
      },
    );

    expect(response).toBe("This invoice looks reconciled.");
    expect(streamedTokens).toEqual(["This ", "invoice ", "looks reconciled."]);
    expect(requests).toEqual([
      {
        max_tokens: 384,
        messages: [
          {content: "You answer questions about sanitized local invoice JSON only.", role: "system"},
          {content: "Which invoice is largest?", role: "user"},
        ],
        stream: true,
        temperature: 0.2,
        top_p: 0.9,
      },
    ]);
  });

  it("interrupts active generation and releases worker resources on disposal", async () => {
    const worker = createFakeWorker();
    const fakeEngine = createFakeEngine(["unused"]);
    const adapter = createWebLlmLocalInvoiceAssistantAdapter({
      createWorker: () => worker,
      importWebLlm: async () => ({
        CreateWebWorkerMLCEngine: async () => fakeEngine,
        deleteModelAllInfoInCache: vi.fn(async () => undefined),
      }),
    });

    await adapter.load();
    adapter.interrupt();
    await adapter.dispose();

    expect(fakeEngine.interruptGenerate).toHaveBeenCalledOnce();
    expect(fakeEngine.unload).toHaveBeenCalledOnce();
    expect(worker.terminated).toBe(true);
  });

  it("releases worker and engine resources when disposed during pending model loading", async () => {
    const worker = createFakeWorker();
    const fakeEngine = createFakeEngine(["unused"]);
    const pendingEngine = createDeferred<typeof fakeEngine>();
    const adapter = createWebLlmLocalInvoiceAssistantAdapter({
      createWorker: () => worker,
      importWebLlm: async () => ({
        CreateWebWorkerMLCEngine: async () => pendingEngine.promise,
        deleteModelAllInfoInCache: vi.fn(async () => undefined),
      }),
    });

    const loadPromise = adapter.load();
    await Promise.resolve();
    await adapter.dispose();
    pendingEngine.resolve(fakeEngine);
    await loadPromise;

    expect(fakeEngine.unload).toHaveBeenCalledOnce();
    expect(worker.terminated).toBe(true);
  });

  it("terminates the worker if model loading fails", async () => {
    const worker = createFakeWorker();
    const adapter = createWebLlmLocalInvoiceAssistantAdapter({
      createWorker: () => worker,
      importWebLlm: async () => ({
        CreateWebWorkerMLCEngine: async () => {
          throw new Error("WebGPU device lost");
        },
        deleteModelAllInfoInCache: vi.fn(async () => undefined),
      }),
    });

    await expect(adapter.load()).rejects.toThrow("WebGPU device lost");
    expect(worker.terminated).toBe(true);
  });

  it("aborts pending model load by terminating the worker immediately", async () => {
    const worker = createFakeWorker();
    const fakeEngine = createFakeEngine(["unused"]);
    const pendingEngine = createDeferred<typeof fakeEngine>();
    const abortController = new AbortController();
    const adapter = createWebLlmLocalInvoiceAssistantAdapter({
      createWorker: () => worker,
      importWebLlm: async () => ({
        CreateWebWorkerMLCEngine: async () => pendingEngine.promise,
        deleteModelAllInfoInCache: vi.fn(async () => undefined),
      }),
    });

    const loadPromise = adapter.load({signal: abortController.signal});
    await Promise.resolve();

    // Abort while load is pending
    abortController.abort();
    await Promise.resolve();

    // Worker should be terminated immediately
    expect(worker.terminated).toBe(true);

    // Resolve engine after abort
    pendingEngine.resolve(fakeEngine);
    await expect(loadPromise).rejects.toThrow();

    // Late engine should be unloaded
    expect(fakeEngine.unload).toHaveBeenCalledOnce();
  });

  it("does not mark adapter ready when late engine resolves after abort", async () => {
    const worker = createFakeWorker();
    const fakeEngine = createFakeEngine(["Response"]);
    const pendingEngine = createDeferred<typeof fakeEngine>();
    const abortController = new AbortController();
    const adapter = createWebLlmLocalInvoiceAssistantAdapter({
      createWorker: () => worker,
      importWebLlm: async () => ({
        CreateWebWorkerMLCEngine: async () => pendingEngine.promise,
        deleteModelAllInfoInCache: vi.fn(async () => undefined),
      }),
    });

    const loadPromise = adapter.load({signal: abortController.signal});
    await Promise.resolve();

    abortController.abort();
    pendingEngine.resolve(fakeEngine);

    await expect(loadPromise).rejects.toThrow();

    // Adapter should not be ready - generate should reject
    await expect(adapter.generate([{content: "Hello", role: "user"}])).rejects.toThrow(
      "Load the local invoice assistant model before generating a response.",
    );
  });

  it("throws immediately if signal is already aborted before load starts", async () => {
    const worker = createFakeWorker();
    const abortController = new AbortController();
    abortController.abort();

    const adapter = createWebLlmLocalInvoiceAssistantAdapter({
      createWorker: () => worker,
      importWebLlm: async () => ({
        CreateWebWorkerMLCEngine: async () => createFakeEngine(["unused"]),
        deleteModelAllInfoInCache: vi.fn(async () => undefined),
      }),
    });

    await expect(adapter.load({signal: abortController.signal})).rejects.toThrow();
    expect(worker.terminated).toBe(true);
  });

  it("deletes cached model artifacts without creating a worker", async () => {
    let workerCreated = false;
    const deleteModelAllInfoInCache = vi.fn(async () => undefined);
    const adapter = createWebLlmLocalInvoiceAssistantAdapter({
      createWorker: () => {
        workerCreated = true;

        return createFakeWorker();
      },
      importWebLlm: async () => ({
        CreateWebWorkerMLCEngine: async () => createFakeEngine(["unused"]),
        deleteModelAllInfoInCache,
      }),
    });

    await adapter.deleteCachedModel();

    expect(workerCreated).toBe(false);
    expect(deleteModelAllInfoInCache).toHaveBeenCalledWith(DEFAULT_LOCAL_INVOICE_ASSISTANT_MODEL.id);
  });

  it("unloads the active model before deleting cached model artifacts", async () => {
    const worker = createFakeWorker();
    const fakeEngine = createFakeEngine(["unused"]);
    const deleteModelAllInfoInCache = vi.fn(async () => undefined);
    const adapter = createWebLlmLocalInvoiceAssistantAdapter({
      createWorker: () => worker,
      importWebLlm: async () => ({
        CreateWebWorkerMLCEngine: async () => fakeEngine,
        deleteModelAllInfoInCache,
      }),
    });

    await adapter.load();
    await adapter.deleteCachedModel();

    expect(fakeEngine.unload).toHaveBeenCalledOnce();
    expect(worker.terminated).toBe(true);
    expect(deleteModelAllInfoInCache).toHaveBeenCalledWith(DEFAULT_LOCAL_INVOICE_ASSISTANT_MODEL.id);
    await expect(adapter.generate([{content: "Hello", role: "user"}])).rejects.toThrow(
      "Load the local invoice assistant model before generating a response.",
    );
  });

  it("does not leave engine usable when pending load followed by cache deletion then late engine resolution", async () => {
    const worker = createFakeWorker();
    const fakeEngine = createFakeEngine(["Response"]);
    const pendingEngine = createDeferred<typeof fakeEngine>();
    const abortController = new AbortController();
    const adapter = createWebLlmLocalInvoiceAssistantAdapter({
      createWorker: () => worker,
      importWebLlm: async () => ({
        CreateWebWorkerMLCEngine: async () => pendingEngine.promise,
        deleteModelAllInfoInCache: vi.fn(async () => undefined),
      }),
    });

    // Start pending load
    const loadPromise = adapter.load({signal: abortController.signal});
    await Promise.resolve();

    // Abort and delete cache while load is pending
    abortController.abort();
    await adapter.deleteCachedModel();

    // Late engine resolution
    pendingEngine.resolve(fakeEngine);
    await expect(loadPromise).rejects.toThrow();

    // Engine should be unloaded, not usable for generation
    expect(fakeEngine.unload).toHaveBeenCalledOnce();
    expect(worker.terminated).toBe(true);
    await expect(adapter.generate([{content: "Hello", role: "user"}])).rejects.toThrow(
      "Load the local invoice assistant model before generating a response.",
    );
  });

  it("invalidates pending load when deleteCachedModel called without manual abort", async () => {
    const worker = createFakeWorker();
    const fakeEngine = createFakeEngine(["Response"]);
    const pendingEngine = createDeferred<typeof fakeEngine>();
    const deleteModelAllInfoInCache = vi.fn(async () => undefined);
    const adapter = createWebLlmLocalInvoiceAssistantAdapter({
      createWorker: () => worker,
      importWebLlm: async () => ({
        CreateWebWorkerMLCEngine: async () => pendingEngine.promise,
        deleteModelAllInfoInCache,
      }),
    });

    // Start pending load WITHOUT signal (no manual abort)
    const loadPromise = adapter.load();
    await Promise.resolve();

    // Delete cache while load is pending (should invalidate load generation)
    await adapter.deleteCachedModel();

    // Verify cache delete was called
    expect(deleteModelAllInfoInCache).toHaveBeenCalledOnce();

    // Late engine resolution
    pendingEngine.resolve(fakeEngine);
    await loadPromise;

    // Late engine should be unloaded due to generation invalidation
    expect(fakeEngine.unload).toHaveBeenCalledOnce();
    expect(worker.terminated).toBe(true);

    // Adapter should not be ready - generate should reject
    await expect(adapter.generate([{content: "Hello", role: "user"}])).rejects.toThrow(
      "Load the local invoice assistant model before generating a response.",
    );
  });

  describe("catalog enforcement", () => {
    it("rejects load() for unsupported model ID not in catalog", async () => {
      const mockImportWebLlm = vi.fn();
      const adapter = createWebLlmLocalInvoiceAssistantAdapter({
        importWebLlm: mockImportWebLlm,
      });

      const unsupportedModel = createTestModelMetadata({
        id: "unsupported-model-12345",
        displayName: "Unsupported Model",
      });

      await expect(
        adapter.load({
          model: unsupportedModel,
          onProgress: vi.fn(),
        }),
      ).rejects.toThrow("Unsupported model ID");
      await expect(
        adapter.load({
          model: unsupportedModel,
          onProgress: vi.fn(),
        }),
      ).rejects.toThrow('Only models from the selectable catalog can be loaded');

      // Verify WebLLM import was never called (rejection before import)
      expect(mockImportWebLlm).not.toHaveBeenCalled();
    });

    it("rejects load() for upgrade-gated model not in selectable catalog", async () => {
      const mockImportWebLlm = vi.fn();
      const adapter = createWebLlmLocalInvoiceAssistantAdapter({
        importWebLlm: mockImportWebLlm,
      });

      // Use actual upgrade-gated model from UPGRADE_GATED_MODEL_CANDIDATES
      const upgradedModel = UPGRADE_GATED_MODEL_CANDIDATES[0]; // gemma3-1b-it-q4f16_1-MLC

      await expect(
        adapter.load({
          model: upgradedModel,
          onProgress: vi.fn(),
        }),
      ).rejects.toThrow("Unsupported model ID");

      // Verify WebLLM import was never called (rejection before import)
      expect(mockImportWebLlm).not.toHaveBeenCalled();
    });

    it("rejects deleteCachedModel() for unsupported model ID not in catalog", async () => {
      const mockDeleteModelAllInfoInCache = vi.fn();
      const adapter = createWebLlmLocalInvoiceAssistantAdapter({
        importWebLlm: async () => ({
          CreateWebWorkerMLCEngine: vi.fn(),
          deleteModelAllInfoInCache: mockDeleteModelAllInfoInCache,
        }),
      });

      const unsupportedModel = createTestModelMetadata({
        id: "unsupported-model-12345",
        displayName: "Unsupported Model",
      });

      await expect(adapter.deleteCachedModel(unsupportedModel)).rejects.toThrow("Unsupported model ID");
      await expect(adapter.deleteCachedModel(unsupportedModel)).rejects.toThrow(
        'Only models from the selectable catalog can be deleted',
      );

      // Verify WebLLM cache delete was never called (rejection before WebLLM call)
      expect(mockDeleteModelAllInfoInCache).not.toHaveBeenCalled();
    });

    it("rejects deleteCachedModel() for upgrade-gated model not in selectable catalog", async () => {
      const mockDeleteModelAllInfoInCache = vi.fn();
      const adapter = createWebLlmLocalInvoiceAssistantAdapter({
        importWebLlm: async () => ({
          CreateWebWorkerMLCEngine: vi.fn(),
          deleteModelAllInfoInCache: mockDeleteModelAllInfoInCache,
        }),
      });

      // Use actual upgrade-gated model from UPGRADE_GATED_MODEL_CANDIDATES
      const upgradedModel = UPGRADE_GATED_MODEL_CANDIDATES[1]; // Qwen3.5-0.8B-q4f16_1-MLC

      await expect(adapter.deleteCachedModel(upgradedModel)).rejects.toThrow("Unsupported model ID");

      // Verify WebLLM cache delete was never called (rejection before WebLLM call)
      expect(mockDeleteModelAllInfoInCache).not.toHaveBeenCalled();
    });

    it("allows load() for supported model from selectable catalog", async () => {
      const worker = createFakeWorker();
      const fakeEngine = createFakeEngine(["Response"]);
      const mockCreateWebWorkerMLCEngine = vi.fn(async () => fakeEngine);

      const adapter = createWebLlmLocalInvoiceAssistantAdapter({
        createWorker: () => worker,
        importWebLlm: async () => ({
          CreateWebWorkerMLCEngine: mockCreateWebWorkerMLCEngine,
          deleteModelAllInfoInCache: vi.fn(async () => undefined),
        }),
      });

      // Use actual selectable model (default model from catalog)
      const selectableModel = DEFAULT_LOCAL_INVOICE_ASSISTANT_MODEL;

      // Should not throw, will call WebLLM (mocked)
      await adapter.load({
        model: selectableModel,
        onProgress: vi.fn(),
      });

      // Verify WebLLM was called with catalog-verified ID
      expect(mockCreateWebWorkerMLCEngine).toHaveBeenCalledWith(expect.anything(), selectableModel.id, expect.anything());
    });
  });
});

function createFakeEngine(tokens: ReadonlyArray<string>, requests: FakeChatCompletionRequest[] = []) {
  return {
    chat: {
      completions: {
        create: async (request: FakeChatCompletionRequest) => {
          requests.push(request);

          return createTokenStream(tokens);
        },
      },
    },
    interruptGenerate: vi.fn(),
    unload: vi.fn(async () => undefined),
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

/**
 * Creates a fully-typed test model metadata fixture.
 *
 * @param overrides - Partial metadata to override defaults.
 * @returns Complete LocalInvoiceAssistantModelMetadata for testing.
 */
function createTestModelMetadata(
  overrides: Partial<LocalInvoiceAssistantModelMetadata> = {},
): LocalInvoiceAssistantModelMetadata {
  return {
    artifactHost: "https://huggingface.co/mlc-ai",
    contextWindowTokens: 4096,
    displayName: "Test Model",
    family: "llama",
    id: "test-model-id",
    requiredFeatures: [],
    tier: "balanced",
    vramRequiredMB: 1000,
    ...overrides,
  } satisfies LocalInvoiceAssistantModelMetadata;
}

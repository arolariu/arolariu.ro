/**
 * @fileoverview WebLLM adapter for browser-based local LLM inference.
 *
 * Provides a clean, testable interface for loading, generating, and managing
 * local language models using WebLLM with Web Worker execution.
 *
 * @module app/domains/invoices/_components/ai/webLlmAdapter
 */

import {DEFAULT_LOCAL_INVOICE_ASSISTANT_MODEL, LOCAL_INVOICE_ASSISTANT_MODELS, UPGRADE_GATED_MODEL_CANDIDATES} from "./modelCatalog";
import {createGenerationMetricsTracker, DEFAULT_PERFORMANCE_CLOCK, type PerformanceClock} from "./performanceMetrics";
import type {LocalInvoiceAssistantModelMetadata, LocalInvoiceAssistantPromptMessage} from "./types";

// Re-export catalog for backward compatibility with existing imports
export {DEFAULT_LOCAL_INVOICE_ASSISTANT_MODEL, LOCAL_INVOICE_ASSISTANT_MODELS, UPGRADE_GATED_MODEL_CANDIDATES};

/**
 * Default LLM generation hyperparameters.
 *
 * @remarks
 * - `temperature`: 0.2 (low randomness for factual invoice queries)
 * - `topP`: 0.9 (nucleus sampling)
 * - `maxTokens`: 384 (limit response length for UI constraints)
 */
export const DEFAULT_LOCAL_INVOICE_ASSISTANT_GENERATION_OPTIONS = {
  maxTokens: 384,
  temperature: 0.2,
  topP: 0.9,
} as const satisfies LocalInvoiceAssistantGenerationOptions;

/**
 * Model download progress report from WebLLM.
 */
export type LocalInvoiceAssistantProgressReport = Readonly<{
  /** Download progress (0-1 range). */
  progress: number;
  /** Human-readable progress text. */
  text: string;
  /** Time elapsed since download started (milliseconds). */
  timeElapsed: number;
}>;

/**
 * LLM generation hyperparameters.
 */
export type LocalInvoiceAssistantGenerationOptions = Readonly<{
  /** Maximum tokens to generate. */
  maxTokens: number;
  /** Sampling temperature (0 = deterministic, 1 = creative). */
  temperature: number;
  /** Nucleus sampling threshold. */
  topP: number;
}>;

/**
 * Options for generating a local LLM response.
 */
export type GenerateLocalInvoiceAssistantResponseOptions = Readonly<{
  /** Optional generation parameter overrides. */
  generationOptions?: Partial<LocalInvoiceAssistantGenerationOptions>;
  /** Performance metrics callback (fired when generation completes). */
  onMetrics?: (metrics: import("./performanceMetrics").GenerationMetrics) => void;
  /** Token-by-token streaming callback (for live UI updates). */
  onToken?: (token: string, accumulatedResponse: string) => void;
}>;

/**
 * Options for loading a local LLM model.
 */
export type LoadLocalInvoiceAssistantModelOptions = Readonly<{
  /** Model to load (defaults to `DEFAULT_LOCAL_INVOICE_ASSISTANT_MODEL`). */
  model?: LocalInvoiceAssistantModelMetadata;
  /** Progress callback for download UI. */
  onProgress?: (report: LocalInvoiceAssistantProgressReport) => void;
}>;

/**
 * Web Worker handle for local LLM inference.
 */
export type LocalInvoiceAssistantWebWorker = Readonly<{
  /** Terminates the worker and releases resources. */
  terminate: () => void;
}>;

/**
 * Local invoice assistant adapter interface.
 *
 * @remarks
 * Abstracts WebLLM implementation for testability.
 * Manages model lifecycle: load → generate → interrupt → dispose.
 */
export type LocalInvoiceAssistantAdapter = Readonly<{
  /** Deletes cached model artifacts from IndexedDB. */
  deleteCachedModel: (model?: LocalInvoiceAssistantModelMetadata) => Promise<void>;
  /** Unloads model and terminates worker (cleanup on unmount). */
  dispose: () => Promise<void>;
  /** Generates streaming LLM response for given messages. */
  generate: (
    messages: ReadonlyArray<LocalInvoiceAssistantPromptMessage>,
    options?: GenerateLocalInvoiceAssistantResponseOptions,
  ) => Promise<string>;
  /** Interrupts active generation (user cancellation). */
  interrupt: () => void;
  /** Downloads and loads LLM model into worker. */
  load: (options?: LoadLocalInvoiceAssistantModelOptions) => Promise<void>;
}>;

/**
 * WebLLM chat completion request structure.
 *
 * @internal
 */
type WebLlmChatCompletionRequest = {
  max_tokens: number;
  messages: Array<LocalInvoiceAssistantPromptMessage>;
  stream: true;
  temperature: number;
  top_p: number;
};

/**
 * WebLLM streaming chunk response.
 *
 * @internal
 */
type WebLlmChatCompletionChunk = Readonly<{
  choices: ReadonlyArray<
    Readonly<{
      delta: Readonly<{
        content?: string | null;
      }>;
    }>
  >;
}>;

/**
 * WebLLM engine interface (MLC AI WebLLM library).
 *
 * @internal
 */
type WebLlmEngine = Readonly<{
  chat: Readonly<{
    completions: Readonly<{
      create: (request: WebLlmChatCompletionRequest) => Promise<AsyncIterable<WebLlmChatCompletionChunk>>;
    }>;
  }>;
  interruptGenerate: () => void;
  unload: () => Promise<void>;
}>;

/**
 * WebLLM engine configuration.
 *
 * @internal
 */
type WebLlmEngineConfig = Readonly<{
  initProgressCallback?: (report: LocalInvoiceAssistantProgressReport) => void;
  logLevel?: "TRACE" | "DEBUG" | "INFO" | "WARN" | "ERROR" | "SILENT";
}>;

/**
 * WebLLM runtime module (dynamic import target).
 *
 * @internal
 */
type WebLlmRuntimeModule = Readonly<{
  CreateWebWorkerMLCEngine: (
    worker: LocalInvoiceAssistantWebWorker,
    modelId: string,
    engineConfig?: WebLlmEngineConfig,
  ) => Promise<WebLlmEngine>;
  deleteModelAllInfoInCache: (modelId: string) => Promise<void>;
}>;

/**
 * Injectable dependencies for WebLLM adapter (testability).
 */
type CreateWebLlmLocalInvoiceAssistantAdapterOptions = Readonly<{
  /** Optional performance clock (for test determinism). */
  clock?: PerformanceClock;
  /** Optional worker factory (for test injection). */
  createWorker?: () => LocalInvoiceAssistantWebWorker;
  /** Optional WebLLM import function (for test mocking). */
  importWebLlm?: () => Promise<WebLlmRuntimeModule>;
}>;

function createDefaultWebLlmWorker(): LocalInvoiceAssistantWebWorker {
  return new Worker(new URL("webLlmWorker.ts", import.meta.url), {type: "module"});
}

async function importWebLlmRuntimeModule(): Promise<WebLlmRuntimeModule> {
  const webLlm = await import("@mlc-ai/web-llm");

  return {
    CreateWebWorkerMLCEngine: async (worker, modelId, engineConfig) => webLlm.CreateWebWorkerMLCEngine(worker, modelId, engineConfig),
    deleteModelAllInfoInCache: webLlm.deleteModelAllInfoInCache,
  };
}

/**
 * Creates a WebLLM-backed local invoice assistant adapter.
 *
 * @param options - Optional injectable dependencies for testing.
 * @returns Adapter managing local LLM model lifecycle and inference.
 *
 * @remarks
 * **Architecture:**
 * - WebLLM engine runs in dedicated Web Worker for non-blocking UI
 * - Model artifacts cached in IndexedDB (persistent across sessions)
 * - Streaming token generation for real-time chat UX
 *
 * **Lifecycle:**
 * 1. `load()` → Downloads model (if not cached), initializes engine in worker
 * 2. `generate()` → Streams LLM response token-by-token
 * 3. `interrupt()` → Cancels active generation
 * 4. `dispose()` → Unloads model, terminates worker (cleanup)
 *
 * **Error handling:**
 * - Load errors: Network failures, quota exceeded, unsupported browser
 * - Generate errors: Context window overflow, generation timeout
 * - Disposal errors: Gracefully handled (worker already terminated)
 *
 * @example
 * ```typescript
 * const adapter = createWebLlmLocalInvoiceAssistantAdapter();
 *
 * await adapter.load({
 *   onProgress: (report) => console.log(report.progress)
 * });
 *
 * const response = await adapter.generate(
 *   [{role: 'user', content: 'What did I spend on groceries?'}],
 *   {onToken: (token) => appendToUI(token)}
 * );
 *
 * await adapter.dispose();
 * ```
 */
export function createWebLlmLocalInvoiceAssistantAdapter(
  options: CreateWebLlmLocalInvoiceAssistantAdapterOptions = {},
): LocalInvoiceAssistantAdapter {
  const clock = options.clock ?? DEFAULT_PERFORMANCE_CLOCK;
  const createWorker = options.createWorker ?? createDefaultWebLlmWorker;
  const importWebLlm = options.importWebLlm ?? importWebLlmRuntimeModule;
  let engine: WebLlmEngine | null = null;
  let worker: LocalInvoiceAssistantWebWorker | null = null;
  let loadingModel: Promise<void> | null = null;
  let isDisposed = false;
  let activeModelId: string | null = null;

  async function unloadActiveModel({interrupt}: Readonly<{interrupt: boolean}>): Promise<void> {
    const loadedEngine = engine;
    const loadedWorker = worker;
    engine = null;
    worker = null;

    try {
      if (interrupt) {
        loadedEngine?.interruptGenerate();
      }
      await loadedEngine?.unload();
    } finally {
      loadedWorker?.terminate();
    }
  }

  async function loadModelOnce(
    model: LocalInvoiceAssistantModelMetadata,
    onProgress: LoadLocalInvoiceAssistantModelOptions["onProgress"],
  ): Promise<void> {
    const nextWorker = createWorker();
    worker = nextWorker;

    try {
      const webLlm = await importWebLlm();
      const nextEngine = await webLlm.CreateWebWorkerMLCEngine(nextWorker, model.id, {
        initProgressCallback: onProgress,
        logLevel: "WARN",
      });

      if (isDisposed || engine) {
        await nextEngine.unload();
        nextWorker.terminate();
        if (worker === nextWorker) {
          worker = null;
        }
        return;
      }

      engine = nextEngine;
      worker = nextWorker;
      activeModelId = model.id;
    } catch (error) {
      nextWorker.terminate();
      if (worker === nextWorker) {
        worker = null;
      }
      throw error;
    }
  }

  async function loadModel({
    model = DEFAULT_LOCAL_INVOICE_ASSISTANT_MODEL,
    onProgress,
  }: LoadLocalInvoiceAssistantModelOptions = {}): Promise<void> {
    if (isDisposed) {
      throw new Error("The local invoice assistant adapter has already been disposed.");
    }

    if (engine) {
      return;
    }

    const currentLoadingModel = loadingModel ?? loadModelOnce(model, onProgress);
    loadingModel = currentLoadingModel;

    try {
      await currentLoadingModel;
    } finally {
      if (loadingModel === currentLoadingModel) {
        loadingModel = null;
      }
    }
  }

  return {
    async deleteCachedModel(model = DEFAULT_LOCAL_INVOICE_ASSISTANT_MODEL): Promise<void> {
      await unloadActiveModel({interrupt: true});
      const webLlm = await importWebLlm();
      await webLlm.deleteModelAllInfoInCache(model.id);
    },
    async dispose(): Promise<void> {
      isDisposed = true;
      await unloadActiveModel({interrupt: false});
    },
    async generate(messages, options = {}): Promise<string> {
      if (!engine) {
        throw new Error("Load the local invoice assistant model before generating a response.");
      }

      const metricsTracker = activeModelId
        ? createGenerationMetricsTracker({clock, modelId: activeModelId})
        : null;

      const generationOptions = {
        ...DEFAULT_LOCAL_INVOICE_ASSISTANT_GENERATION_OPTIONS,
        ...options.generationOptions,
      };

      metricsTracker?.onStart();

      const stream = await engine.chat.completions.create({
        max_tokens: generationOptions.maxTokens,
        messages: messages.map((message) => ({
          content: message.content,
          role: message.role,
        })),
        stream: true,
        temperature: generationOptions.temperature,
        top_p: generationOptions.topP,
      });
      let accumulatedResponse = "";

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta.content;
        if (token) {
          accumulatedResponse += token;
          metricsTracker?.onChunk(token);
          options.onToken?.(token, accumulatedResponse);
        }
      }

      if (metricsTracker) {
        const metrics = metricsTracker.onEnd();
        options.onMetrics?.(metrics);
      }

      return accumulatedResponse;
    },
    interrupt(): void {
      engine?.interruptGenerate();
    },
    async load(options?: LoadLocalInvoiceAssistantModelOptions): Promise<void> {
      await loadModel(options);
    },
  };
}

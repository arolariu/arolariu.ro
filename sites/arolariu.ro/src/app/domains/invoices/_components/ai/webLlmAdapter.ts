import type {LocalInvoiceAssistantModelMetadata, LocalInvoiceAssistantPromptMessage} from "./types";

export const DEFAULT_LOCAL_INVOICE_ASSISTANT_MODEL = {
  artifactHost: "https://huggingface.co/mlc-ai",
  contextWindowTokens: 4096,
  displayName: "Llama 3.2 1B Instruct",
  id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
} as const satisfies LocalInvoiceAssistantModelMetadata;

export const LOCAL_INVOICE_ASSISTANT_MODELS = [DEFAULT_LOCAL_INVOICE_ASSISTANT_MODEL] as const;

export const DEFAULT_LOCAL_INVOICE_ASSISTANT_GENERATION_OPTIONS = {
  maxTokens: 384,
  temperature: 0.2,
  topP: 0.9,
} as const satisfies LocalInvoiceAssistantGenerationOptions;

export type LocalInvoiceAssistantProgressReport = Readonly<{
  progress: number;
  text: string;
  timeElapsed: number;
}>;

export type LocalInvoiceAssistantGenerationOptions = Readonly<{
  maxTokens: number;
  temperature: number;
  topP: number;
}>;

export type GenerateLocalInvoiceAssistantResponseOptions = Readonly<{
  generationOptions?: Partial<LocalInvoiceAssistantGenerationOptions>;
  onToken?: (token: string, accumulatedResponse: string) => void;
}>;

export type LoadLocalInvoiceAssistantModelOptions = Readonly<{
  model?: LocalInvoiceAssistantModelMetadata;
  onProgress?: (report: LocalInvoiceAssistantProgressReport) => void;
}>;

export type LocalInvoiceAssistantWebWorker = Readonly<{
  terminate: () => void;
}>;

export type LocalInvoiceAssistantAdapter = Readonly<{
  deleteCachedModel: (model?: LocalInvoiceAssistantModelMetadata) => Promise<void>;
  dispose: () => Promise<void>;
  generate: (
    messages: ReadonlyArray<LocalInvoiceAssistantPromptMessage>,
    options?: GenerateLocalInvoiceAssistantResponseOptions,
  ) => Promise<string>;
  interrupt: () => void;
  load: (options?: LoadLocalInvoiceAssistantModelOptions) => Promise<void>;
}>;

type WebLlmChatCompletionRequest = {
  max_tokens: number;
  messages: Array<LocalInvoiceAssistantPromptMessage>;
  stream: true;
  temperature: number;
  top_p: number;
};

type WebLlmChatCompletionChunk = Readonly<{
  choices: ReadonlyArray<
    Readonly<{
      delta: Readonly<{
        content?: string | null;
      }>;
    }>
  >;
}>;

type WebLlmEngine = Readonly<{
  chat: Readonly<{
    completions: Readonly<{
      create: (request: WebLlmChatCompletionRequest) => Promise<AsyncIterable<WebLlmChatCompletionChunk>>;
    }>;
  }>;
  interruptGenerate: () => void;
  unload: () => Promise<void>;
}>;

type WebLlmEngineConfig = Readonly<{
  initProgressCallback?: (report: LocalInvoiceAssistantProgressReport) => void;
  logLevel?: "TRACE" | "DEBUG" | "INFO" | "WARN" | "ERROR" | "SILENT";
}>;

type WebLlmRuntimeModule = Readonly<{
  CreateWebWorkerMLCEngine: (
    worker: LocalInvoiceAssistantWebWorker,
    modelId: string,
    engineConfig?: WebLlmEngineConfig,
  ) => Promise<WebLlmEngine>;
  deleteModelAllInfoInCache: (modelId: string) => Promise<void>;
}>;

type CreateWebLlmLocalInvoiceAssistantAdapterOptions = Readonly<{
  createWorker?: () => LocalInvoiceAssistantWebWorker;
  importWebLlm?: () => Promise<WebLlmRuntimeModule>;
}>;

/**
 * Creates a WebLLM-backed local invoice assistant adapter.
 *
 * @param options - Optional injectable browser runtime dependencies for tests.
 * @returns Adapter that loads, streams, interrupts, and disposes the local model.
 */
export function createWebLlmLocalInvoiceAssistantAdapter(
  options: CreateWebLlmLocalInvoiceAssistantAdapterOptions = {},
): LocalInvoiceAssistantAdapter {
  const createWorker = options.createWorker ?? createDefaultWebLlmWorker;
  const importWebLlm = options.importWebLlm ?? importWebLlmRuntimeModule;
  let engine: WebLlmEngine | null = null;
  let worker: LocalInvoiceAssistantWebWorker | null = null;

  return {
    async deleteCachedModel(model = DEFAULT_LOCAL_INVOICE_ASSISTANT_MODEL): Promise<void> {
      const webLlm = await importWebLlm();
      await webLlm.deleteModelAllInfoInCache(model.id);
    },
    async dispose(): Promise<void> {
      const loadedEngine = engine;
      const loadedWorker = worker;
      engine = null;
      worker = null;

      try {
        await loadedEngine?.unload();
      } finally {
        loadedWorker?.terminate();
      }
    },
    async generate(messages, options = {}): Promise<string> {
      if (!engine) {
        throw new Error("Load the local invoice assistant model before generating a response.");
      }

      const generationOptions = {
        ...DEFAULT_LOCAL_INVOICE_ASSISTANT_GENERATION_OPTIONS,
        ...options.generationOptions,
      };
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
          options.onToken?.(token, accumulatedResponse);
        }
      }

      return accumulatedResponse;
    },
    interrupt(): void {
      engine?.interruptGenerate();
    },
    async load({model = DEFAULT_LOCAL_INVOICE_ASSISTANT_MODEL, onProgress}: LoadLocalInvoiceAssistantModelOptions = {}): Promise<void> {
      if (engine) {
        return;
      }

      const nextWorker = createWorker();
      try {
        const webLlm = await importWebLlm();
        engine = await webLlm.CreateWebWorkerMLCEngine(nextWorker, model.id, {
          initProgressCallback: onProgress,
          logLevel: "WARN",
        });
        worker = nextWorker;
      } catch (error) {
        nextWorker.terminate();
        throw error;
      }
    },
  };
}

function createDefaultWebLlmWorker(): LocalInvoiceAssistantWebWorker {
  return new Worker(new URL("./webLlmWorker.ts", import.meta.url), {type: "module"});
}

async function importWebLlmRuntimeModule(): Promise<WebLlmRuntimeModule> {
  const webLlm = await import("@mlc-ai/web-llm");

  return {
    CreateWebWorkerMLCEngine: async (worker, modelId, engineConfig) =>
      webLlm.CreateWebWorkerMLCEngine(worker, modelId, engineConfig),
    deleteModelAllInfoInCache: webLlm.deleteModelAllInfoInCache,
  };
}

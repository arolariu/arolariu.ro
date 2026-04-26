import {InvoiceBuilder} from "@/data/mocks";
import "@testing-library/jest-dom/vitest";
import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import type {ReactNode} from "react";
import {describe, expect, it, vi} from "vitest";
import type {HardwareEligibilityResult} from "./hardwareEligibility";
import {DEFAULT_LOCAL_AI_HARDWARE_REQUIREMENTS} from "./hardwareEligibility";
import {LocalInvoiceAssistantPanel} from "./LocalInvoiceAssistantPanel";
import type {LocalInvoiceAssistantAdapter} from "./webLlmAdapter";

const eligibleHardware = {
  availableStorageBytes: 8 * 1024 ** 3,
  reasons: [],
  requirements: DEFAULT_LOCAL_AI_HARDWARE_REQUIREMENTS,
  status: "eligible",
} as const satisfies HardwareEligibilityResult;

const ineligibleHardware = {
  availableStorageBytes: 2 * 1024 ** 3,
  reasons: ["webgpu-unavailable"],
  requirements: DEFAULT_LOCAL_AI_HARDWARE_REQUIREMENTS,
  status: "ineligible",
} as const satisfies HardwareEligibilityResult;

vi.mock("next-intl", () => ({
  useTranslations: () => {
    const translations: Record<string, string> = {
      "actions.clearCache": "Clear cached model",
      "actions.dismissError": "Dismiss error",
      "actions.download": "Download local model",
      "actions.retryHardware": "Retry hardware check",
      "actions.reset": "Reset chat",
      "actions.send": "Send",
      "actions.stop": "Stop generating",
      "analyticsPreview.currencyBreakdown": "By currency",
      "analyticsPreview.invoiceCountLabel": "Invoices",
      "analyticsPreview.noData": "No invoice data available",
      "analyticsPreview.title": "Quick insights",
      "analyticsPreview.topMerchantInvoiceCount": "{count} invoices",
      "analyticsPreview.topMerchantLabel": "Top merchant",
      "analyticsPreview.totalSpendLabel": "Total spending",
      "benchmark.description": "Test local model speed on your current browser and hardware.",
      "benchmark.runButton": "Run benchmark",
      "benchmark.running": "Running benchmark...",
      "benchmark.title": "Benchmark your device",
      "cache.behavior": "Model artifacts are cached in your browser using the Cache API. Your invoice data remains separate in IndexedDB.",
      "cache.clearImpact": "Clearing the cache removes the local model artifacts but does not delete your invoice data.",
      "cache.source": "Model artifacts downloaded from trusted source: {host}",
      "chat.inputLabel": "Ask a local invoice question",
      "chat.inputPlaceholder": "Ask about your local invoices...",
      "chat.ready": "Local model is ready",
      "chat.title": "Local-only invoice assistant",
      "deviceCompatibility.gpuFeatures": "GPU features: {features}",
      "deviceCompatibility.gpuLimits": "GPU buffer limit: {maxBufferMB} MB",
      "deviceCompatibility.gpuStorageBufferLimit": "GPU storage buffer binding limit: {maxStorageBufferMB} MB",
      "deviceCompatibility.logicalCores": "CPU cores: {cores}",
      "deviceCompatibility.memoryGB": "Device memory: {memory} GB",
      "deviceCompatibility.title": "Device compatibility",
      "errors.title": "Assistant error",
      "hardware.checking": "Checking whether this device can run the local assistant...",
      "hardware.ineligibleMessage":
        "Your device does not meet the minimum hardware requirements for the local-only AI assistant. Use another device or wait until the remote AI assistant feature is available.",
      "hardware.ineligibleTitle": "Local AI assistant unavailable",
      "model.description": "Downloads a small model for private, local-only invoice chat.",
      "model.host": "Model artifacts are downloaded from {host}.",
      "model.progress": "Download progress: {progress}%",
      "model.title": "Prepare local model",
      privacy: "Invoice data stays in this browser. Model artifacts are downloaded from the approved external host.",
      "status.compatibilityUnknown": "Some hardware details are unavailable, so performance may vary.",
      "suggestedPrompts.largestInvoice": "Which invoice is largest?",
      "suggestedPrompts.spendingByCurrency": "Show spending by currency",
      "suggestedPrompts.summarizeSpending": "Summarize my total spending",
      "suggestedPrompts.title": "Suggested questions",
      "suggestedPrompts.topMerchant": "Which merchant appears most often?",
    };

    return (key: string, values?: Record<string, string | number>) => {
      const template = translations[key] ?? key;

      return Object.entries(values ?? {}).reduce((message, [name, value]) => message.replace(`{${name}}`, String(value)), template);
    };
  },
}));

vi.mock("@arolariu/components", () => ({
  Button: ({children, ...props}: {children: ReactNode} & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  Card: ({children, ...props}: {children: ReactNode} & React.HTMLAttributes<HTMLDivElement>) => <section {...props}>{children}</section>,
  CardContent: ({children, ...props}: {children: ReactNode} & React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  CardDescription: ({children}: {children: ReactNode}) => <p>{children}</p>,
  CardHeader: ({children}: {children: ReactNode}) => <header>{children}</header>,
  CardTitle: ({children}: {children: ReactNode}) => <h3>{children}</h3>,
  Label: ({children, ...props}: {children: ReactNode} & React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props}>{children}</label>
  ),
  Progress: ({value}: {value?: number}) => (
    <progress
      max={100}
      value={value ?? 0}
    />
  ),
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

describe("LocalInvoiceAssistantPanel", () => {
  it("shows the localized hardware fallback before any model suggestion on ineligible devices", async () => {
    const adapter = createFakeAdapter();

    render(
      <LocalInvoiceAssistantPanel
        adapter={adapter}
        analyzeHardware={async () => ineligibleHardware}
        createId={createSequentialIdFactory()}
        invoices={[]}
        now={() => new Date("2026-01-01T00:00:00.000Z")}
      />,
    );

    expect(await screen.findByText("Local AI assistant unavailable")).toBeInTheDocument();
    expect(screen.getByText(/Your device does not meet the minimum hardware requirements/)).toBeInTheDocument();
    expect(screen.queryByRole("button", {name: "Download local model"})).not.toBeInTheDocument();
    expect(adapter.load).not.toHaveBeenCalled();
  });

  it("surfaces both safe WebGPU buffer limits in device compatibility details", async () => {
    const hardwareWithGpuLimits = {
      ...eligibleHardware,
      gpu: {
        features: ["shader-f16"],
        limits: {
          maxBufferSize: 256 * 1024 ** 2,
          maxStorageBufferBindingSize: 128 * 1024 ** 2,
        },
      },
    } as const satisfies HardwareEligibilityResult;
    const adapter = createFakeAdapter();

    render(
      <LocalInvoiceAssistantPanel
        adapter={adapter}
        analyzeHardware={async () => hardwareWithGpuLimits}
        createId={createSequentialIdFactory()}
        invoices={[]}
        now={() => new Date("2026-01-01T00:00:00.000Z")}
      />,
    );

    expect(await screen.findByText("Device compatibility")).toBeInTheDocument();
    expect(screen.getByText("GPU features: shader-f16")).toBeInTheDocument();
    expect(screen.getByText("GPU buffer limit: 256 MB")).toBeInTheDocument();
    expect(screen.getByText("GPU storage buffer binding limit: 128 MB")).toBeInTheDocument();
    expect(adapter.load).not.toHaveBeenCalled();
  });

  it("downloads the local model and sends sanitized invoice questions", async () => {
    const capturedPrompts: string[] = [];
    const invoice = new InvoiceBuilder()
      .withId("invoice-panel")
      .withName("Panel grocery invoice")
      .withAdditionalMetadata({rawOcr: "do not show"})
      .build();
    const adapter = createFakeAdapter({
      generate: vi.fn(async (messages, options) => {
        capturedPrompts.push(JSON.stringify(messages));
        options?.onToken?.("Panel answer", "Panel answer");

        return "Panel answer";
      }),
    });

    render(
      <LocalInvoiceAssistantPanel
        adapter={adapter}
        analyzeHardware={async () => eligibleHardware}
        createId={createSequentialIdFactory()}
        invoices={[invoice]}
        now={() => new Date("2026-01-01T00:00:00.000Z")}
      />,
    );

    fireEvent.click(await screen.findByRole("button", {name: "Download local model"}));

    await waitFor(() => {
      expect(screen.getByText("Local model is ready")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Ask a local invoice question"), {
      target: {value: "What is in this invoice?"},
    });
    fireEvent.click(screen.getByRole("button", {name: "Send"}));

    expect(await screen.findByText("Panel answer")).toBeInTheDocument();
    expect(screen.getByText("What is in this invoice?")).toBeInTheDocument();
    expect(capturedPrompts[0]).toContain("Panel grocery invoice");
    expect(capturedPrompts[0]).not.toContain("do not show");
  });

  it("renders recoverable generation errors with a dismiss action", async () => {
    const adapter = createFakeAdapter({
      generate: vi.fn(async () => {
        throw new Error("Model crashed");
      }),
    });

    render(
      <LocalInvoiceAssistantPanel
        adapter={adapter}
        analyzeHardware={async () => eligibleHardware}
        createId={createSequentialIdFactory()}
        invoices={[]}
        now={() => new Date("2026-01-01T00:00:00.000Z")}
      />,
    );

    fireEvent.click(await screen.findByRole("button", {name: "Download local model"}));
    await waitFor(() => {
      expect(screen.getByText("Local model is ready")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Ask a local invoice question"), {
      target: {value: "Summarize invoices."},
    });
    fireEvent.click(screen.getByRole("button", {name: "Send"}));

    expect(await screen.findByRole("alert")).toHaveTextContent("Model crashed");
    fireEvent.click(screen.getByRole("button", {name: "Dismiss error"}));

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Summarize invoices.")).toBeInTheDocument();
  });

  it("lets users stop local generation from the chat panel", async () => {
    const pendingResponse = createDeferred<string>();
    const adapter = createFakeAdapter({
      generate: vi.fn(async (_messages, options) => {
        options?.onToken?.("Partial answer", "Partial answer");

        return pendingResponse.promise;
      }),
    });

    render(
      <LocalInvoiceAssistantPanel
        adapter={adapter}
        analyzeHardware={async () => eligibleHardware}
        createId={createSequentialIdFactory()}
        invoices={[]}
        now={() => new Date("2026-01-01T00:00:00.000Z")}
      />,
    );

    fireEvent.click(await screen.findByRole("button", {name: "Download local model"}));
    await waitFor(() => {
      expect(screen.getByText("Local model is ready")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Ask a local invoice question"), {
      target: {value: "Stop this answer."},
    });
    fireEvent.click(screen.getByRole("button", {name: "Send"}));
    await waitFor(() => {
      expect(screen.queryByText("Local model is ready")).not.toBeInTheDocument();
    });
    fireEvent.click(await screen.findByRole("button", {name: "Stop generating"}));
    pendingResponse.resolve("Late complete response");

    await waitFor(() => {
      expect(adapter.interrupt).toHaveBeenCalledOnce();
    });
    expect(screen.getByText("Partial answer")).toBeInTheDocument();
  });

  it("lets users retry hardware analysis without showing chat-ready UI for pre-load errors", async () => {
    let attempts = 0;
    const adapter = createFakeAdapter();

    render(
      <LocalInvoiceAssistantPanel
        adapter={adapter}
        analyzeHardware={async () => {
          attempts += 1;

          if (attempts === 1) {
            throw new Error("Storage probe failed");
          }

          return eligibleHardware;
        }}
        createId={createSequentialIdFactory()}
        invoices={[]}
        now={() => new Date("2026-01-01T00:00:00.000Z")}
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Storage probe failed");
    expect(screen.queryByText("Local model is ready")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", {name: "Download local model"})).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", {name: "Retry hardware check"}));

    expect(await screen.findByRole("button", {name: "Download local model"})).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(adapter.load).not.toHaveBeenCalled();
  });

  it("shows benchmark UI only after model is loaded, not before or after load failure", async () => {
    const adapter = createFakeAdapter();

    render(
      <LocalInvoiceAssistantPanel
        adapter={adapter}
        analyzeHardware={async () => eligibleHardware}
        createId={createSequentialIdFactory()}
        invoices={[]}
        now={() => new Date("2026-01-01T00:00:00.000Z")}
      />,
    );

    // Wait for hardware analysis to complete
    await waitFor(() => {
      expect(screen.queryByText("Prepare local model")).toBeInTheDocument();
    });

    // Benchmark UI should NOT be visible before model loads
    expect(screen.queryByText("Benchmark your device")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", {name: "Run benchmark"})).not.toBeInTheDocument();

    // Load the model
    fireEvent.click(screen.getByRole("button", {name: "Download local model"}));

    // Wait for model to be ready
    await waitFor(() => {
      expect(screen.getByText("Local model is ready")).toBeInTheDocument();
    });

    // NOW benchmark UI should be visible
    expect(screen.getByText("Benchmark your device")).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Run benchmark"})).toBeInTheDocument();
  });

  it("does not show benchmark UI after model load failure", async () => {
    const adapter = createFakeAdapter({
      load: vi.fn(async () => {
        throw new Error("Model download failed");
      }),
    });

    render(
      <LocalInvoiceAssistantPanel
        adapter={adapter}
        analyzeHardware={async () => eligibleHardware}
        createId={createSequentialIdFactory()}
        invoices={[]}
        now={() => new Date("2026-01-01T00:00:00.000Z")}
      />,
    );

    // Wait for hardware analysis
    await waitFor(() => {
      expect(screen.queryByText("Prepare local model")).toBeInTheDocument();
    });

    // Attempt to load model
    fireEvent.click(screen.getByRole("button", {name: "Download local model"}));

    // Wait for error state
    await waitFor(() => {
      expect(screen.queryByRole("alert")).toHaveTextContent("Model download failed");
    });

    // Benchmark UI should NOT be visible after load failure
    expect(screen.queryByText("Benchmark your device")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", {name: "Run benchmark"})).not.toBeInTheDocument();
  });

  it("shows hardware summary in benchmark section after model loads", async () => {
    const hardwareWithDetails = {
      ...eligibleHardware,
      device: {
        deviceMemoryGB: 16,
        logicalCores: 12,
      },
      gpu: {
        features: ["shader-f16", "bgra8unorm-storage"],
        limits: {
          maxBufferSize: 512 * 1024 ** 2,
          maxStorageBufferBindingSize: 256 * 1024 ** 2,
        },
      },
    } as const satisfies HardwareEligibilityResult;

    render(
      <LocalInvoiceAssistantPanel
        adapter={createFakeAdapter()}
        analyzeHardware={async () => hardwareWithDetails}
        createId={createSequentialIdFactory()}
        invoices={[]}
        now={() => new Date("2026-01-01T00:00:00.000Z")}
      />,
    );

    // Load model
    fireEvent.click(await screen.findByRole("button", {name: "Download local model"}));

    // Wait for model to be ready
    await waitFor(() => {
      expect(screen.getByText("Local model is ready")).toBeInTheDocument();
    });

    // Hardware summary should appear in benchmark section
    expect(screen.getByText("Benchmark your device")).toBeInTheDocument();
    expect(screen.getByText("GPU features: shader-f16, bgra8unorm-storage")).toBeInTheDocument();
    expect(screen.getByText("CPU cores: 12")).toBeInTheDocument();
    expect(screen.getByText("Device memory: 16 GB")).toBeInTheDocument();
  });

  it("displays model-specific cache information and clear-cache button after model loads", async () => {
    const adapter = createFakeAdapter();

    render(
      <LocalInvoiceAssistantPanel
        adapter={adapter}
        analyzeHardware={async () => eligibleHardware}
        createId={createSequentialIdFactory()}
        invoices={[]}
        now={() => new Date("2026-01-01T00:00:00.000Z")}
      />,
    );

    // Cache info should NOT be visible before model loads
    expect(screen.queryByText(/Model artifacts are cached/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Clearing the cache removes/i)).not.toBeInTheDocument();

    // Load model
    fireEvent.click(await screen.findByRole("button", {name: "Download local model"}));

    // Wait for model to be ready
    await waitFor(() => {
      expect(screen.getByText("Local model is ready")).toBeInTheDocument();
    });

    // NOW cache info should be visible with model-specific details
    expect(
      screen.getByText("Model artifacts are cached in your browser using the Cache API. Your invoice data remains separate in IndexedDB."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Clearing the cache removes the local model artifacts but does not delete your invoice data."),
    ).toBeInTheDocument();
    // Verify concrete catalog-derived artifact host appears (not just prefix)
    expect(screen.getByText(/Model artifacts downloaded from trusted source: https:\/\/huggingface\.co/i)).toBeInTheDocument();

    // Clear cache button should show model name and size
    const clearButton = screen.getByRole("button", {name: /Clear cached model.*Llama 3.2 1B Instruct/i});
    expect(clearButton).toBeInTheDocument();
    expect(clearButton).toHaveTextContent(/~1319 MB/); // 879 * 1.5 ≈ 1319
  });

  it("shows analytics preview before model loads when hardware is available and invoices exist", async () => {
    const invoices = [
      new InvoiceBuilder()
        .withMerchantReference("merchant-alpha")
        .withName("Grocery 1")
        .withPaymentAmount(100)
        .withPaymentCurrency("RON")
        .build(),
      new InvoiceBuilder()
        .withMerchantReference("merchant-alpha")
        .withName("Grocery 2")
        .withPaymentAmount(50)
        .withPaymentCurrency("USD")
        .build(),
    ];

    render(
      <LocalInvoiceAssistantPanel
        adapter={createFakeAdapter()}
        analyzeHardware={async () => eligibleHardware}
        createId={createSequentialIdFactory()}
        invoices={invoices}
        now={() => new Date("2026-01-01T00:00:00.000Z")}
      />,
    );

    // Wait for hardware analysis to complete
    await waitFor(() => {
      expect(screen.getByText("Prepare local model")).toBeInTheDocument();
    });

    // Analytics preview should be visible BEFORE model loads
    expect(screen.getByText("Quick insights")).toBeInTheDocument();
    expect(screen.getByText("Invoices: 2")).toBeInTheDocument();
    expect(screen.getByText("Total spending:")).toBeInTheDocument();

    // Verify top merchant uses localized invoice count (not hardcoded "invoices")
    expect(screen.getByText(/Top merchant: merchant-1 \(2 invoices\)/)).toBeInTheDocument();

    // Verify the model is NOT loaded yet
    expect(screen.queryByText("Local model is ready")).not.toBeInTheDocument();
  });

  it("displays analytics preview with totals by currency separately and no cross-currency sum", async () => {
    const invoices = [
      new InvoiceBuilder().withPaymentAmount(100).withPaymentCurrency("RON").build(),
      new InvoiceBuilder().withPaymentAmount(50).withPaymentCurrency("USD").build(),
      new InvoiceBuilder().withPaymentAmount(75).withPaymentCurrency("EUR").build(),
    ];

    render(
      <LocalInvoiceAssistantPanel
        adapter={createFakeAdapter()}
        analyzeHardware={async () => eligibleHardware}
        createId={createSequentialIdFactory()}
        invoices={invoices}
        now={() => new Date("2026-01-01T00:00:00.000Z")}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Quick insights")).toBeInTheDocument();
    });

    // Verify each currency displays separately
    expect(screen.getByText(/RON: 100\.00/)).toBeInTheDocument();
    expect(screen.getByText(/USD: 50\.00/)).toBeInTheDocument();
    expect(screen.getByText(/EUR: 75\.00/)).toBeInTheDocument();

    // Ensure NO cross-currency total exists
    expect(screen.queryByText(/225\.00/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Total: 225/)).not.toBeInTheDocument();
  });

  it("renders localized suggested prompt chips after model loads with invoices", async () => {
    const invoices = [
      new InvoiceBuilder().withMerchantReference("merchant-a").withPaymentAmount(100).withPaymentCurrency("RON").build(),
      new InvoiceBuilder().withMerchantReference("merchant-a").withPaymentAmount(50).withPaymentCurrency("USD").build(),
    ];

    render(
      <LocalInvoiceAssistantPanel
        adapter={createFakeAdapter()}
        analyzeHardware={async () => eligibleHardware}
        createId={createSequentialIdFactory()}
        invoices={invoices}
        now={() => new Date("2026-01-01T00:00:00.000Z")}
      />,
    );

    // Load the model
    fireEvent.click(await screen.findByRole("button", {name: "Download local model"}));

    await waitFor(() => {
      expect(screen.getByText("Local model is ready")).toBeInTheDocument();
    });

    // Suggested prompts section should appear
    expect(screen.getByText("Suggested questions")).toBeInTheDocument();

    // Verify localized prompt chips are rendered
    expect(screen.getByRole("button", {name: "Summarize my total spending"})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Which invoice is largest?"})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Which merchant appears most often?"})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Show spending by currency"})).toBeInTheDocument();
  });

  it("does not render suggested prompt chips when there are no invoices", async () => {
    render(
      <LocalInvoiceAssistantPanel
        adapter={createFakeAdapter()}
        analyzeHardware={async () => eligibleHardware}
        createId={createSequentialIdFactory()}
        invoices={[]}
        now={() => new Date("2026-01-01T00:00:00.000Z")}
      />,
    );

    // Load the model
    fireEvent.click(await screen.findByRole("button", {name: "Download local model"}));

    await waitFor(() => {
      expect(screen.getByText("Local model is ready")).toBeInTheDocument();
    });

    // Suggested prompts section should NOT appear
    expect(screen.queryByText("Suggested questions")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", {name: "Summarize my total spending"})).not.toBeInTheDocument();
  });

  it("sends the localized prompt text through the adapter when a chip is clicked", async () => {
    const capturedMessages: string[] = [];
    const invoices = [new InvoiceBuilder().withPaymentAmount(100).withPaymentCurrency("RON").build()];
    const adapter = createFakeAdapter({
      generate: vi.fn(async (messages, options) => {
        capturedMessages.push(JSON.stringify(messages));
        options?.onToken?.("Summary result", "Summary result");

        return "Summary result";
      }),
    });

    render(
      <LocalInvoiceAssistantPanel
        adapter={adapter}
        analyzeHardware={async () => eligibleHardware}
        createId={createSequentialIdFactory()}
        invoices={invoices}
        now={() => new Date("2026-01-01T00:00:00.000Z")}
      />,
    );

    // Load the model
    fireEvent.click(await screen.findByRole("button", {name: "Download local model"}));

    await waitFor(() => {
      expect(screen.getByText("Local model is ready")).toBeInTheDocument();
    });

    // Click the "Summarize my total spending" prompt chip
    fireEvent.click(screen.getByRole("button", {name: "Summarize my total spending"}));

    // Verify the localized prompt text was sent to the adapter
    await waitFor(() => {
      expect(adapter.generate).toHaveBeenCalledOnce();
    });

    expect(capturedMessages[0]).toContain("Summarize my total spending");

    // Verify both the user message and assistant response appear
    const userMessages = screen.getAllByText("Summarize my total spending");
    expect(userMessages.length).toBeGreaterThanOrEqual(1); // At least one instance (in the chat history)
    expect(await screen.findByText("Summary result")).toBeInTheDocument(); // Assistant response
  });

  it("disables prompt chips and blocks sending when model is generating", async () => {
    const pendingResponse = createDeferred<string>();
    const invoices = [new InvoiceBuilder().withPaymentAmount(100).withPaymentCurrency("RON").build()];
    const adapter = createFakeAdapter({
      generate: vi.fn(async (_messages, options) => {
        options?.onToken?.("Partial answer", "Partial answer");

        return pendingResponse.promise;
      }),
    });

    render(
      <LocalInvoiceAssistantPanel
        adapter={adapter}
        analyzeHardware={async () => eligibleHardware}
        createId={createSequentialIdFactory()}
        invoices={invoices}
        now={() => new Date("2026-01-01T00:00:00.000Z")}
      />,
    );

    // Load model
    fireEvent.click(await screen.findByRole("button", {name: "Download local model"}));
    await waitFor(() => {
      expect(screen.getByText("Local model is ready")).toBeInTheDocument();
    });

    // Start generation via manual input
    fireEvent.change(screen.getByLabelText("Ask a local invoice question"), {
      target: {value: "Manual question"},
    });
    fireEvent.click(screen.getByRole("button", {name: "Send"}));

    // Wait for generation to start
    await waitFor(() => {
      expect(screen.getByRole("button", {name: "Stop generating"})).toBeInTheDocument();
    });

    // Verify prompt chips are disabled during generation
    const promptButton = screen.getByRole("button", {name: "Summarize my total spending"});
    expect(promptButton).toBeDisabled();

    // Attempt to click disabled prompt button
    fireEvent.click(promptButton);

    // Verify generate was NOT called again (still only once from manual input)
    expect(adapter.generate).toHaveBeenCalledOnce();

    // Complete the generation
    pendingResponse.resolve("Final answer");

    await waitFor(() => {
      expect(screen.queryByRole("button", {name: "Stop generating"})).not.toBeInTheDocument();
    });

    // Verify prompt chips are re-enabled after generation completes
    expect(promptButton).not.toBeDisabled();
  });

  it("disables prompt chips when chat is not ready to send messages", async () => {
    const invoices = [new InvoiceBuilder().withPaymentAmount(100).withPaymentCurrency("RON").build()];

    render(
      <LocalInvoiceAssistantPanel
        adapter={createFakeAdapter()}
        analyzeHardware={async () => eligibleHardware}
        createId={createSequentialIdFactory()}
        invoices={invoices}
        now={() => new Date("2026-01-01T00:00:00.000Z")}
      />,
    );

    // Wait for hardware check to complete but do NOT load model
    await waitFor(() => {
      expect(screen.getByText("Prepare local model")).toBeInTheDocument();
    });

    // Suggested prompts should NOT appear because model is not loaded
    expect(screen.queryByText("Suggested questions")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", {name: "Summarize my total spending"})).not.toBeInTheDocument();
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
    load: vi.fn(async ({onProgress}) => {
      onProgress?.({progress: 1, text: "Ready", timeElapsed: 1});
    }),
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

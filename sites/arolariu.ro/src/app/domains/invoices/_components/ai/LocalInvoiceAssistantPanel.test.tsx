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

    render(
      <LocalInvoiceAssistantPanel
        adapter={createFakeAdapter()}
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

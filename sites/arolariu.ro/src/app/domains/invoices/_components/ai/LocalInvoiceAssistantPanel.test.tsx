import "@testing-library/jest-dom/vitest";
import {InvoiceBuilder} from "@/data/mocks";
import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import type {ReactNode} from "react";
import {describe, expect, it, vi} from "vitest";
import type {HardwareEligibilityResult} from "./hardwareEligibility";
import {DEFAULT_LOCAL_AI_HARDWARE_REQUIREMENTS} from "./hardwareEligibility";
import type {LocalInvoiceAssistantAdapter} from "./webLlmAdapter";
import {LocalInvoiceAssistantPanel} from "./LocalInvoiceAssistantPanel";

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
      "actions.reset": "Reset chat",
      "actions.send": "Send",
      "chat.inputLabel": "Ask a local invoice question",
      "chat.inputPlaceholder": "Ask about your local invoices...",
      "chat.ready": "Local model is ready",
      "chat.title": "Local-only invoice assistant",
      "errors.title": "Assistant error",
      "hardware.checking": "Checking whether this device can run the local assistant...",
      "hardware.ineligibleMessage":
        "Your device does not meet the minimum hardware requirements for the local-only AI assistant. Use another device or wait until the remote AI assistant feature is available.",
      "hardware.ineligibleTitle": "Local AI assistant unavailable",
      "model.description": "Downloads a small model for private, local-only invoice chat.",
      "model.host": "Model artifacts are downloaded from {host}.",
      "model.progress": "Download progress: {progress}%",
      "model.title": "Prepare local model",
      "privacy": "Invoice data stays in this browser. Model artifacts are downloaded from the approved external host.",
      "status.compatibilityUnknown": "Some hardware details are unavailable, so performance may vary.",
    };

    return (key: string, values?: Record<string, string | number>) => {
      const template = translations[key] ?? key;

      return Object.entries(values ?? {}).reduce(
        (message, [name, value]) => message.replace(`{${name}}`, String(value)),
        template,
      );
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
  Label: ({children, ...props}: {children: ReactNode} & React.LabelHTMLAttributes<HTMLLabelElement>) => <label {...props}>{children}</label>,
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

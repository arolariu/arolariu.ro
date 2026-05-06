import {render, screen} from "@testing-library/react";
import {NextIntlClientProvider} from "next-intl";
import {describe, expect, it, vi} from "vitest";
import enMessages from "../../../../../../messages/en.json";

vi.mock("./useInvoiceAssistant", () => ({
  useInvoiceAssistant: vi.fn(),
}));

const {AssistantPanel} = await import("./AssistantPanel");
const {useInvoiceAssistant} = await import("./useInvoiceAssistant");

function withProvider(node: React.ReactNode): React.ReactElement {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages as never}>
      {node}
    </NextIntlClientProvider>
  );
}

describe("AssistantPanel", () => {
  it("renders 'workers unavailable' alert when state is workers-unavailable", () => {
    (useInvoiceAssistant as ReturnType<typeof vi.fn>).mockReturnValue({
      state: {status: "workers-unavailable", history: [], layer2: {status: "ineligible"}},
      submitQuestion: vi.fn(),
      enableLayer2: vi.fn(),
      resetConversation: vi.fn(),
    });
    render(withProvider(<AssistantPanel />));
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders example chips in embedding-ready state", () => {
    (useInvoiceAssistant as ReturnType<typeof vi.fn>).mockReturnValue({
      state: {status: "embedding-ready", history: [], layer2: {status: "ineligible", reasons: []}},
      submitQuestion: vi.fn(),
      enableLayer2: vi.fn(),
      resetConversation: vi.fn(),
    });
    render(withProvider(<AssistantPanel />));
    expect(screen.getByTestId("example-chips")).toBeInTheDocument();
    expect(screen.getByTestId("invoice-assistant-panel")).toBeInTheDocument();
  });

  it("shows Layer 2 enable CTA when eligible", () => {
    (useInvoiceAssistant as ReturnType<typeof vi.fn>).mockReturnValue({
      state: {status: "embedding-ready", history: [], layer2: {status: "eligible"}},
      submitQuestion: vi.fn(),
      enableLayer2: vi.fn(),
      resetConversation: vi.fn(),
    });
    render(withProvider(<AssistantPanel />));
    expect(screen.getByTestId("enable-layer2")).toBeInTheDocument();
  });

  it("shows progress bar in embedding-loading state", () => {
    (useInvoiceAssistant as ReturnType<typeof vi.fn>).mockReturnValue({
      state: {status: "embedding-loading", progress: 42, history: [], layer2: {status: "ineligible", reasons: []}},
      submitQuestion: vi.fn(),
      enableLayer2: vi.fn(),
      resetConversation: vi.fn(),
    });
    render(withProvider(<AssistantPanel />));
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
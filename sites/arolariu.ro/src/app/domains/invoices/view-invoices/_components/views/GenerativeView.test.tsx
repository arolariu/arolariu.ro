import {InvoiceBuilder} from "@/data/mocks";
import "@testing-library/jest-dom/vitest";
import {render, screen} from "@testing-library/react";
import type {ReactNode} from "react";
import {describe, expect, it, vi} from "vitest";
import RenderGenerativeView from "./GenerativeView";

const {mockLocalInvoiceAssistantPanel} = vi.hoisted(() => ({
  mockLocalInvoiceAssistantPanel: vi.fn(),
}));

vi.mock("../../../_components/ai/LocalInvoiceAssistantPanel", () => ({
  LocalInvoiceAssistantPanel: (props: {invoices: ReadonlyArray<unknown>}) => {
    mockLocalInvoiceAssistantPanel(props);

    return <div data-testid='local-invoice-assistant-panel'>{props.invoices.length}</div>;
  },
}));

vi.mock("motion/react", () => ({
  motion: {
    div: ({children, ...props}: {children: ReactNode} & React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) =>
    ({
      subtitle: "Chat locally with your invoice data",
      title: "Live analysis",
    })[key] ?? key,
}));

describe("RenderGenerativeView", () => {
  it("renders the shared local invoice assistant panel with the visible invoices", () => {
    const invoices = [new InvoiceBuilder().withId("invoice-one").build(), new InvoiceBuilder().withId("invoice-two").build()];

    render(<RenderGenerativeView invoices={invoices} />);

    expect(screen.getByText("Live analysis")).toBeInTheDocument();
    expect(screen.getByTestId("local-invoice-assistant-panel")).toHaveTextContent("2");
    expect(mockLocalInvoiceAssistantPanel).toHaveBeenCalledWith(expect.objectContaining({invoices}));
  });
});

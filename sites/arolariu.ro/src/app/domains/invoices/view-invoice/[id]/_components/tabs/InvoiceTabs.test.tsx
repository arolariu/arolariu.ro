import {InvoiceBuilder} from "@/data/mocks";
import "@testing-library/jest-dom/vitest";
import {render, screen} from "@testing-library/react";
import type {ReactNode} from "react";
import {describe, expect, it, vi} from "vitest";
import {InvoiceTabs} from "./InvoiceTabs";

const invoice = new InvoiceBuilder().withId("invoice-ai-tab").withAdditionalMetadata({}).withPossibleRecipes([]).build();

const {mockLocalInvoiceAssistantPanel, mockUseInvoiceContext} = vi.hoisted(() => ({
  mockLocalInvoiceAssistantPanel: vi.fn(),
  mockUseInvoiceContext: vi.fn(),
}));

vi.mock("../../../../_components/ai/LocalInvoiceAssistantPanel", () => ({
  LocalInvoiceAssistantPanel: (props: {activeInvoiceId?: string; invoices: ReadonlyArray<unknown>}) => {
    mockLocalInvoiceAssistantPanel(props);

    return (
      <div data-testid='local-invoice-assistant-panel'>
        {props.activeInvoiceId}:{props.invoices.length}
      </div>
    );
  },
}));

vi.mock("../../_context/InvoiceContext", () => ({
  useInvoiceContext: () => mockUseInvoiceContext(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, string>) =>
    ({
      "empty.additionalInfo": "No additional information available",
      "empty.recipes": "No recipe suggestions available",
      "tabs.additionalInfo": "Additional Info",
      "tabs.aiAssistant": "AI Assistant",
      "tabs.possibleRecipes": "Possible Recipes",
    })[key]
    ?? values?.minutes
    ?? key,
}));

vi.mock("@arolariu/components", () => ({
  Badge: ({children}: {children: ReactNode}) => <span>{children}</span>,
  Button: ({children}: {children: ReactNode}) => <button>{children}</button>,
  Card: ({children, ...props}: {children: ReactNode} & React.HTMLAttributes<HTMLDivElement>) => <section {...props}>{children}</section>,
  CardContent: ({children, ...props}: {children: ReactNode} & React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  CardHeader: ({children, ...props}: {children: ReactNode} & React.HTMLAttributes<HTMLElement>) => <header {...props}>{children}</header>,
  CardTitle: ({children}: {children: ReactNode}) => <h3>{children}</h3>,
  Tabs: ({children}: {children: ReactNode}) => <div>{children}</div>,
  TabsContent: ({children}: {children: ReactNode}) => <div>{children}</div>,
  TabsList: ({children}: {children: ReactNode}) => <div>{children}</div>,
  TabsTrigger: ({children}: {children: ReactNode}) => <button>{children}</button>,
}));

describe("InvoiceTabs", () => {
  it("renders a local AI assistant tab scoped to the current invoice", () => {
    mockUseInvoiceContext.mockReturnValue({invoice});

    render(<InvoiceTabs />);

    expect(screen.getByRole("button", {name: /AI Assistant/i})).toBeInTheDocument();
    expect(screen.getByTestId("local-invoice-assistant-panel")).toHaveTextContent("invoice-ai-tab:1");
    expect(mockLocalInvoiceAssistantPanel).toHaveBeenCalledWith(
      expect.objectContaining({
        activeInvoiceId: "invoice-ai-tab",
        invoices: [invoice],
      }),
    );
  });
});

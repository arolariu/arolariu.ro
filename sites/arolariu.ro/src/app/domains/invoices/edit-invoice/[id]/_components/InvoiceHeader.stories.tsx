import {storyInvoice, WithEditInvoiceContext} from "@/app/domains/invoices/_storybook";
import type {Meta, StoryObj} from "@storybook/react";
import {useEffect} from "react";
import {useEditInvoiceContext} from "../_context/EditInvoiceContext";
import InvoiceHeader from "./InvoiceHeader";

function InvoiceHeaderWithPendingName(): React.JSX.Element {
  const {setName} = useEditInvoiceContext();

  useEffect(() => {
    setName("Updated grocery receipt");
  }, [setName]);

  return <InvoiceHeader />;
}

const invoiceWithoutItems = {
  ...storyInvoice,
  id: "invoice-story-header-analysis",
  name: "Receipt awaiting analysis",
  items: [],
};

const meta = {
  title: "arolariu.ro/IMS/Components/Invoice/EditInvoiceHeader",
  component: InvoiceHeader,
  decorators: [
    (Story) => (
      <WithEditInvoiceContext>
        <Story />
      </WithEditInvoiceContext>
    ),
  ],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Mounts the real editable invoice header with EditInvoiceContext and DialogContext so save, discard, print, delete, and analysis actions render through production hooks.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof InvoiceHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoChanges: Story = {
  parameters: {
    docs: {
      description: {
        story: "Default edit header with no pending changes; save and discard controls are hidden while print and delete remain available.",
      },
    },
  },
};

export const PendingNameChange: Story = {
  render: () => <InvoiceHeaderWithPendingName />,
  parameters: {
    docs: {
      description: {
        story:
          "Header after a pending invoice-name change is written through the real EditInvoiceContext, showing save and discard controls.",
      },
    },
  },
};

export const AwaitingAnalysis: Story = {
  decorators: [
    (Story) => (
      <WithEditInvoiceContext invoice={invoiceWithoutItems}>
        <Story />
      </WithEditInvoiceContext>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Header for an invoice without line items, which exposes the real analyze-with-AI action.",
      },
    },
  },
};

/** Invoice with many updates — frequently modified. */
export const FrequentlyUpdated: Story = {
  decorators: [
    (Story) => (
      <WithEditInvoiceContext invoice={{...storyInvoice, numberOfUpdates: 15}}>
        <Story />
      </WithEditInvoiceContext>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Header for an invoice with many updates. Tests update count display and modification indicators.",
      },
    },
  },
};

/** Important invoice — flagged header. */
export const ImportantInvoice: Story = {
  decorators: [
    (Story) => (
      <WithEditInvoiceContext invoice={{...storyInvoice, isImportant: true}}>
        <Story />
      </WithEditInvoiceContext>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Header for an invoice marked as important. Tests important flag rendering in edit mode.",
      },
    },
  },
};

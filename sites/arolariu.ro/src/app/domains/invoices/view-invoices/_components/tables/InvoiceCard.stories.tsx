import type {Invoice} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {
  invoicePresets,
  resetInvoiceStoryStores,
  seedInvoiceStoryStores,
  storyHugeInvoice,
  storyInvoice,
  withEntityPreset,
  WithInvoiceDialogs,
} from "../../../_storybook";
import {InvoiceCard} from "./InvoiceCard";

type StoryArgs = {
  invoice: Invoice;
  invoicePreset: "standard" | "public";
  isSelected: boolean;
  loading: "eager" | "lazy";
  onToggleSelection: (invoiceId: string) => void;
};

/**
 * InvoiceCard displays one invoice as a grid card with scan carousel.
 *
 * This story mounts the real InvoiceCard component with various invoice configurations.
 * Wrapped with DialogProvider to provide required dialog context.
 */
const meta = {
  title: "arolariu.ro/IMS/Tables/Invoice/InvoiceCard",
  component: InvoiceCard,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    invoicePreset: {control: "select", options: ["standard", "public"]},
    invoice: {control: "object"},
    isSelected: {control: "boolean"},
    loading: {control: "select", options: ["eager", "lazy"]},
    onToggleSelection: {action: "onToggleSelection"},
  },
  args: {
    invoicePreset: "standard",
    invoice: storyInvoice,
    isSelected: false,
    loading: "eager",
    onToggleSelection: (invoiceId: string) => {
      console.log("Toggle selection for invoice:", invoiceId);
    },
  },
  decorators: [
    withEntityPreset("invoicePreset", "invoice", invoicePresets),
    (Story) => {
      resetInvoiceStoryStores();
      seedInvoiceStoryStores();
      return (
        <WithInvoiceDialogs>
          <div style={{maxWidth: "400px"}}>
            <Story />
          </div>
        </WithInvoiceDialogs>
      );
    },
  ],
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/**
 * Default invoice card with scans.
 */
export const Default: Story = {};

/**
 * Selected invoice card.
 */
export const Selected: Story = {
  args: {
    isSelected: true,
  },
};

/**
 * Invoice card with no scans.
 */
export const NoScans: Story = {
  args: {
    invoicePreset: "public",
    invoice: {
      ...invoicePresets["public"],
      scans: [],
    } as Invoice,
  },
};

/**
 * Important invoice card (flagged) to show the importance indicator.
 */
export const Important: Story = {
  args: {
    invoice: {
      ...invoicePresets["standard"],
      isImportant: true,
    } as Invoice,
  },
};

/**
 * Invoice card with a very long name to exercise title truncation.
 */
export const LongName: Story = {
  args: {
    invoice: {
      ...invoicePresets["standard"],
      name: "Monthly Bulk Grocery & Household Supplies Shopping Trip - Mega Image Militari - March 2024",
    } as Invoice,
  },
};

/**
 * Invoice card with huge number of items (120) to test item count display.
 */
export const HugeItemCount: Story = {
  args: {
    invoice: storyHugeInvoice,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Invoice card displaying an invoice with 120 line items. Tests item count display and performance with large invoice metadata.",
      },
    },
  },
};

/**
 * Invoice card with lazy loading.
 */
export const LazyLoading: Story = {
  args: {
    loading: "lazy",
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice card with lazy image loading. Tests loading attribute and performance optimization for off-screen cards.",
      },
    },
  },
};

/**
 * Important and selected invoice card — combined states.
 */
export const ImportantAndSelected: Story = {
  args: {
    invoice: {
      ...invoicePresets["standard"],
      isImportant: true,
    } as Invoice,
    isSelected: true,
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice card that is both important and selected. Tests combined state rendering and visual hierarchy.",
      },
    },
  },
};

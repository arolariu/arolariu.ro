import {
  invoicePresets,
  setupEditInvoiceStory,
  storyDeletedInvoice,
  storyEurInvoice,
  storyGbpInvoice,
  storyInvoice,
  storyMerchant,
  storySharedManyInvoice,
  storyTipInvoice,
  storyUsdInvoice,
  WithEditInvoiceContext,
  withEntityPreset,
} from "@/app/domains/invoices/_storybook";
import type {Invoice} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import InvoiceCard from "./InvoiceCard";

type StoryArgs = {invoice: Invoice; invoicePreset: "standard" | "public"};

/**
 * InvoiceCard (edit) displays comprehensive invoice details with inline editing.
 *
 * This story mounts the real component wrapped in `WithEditInvoiceContext`.
 */
const meta = {
  title: "arolariu.ro/IMS/Cards/Invoice/InvoiceCard",
  component: InvoiceCard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Comprehensive invoice details card for the edit page. Displays merchant info, date, category, payment type, total, "
          + "currency, importance flag, and optional notes. Enables inline editing of invoice metadata via context-provided callbacks. "
          + "Mounted with real EditInvoiceContext provider.",
      },
    },
  },
  argTypes: {
    invoicePreset: {control: "select", options: ["standard", "public"]},
    invoice: {control: "object"},
  },
  args: {invoicePreset: "standard", invoice: storyInvoice},
  decorators: [withEntityPreset("invoicePreset", "invoice", invoicePresets)],
  beforeEach: (context) => {
    const {invoice} = context.args as StoryArgs;
    setupEditInvoiceStory({invoice, merchant: storyMerchant});
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/** Default invoice card with standard invoice data. */
export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Default state with realistic invoice fixture showing merchant 'Corner Shop ABC', category 'Groceries', "
          + "payment type 'Card', and formatted total. Displays all editable fields with standard styling.",
      },
    },
  },
  render: ({invoice}) => (
    <WithEditInvoiceContext
      invoice={invoice}
      merchant={storyMerchant}>
      <InvoiceCard />
    </WithEditInvoiceContext>
  ),
};

/** Important invoice card with isImportant flag set. */
export const ImportantInvoice: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Variant with `isImportant: true` flag enabled. Displays enhanced visual indicators (star icon, accent color) "
          + "to highlight high-priority or bookmarked invoices in the edit interface.",
      },
    },
  },
  render: ({invoice}) => (
    <WithEditInvoiceContext
      invoice={{...invoice, isImportant: true}}
      merchant={storyMerchant}>
      <InvoiceCard />
    </WithEditInvoiceContext>
  ),
};

/** Invoice whose merchant has a very long name to exercise truncation/wrapping. */
export const LongMerchantName: Story = {
  render: ({invoice}) => (
    <WithEditInvoiceContext
      invoice={invoice}
      merchant={{
        ...storyMerchant,
        name: "Corner Shop ABC International Wholesale & Retail Distribution Center Bucuresti Militari Branch",
      }}>
      <InvoiceCard />
    </WithEditInvoiceContext>
  ),
};

/** Invoice with only the minimal fields populated (no description, recipes, or importance). */
export const MinimalFields: Story = {
  render: ({invoice}) => (
    <WithEditInvoiceContext
      invoice={{...invoice, description: "", isImportant: false, possibleRecipes: []}}
      merchant={storyMerchant}>
      <InvoiceCard />
    </WithEditInvoiceContext>
  ),
};

/** Invoice categorised differently to show category-dependent presentation. */
export const DifferentCategory: Story = {
  render: ({invoice}) => (
    <WithEditInvoiceContext
      invoice={{...invoice, category: 200 as typeof invoice.category}}
      merchant={storyMerchant}>
      <InvoiceCard />
    </WithEditInvoiceContext>
  ),
};

/** Invoice with extremely long description text. */
export const LongDescription: Story = {
  render: ({invoice}) => (
    <WithEditInvoiceContext
      invoice={{
        ...invoice,
        description:
          "This invoice intentionally carries an extremely long description to verify that text wrapping, clamping, and ellipsis behaviour render correctly across cards, tables, and dialog headers without breaking layout or overflowing containers. The description continues to test multi-line handling and responsive text overflow strategies.",
      }}
      merchant={storyMerchant}>
      <InvoiceCard />
    </WithEditInvoiceContext>
  ),
};

/** Invoice with zero total amount — edge case. */
export const ZeroAmount: Story = {
  render: ({invoice}) => (
    <WithEditInvoiceContext
      invoice={{
        ...invoice,
        paymentInformation: {
          ...invoice.paymentInformation,
          totalCostAmount: 0,
          subtotalAmount: 0,
          totalTaxAmount: 0,
          tipAmount: 0,
        },
      }}
      merchant={storyMerchant}>
      <InvoiceCard />
    </WithEditInvoiceContext>
  ),
};

/** Invoice with very high amount — formatting test. */
export const HighAmount: Story = {
  render: ({invoice}) => (
    <WithEditInvoiceContext
      invoice={{
        ...invoice,
        paymentInformation: {
          ...invoice.paymentInformation,
          totalCostAmount: 99999.99,
          subtotalAmount: 84033.61,
          totalTaxAmount: 15966.38,
          tipAmount: 0,
        },
      }}
      merchant={storyMerchant}>
      <InvoiceCard />
    </WithEditInvoiceContext>
  ),
};

/** Invoice with EUR currency. */
export const EuroCurrency: Story = {
  render: () => (
    <WithEditInvoiceContext
      invoice={storyEurInvoice}
      merchant={storyMerchant}>
      <InvoiceCard />
    </WithEditInvoiceContext>
  ),
};

/** Invoice with USD currency. */
export const UsdCurrency: Story = {
  render: () => (
    <WithEditInvoiceContext
      invoice={storyUsdInvoice}
      merchant={storyMerchant}>
      <InvoiceCard />
    </WithEditInvoiceContext>
  ),
};

/** Invoice with GBP currency. */
export const GbpCurrency: Story = {
  render: () => (
    <WithEditInvoiceContext
      invoice={storyGbpInvoice}
      merchant={storyMerchant}>
      <InvoiceCard />
    </WithEditInvoiceContext>
  ),
};

/** Invoice with tip amount. */
export const WithTip: Story = {
  render: () => (
    <WithEditInvoiceContext
      invoice={storyTipInvoice}
      merchant={storyMerchant}>
      <InvoiceCard />
    </WithEditInvoiceContext>
  ),
};

/** Invoice with cash payment type. */
export const CashPayment: Story = {
  render: ({invoice}) => (
    <WithEditInvoiceContext
      invoice={{
        ...invoice,
        paymentInformation: {...invoice.paymentInformation, paymentType: 100 as typeof invoice.paymentInformation.paymentType},
      }}
      merchant={storyMerchant}>
      <InvoiceCard />
    </WithEditInvoiceContext>
  ),
};

/** Soft-deleted invoice. */
export const SoftDeleted: Story = {
  render: () => (
    <WithEditInvoiceContext
      invoice={storyDeletedInvoice}
      merchant={storyMerchant}>
      <InvoiceCard />
    </WithEditInvoiceContext>
  ),
};

/** Invoice shared with many users. */
export const SharedWithMany: Story = {
  render: () => (
    <WithEditInvoiceContext
      invoice={storySharedManyInvoice}
      merchant={storyMerchant}>
      <InvoiceCard />
    </WithEditInvoiceContext>
  ),
};

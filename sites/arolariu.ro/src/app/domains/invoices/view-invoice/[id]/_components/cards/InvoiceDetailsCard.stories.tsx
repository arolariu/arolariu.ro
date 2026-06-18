import type {Currency} from "@/types/DDD/SharedKernel/Currency";
import type {Invoice} from "@/types/invoices";
import type {PaymentType} from "@/types/invoices/Payment";
import type {Meta, StoryObj} from "@storybook/react";
import {
  invoicePresets,
  storyInvoice,
  storyMerchant,
  storyOnlineInvoice,
  storyOnlineMerchant,
  withEntityPreset,
  WithViewInvoiceContext,
} from "../../../../_storybook";
import {InvoiceDetailsCard} from "./InvoiceDetailsCard";

type StoryArgs = {invoice: Invoice; invoicePreset: "standard" | "public"};

const euroCurrency: Currency = {
  name: "Euro",
  code: "EUR",
  symbol: "€",
};

// Extract first product from online invoice
const firstOnlineProduct = storyOnlineInvoice.items.at(0);
if (!firstOnlineProduct) {
  throw new Error("storyOnlineInvoice must have at least one product for InvoiceDetailsCard stories");
}

const foreignCurrencyInvoice: Invoice = {
  ...storyOnlineInvoice,
  id: "invoice-story-foreign-currency",
  name: "Electronics Order - FastDelivery.ro EUR",
  description: "Online purchase in EUR with RON equivalent display",
  merchantReference: storyOnlineMerchant.id,
  paymentInformation: {
    ...storyOnlineInvoice.paymentInformation,
    transactionDate: new Date("2024-03-10T16:20:00.000Z"),
    paymentType: 200 as PaymentType,
    currency: euroCurrency,
    totalCostAmount: 59.99,
    totalTaxAmount: 11.39,
    subtotalAmount: 48.6,
    tipAmount: 0,
  },
  items: [
    {
      ...firstOnlineProduct,
      price: 59.99,
      totalPrice: 59.99,
    },
  ],
  taxDetails: [
    {
      amount: 11.39,
      rate: 19,
      netAmount: 48.6,
      description: "VAT 19%",
    },
  ],
  payments: [
    {
      method: "Debit Card",
      amount: 59.99,
    },
  ],
};

const emptyInvoice: Invoice = {
  ...storyInvoice,
  id: "invoice-story-empty-items",
  name: "Empty items invoice",
  description: "Invoice with no extracted line items",
  items: [],
};

const meta = {
  title: "arolariu.ro/IMS/Cards/Invoice/InvoiceDetails",
  component: InvoiceDetailsCard,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "Renders the real invoice details card inside the view-invoice context provider.",
      },
    },
  },
  argTypes: {
    invoicePreset: {control: "select", options: ["standard", "public"]},
    invoice: {control: "object"},
  },
  args: {invoicePreset: "standard", invoice: storyInvoice},
  decorators: [withEntityPreset("invoicePreset", "invoice", invoicePresets)],
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

export const StandardInvoice: Story = {
  render: ({invoice}) => (
    <WithViewInvoiceContext
      invoice={invoice}
      merchant={storyMerchant}>
      <div style={{width: "min(960px, 100vw)"}}>
        <InvoiceDetailsCard />
      </div>
    </WithViewInvoiceContext>
  ),
  parameters: {
    docs: {
      description: {
        story: "Shows date, category, payment, totals, tax, and line items for a typical invoice.",
      },
    },
  },
};

export const ForeignCurrencyInvoice: Story = {
  render: () => (
    <WithViewInvoiceContext
      invoice={foreignCurrencyInvoice}
      merchant={storyOnlineMerchant}>
      <div style={{width: "min(960px, 100vw)"}}>
        <InvoiceDetailsCard />
      </div>
    </WithViewInvoiceContext>
  ),
  parameters: {
    docs: {
      description: {
        story: "Shows the non-RON currency path including the RON equivalent display.",
      },
    },
  },
};

export const EmptyLineItems: Story = {
  render: () => (
    <WithViewInvoiceContext
      invoice={emptyInvoice}
      merchant={storyMerchant}>
      <div style={{width: "min(960px, 100vw)"}}>
        <InvoiceDetailsCard />
      </div>
    </WithViewInvoiceContext>
  ),
  parameters: {
    docs: {
      description: {
        story: "Shows the real card when no products were extracted from the invoice.",
      },
    },
  },
};

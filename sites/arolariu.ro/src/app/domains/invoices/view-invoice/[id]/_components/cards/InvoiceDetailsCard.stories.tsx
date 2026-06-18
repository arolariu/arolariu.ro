import type {Currency} from "@/types/DDD/SharedKernel/Currency";
import type {Invoice, Product} from "@/types/invoices";
import type {PaymentType} from "@/types/invoices/Payment";
import type {Meta, StoryObj} from "@storybook/react";
import {
  invoicePresets,
  storyEurInvoice,
  storyGbpInvoice,
  storyInvoice,
  storyLargeTotalInvoice,
  storyMerchant,
  storyOnlineInvoice,
  storyOnlineMerchant,
  storyProducts,
  storyTipInvoice,
  storyUsdInvoice,
  storyZeroTotalInvoice,
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

/** Invoice with many line items — overflow/scroll test. */
export const ManyLineItems: Story = {
  render: ({invoice}) => {
    const baseProduct: Product = invoice.items[0] ?? storyProducts[0]!;
    const items = Array.from({length: 50}, (_, i) => {
      const product: Product = {
        ...baseProduct,
        name: `Product ${i + 1}`,
        quantity: (i % 5) + 1,
        price: Number(((i % 20) + 2.99).toFixed(2)),
        totalPrice: Number((((i % 5) + 1) * ((i % 20) + 2.99)).toFixed(2)),
      };
      return product;
    });
    const manyItemsInvoice: typeof invoice = {...invoice, items};
    return (
      <WithViewInvoiceContext
        invoice={manyItemsInvoice}
        merchant={storyMerchant}>
        <div style={{width: "min(960px, 100vw)"}}>
          <InvoiceDetailsCard />
        </div>
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice with 50 line items to verify table scrolling, pagination, and layout stability.",
      },
    },
  },
};

/** Invoice with very long product names. */
export const LongProductNames: Story = {
  render: ({invoice}) => {
    const baseProduct: Product = invoice.items[0] ?? storyProducts[0]!;
    const item1: Product = {
      ...baseProduct,
      name: "Extra Virgin Organic Cold-Pressed Mediterranean Olive Oil First Harvest Limited Edition Premium Quality",
    };
    const item2: Product = {
      ...baseProduct,
      name: "Aged Parmigiano-Reggiano DOP 36-Month Matured Cheese from Emilia-Romagna Region Italy Finely Grated",
    };
    const longNamesInvoice: typeof invoice = {
      ...invoice,
      items: [item1, item2],
    };
    return (
      <WithViewInvoiceContext
        invoice={longNamesInvoice}
        merchant={storyMerchant}>
        <div style={{width: "min(960px, 100vw)"}}>
          <InvoiceDetailsCard />
        </div>
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice with extremely long product names to test text wrapping and truncation in the items table.",
      },
    },
  },
};

/** Invoice with EUR currency — foreign currency handling. */
export const EuroCurrencyInvoice: Story = {
  render: () => {
    const baseProduct: Product = storyProducts[0]!;
    const eurInvoiceData: Invoice = {
      ...storyEurInvoice,
      items: [
        {...baseProduct, price: 12.99, totalPrice: 12.99},
        {...baseProduct, name: "Item 2", price: 8.5, totalPrice: 8.5},
      ],
      paymentInformation: {
        ...storyEurInvoice.paymentInformation,
        totalCostAmount: 21.49,
        subtotalAmount: 18.0,
        totalTaxAmount: 3.49,
        tipAmount: 0,
      },
    };
    return (
      <WithViewInvoiceContext
        invoice={eurInvoiceData}
        merchant={storyOnlineMerchant}>
        <div style={{width: "min(960px, 100vw)"}}>
          <InvoiceDetailsCard />
        </div>
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {story: "Invoice denominated in EUR to verify currency symbol rendering and formatting."},
    },
  },
};

/** Invoice with USD currency — another foreign currency. */
export const UsdCurrencyInvoice: Story = {
  render: () => {
    const baseProduct: Product = storyProducts[0]!;
    const usdInvoiceData: Invoice = {
      ...storyUsdInvoice,
      items: [
        {...baseProduct, price: 25.0, totalPrice: 25.0},
        {...baseProduct, name: "Item 2", price: 14.99, totalPrice: 14.99},
      ],
      paymentInformation: {
        ...storyUsdInvoice.paymentInformation,
        totalCostAmount: 39.99,
        subtotalAmount: 33.6,
        totalTaxAmount: 6.39,
        tipAmount: 0,
      },
    };
    return (
      <WithViewInvoiceContext
        invoice={usdInvoiceData}
        merchant={storyOnlineMerchant}>
        <div style={{width: "min(960px, 100vw)"}}>
          <InvoiceDetailsCard />
        </div>
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {story: "Invoice denominated in USD to verify currency symbol rendering and formatting."},
    },
  },
};

/** Invoice with GBP currency. */
export const GbpCurrencyInvoice: Story = {
  render: () => {
    const baseProduct: Product = storyProducts[0]!;
    const gbpInvoiceData: Invoice = {
      ...storyGbpInvoice,
      items: [
        {...baseProduct, price: 8.99, totalPrice: 8.99},
        {...baseProduct, name: "Item 2", price: 5.5, totalPrice: 5.5},
      ],
      paymentInformation: {
        ...storyGbpInvoice.paymentInformation,
        totalCostAmount: 14.49,
        subtotalAmount: 12.15,
        totalTaxAmount: 2.34,
        tipAmount: 0,
      },
    };
    return (
      <WithViewInvoiceContext
        invoice={gbpInvoiceData}
        merchant={storyOnlineMerchant}>
        <div style={{width: "min(960px, 100vw)"}}>
          <InvoiceDetailsCard />
        </div>
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {story: "Invoice denominated in GBP to verify British pound currency formatting."},
    },
  },
};

/** Invoice with tip amount — payment breakdown variation. */
export const WithTipAmount: Story = {
  render: () => {
    const baseProduct: Product = storyProducts[0]!;
    const tipInvoiceData: Invoice = {
      ...storyTipInvoice,
      items: [{...baseProduct, price: 50.0, totalPrice: 50.0}],
      paymentInformation: {
        ...storyTipInvoice.paymentInformation,
        totalCostAmount: 75.0,
        subtotalAmount: 50.0,
        totalTaxAmount: 0,
        tipAmount: 25.0,
      },
    };
    return (
      <WithViewInvoiceContext
        invoice={tipInvoiceData}
        merchant={storyMerchant}>
        <div style={{width: "min(960px, 100vw)"}}>
          <InvoiceDetailsCard />
        </div>
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {story: "Invoice with a tip/gratuity amount to verify payment breakdown display."},
    },
  },
};

/** Invoice with zero total — edge case. */
export const ZeroTotalInvoice: Story = {
  render: () => {
    const zeroInvoiceData: Invoice = {
      ...storyZeroTotalInvoice,
      items: [],
    };
    return (
      <WithViewInvoiceContext
        invoice={zeroInvoiceData}
        merchant={storyMerchant}>
        <div style={{width: "min(960px, 100vw)"}}>
          <InvoiceDetailsCard />
        </div>
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {story: "Invoice with zero total amount to test edge-case currency formatting."},
    },
  },
};

/** Invoice with large total amount — formatting test. */
export const LargeTotalInvoice: Story = {
  render: () => {
    const baseProduct: Product = storyProducts[0]!;
    const largeInvoiceData: Invoice = {
      ...storyLargeTotalInvoice,
      items: [
        {...baseProduct, price: 500000.0, totalPrice: 500000.0},
        {...baseProduct, name: "Item 2", price: 537037.03, totalPrice: 537037.03},
      ],
    };
    return (
      <WithViewInvoiceContext
        invoice={largeInvoiceData}
        merchant={storyMerchant}>
        <div style={{width: "min(960px, 100vw)"}}>
          <InvoiceDetailsCard />
        </div>
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {story: "Invoice with large total amount (>1M) to verify number formatting with thousands separators."},
    },
  },
};

/** Invoice with single product. */
export const SingleProduct: Story = {
  render: ({invoice}) => {
    const baseProduct: Product = invoice.items[0] ?? storyProducts[0]!;
    const singleProductInvoice: typeof invoice = {...invoice, items: [baseProduct]};
    return (
      <WithViewInvoiceContext
        invoice={singleProductInvoice}
        merchant={storyMerchant}>
        <div style={{width: "min(960px, 100vw)"}}>
          <InvoiceDetailsCard />
        </div>
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {story: "Invoice with exactly one product to test single-item layout."},
    },
  },
};

/** Invoice with fractional product quantities. */
export const FractionalQuantities: Story = {
  render: ({invoice}) => {
    const baseProduct: Product = invoice.items[0] ?? storyProducts[0]!;
    const item1: Product = {...baseProduct, name: "Cheese", quantity: 0.5, price: 15.0, totalPrice: 7.5};
    const item2: Product = {...baseProduct, name: "Meat", quantity: 1.25, price: 20.0, totalPrice: 25.0};
    const fractionalInvoice: typeof invoice = {...invoice, items: [item1, item2]};
    return (
      <WithViewInvoiceContext
        invoice={fractionalInvoice}
        merchant={storyMerchant}>
        <div style={{width: "min(960px, 100vw)"}}>
          <InvoiceDetailsCard />
        </div>
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {story: "Invoice with fractional product quantities (0.5, 1.25) to test decimal handling."},
    },
  },
};

/** Invoice with mixed payment types in breakdown. */
export const MixedPaymentMethods: Story = {
  render: ({invoice}) => {
    const mixedPaymentInvoice: typeof invoice = {
      ...invoice,
      payments: [
        {method: "Card", amount: 50.0},
        {method: "Cash", amount: 30.0},
        {method: "Voucher", amount: 20.0},
      ],
      paymentInformation: {
        ...invoice.paymentInformation,
        totalCostAmount: 100.0,
        subtotalAmount: 84.03,
        totalTaxAmount: 15.97,
        tipAmount: 0,
      },
    };
    return (
      <WithViewInvoiceContext
        invoice={mixedPaymentInvoice}
        merchant={storyMerchant}>
        <div style={{width: "min(960px, 100vw)"}}>
          <InvoiceDetailsCard />
        </div>
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {story: "Invoice with multiple payment methods (card, cash, voucher) to test payment breakdown display."},
    },
  },
};

/** Invoice with high tax rate — 24%. */
export const HighTaxRate: Story = {
  render: ({invoice}) => {
    const baseProduct: Product = invoice.items[0] ?? storyProducts[0]!;
    const highTaxInvoice: typeof invoice = {
      ...invoice,
      items: [{...baseProduct, price: 100.0, totalPrice: 100.0}],
      paymentInformation: {
        ...invoice.paymentInformation,
        totalCostAmount: 124.0,
        subtotalAmount: 100.0,
        totalTaxAmount: 24.0,
        tipAmount: 0,
      },
      taxDetails: [{amount: 24.0, rate: 24, netAmount: 100.0, description: "VAT 24%"}],
    };
    return (
      <WithViewInvoiceContext
        invoice={highTaxInvoice}
        merchant={storyMerchant}>
        <div style={{width: "min(960px, 100vw)"}}>
          <InvoiceDetailsCard />
        </div>
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {story: "Invoice with high tax rate (24%) to verify tax display and calculation."},
    },
  },
};

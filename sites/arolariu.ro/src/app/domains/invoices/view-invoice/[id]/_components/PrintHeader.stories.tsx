import type {Meta, StoryObj} from "@storybook/react";
import {storyInvoice, storyMerchant, storyOnlineInvoice, storyOnlineMerchant, storyProducts} from "@/app/domains/invoices/_storybook";
import {InvoiceCategory, type Invoice, type Merchant, type Product} from "@/types/invoices";
import {PrintHeader} from "./PrintHeader";
import type React from "react";

type DateConstructorArguments =
  | []
  | [value: string | number | Date]
  | [year: number, monthIndex: number, date?: number, hours?: number, minutes?: number, seconds?: number, ms?: number];

const NativeDate = globalThis.Date;
const fixedPrintDate = new NativeDate(2026, 5, 12, 10, 0, 0, 0);
let activeDateMocks = 0;

function createFixedDateConstructor(fixedTime: number): DateConstructor {
  function FixedDate(...args: DateConstructorArguments): string | Date {
    if (new.target === undefined) {
      return new NativeDate(fixedTime).toString();
    }

    if (args.length === 0) {
      return new NativeDate(fixedTime);
    }

    if (args.length === 1) {
      return new NativeDate(args[0]);
    }

    const [year, monthIndex, date, hours, minutes, seconds, ms] = args;
    return new NativeDate(year, monthIndex, date, hours, minutes, seconds, ms);
  }

  Object.setPrototypeOf(FixedDate, NativeDate);
  FixedDate.prototype = NativeDate.prototype;
  Object.defineProperty(FixedDate, "now", {
    configurable: true,
    value: () => fixedTime,
  });

  return FixedDate as DateConstructor;
}

function useFixedPrintDate(): () => void {
  if (activeDateMocks === 0) {
    globalThis.Date = createFixedDateConstructor(fixedPrintDate.getTime());
  }

  activeDateMocks += 1;

  return () => {
    activeDateMocks = Math.max(0, activeDateMocks - 1);
    if (activeDateMocks === 0) {
      globalThis.Date = NativeDate;
    }
  };
}

function repeatedProducts(count: number): Product[] {
  return Array.from({length: count}, (_, index) => {
    const sourceProduct = storyProducts[index % storyProducts.length];
    if (!sourceProduct) {
      throw new Error("Story products fixture must contain at least one product.");
    }

    return {
      ...sourceProduct,
      name: `${sourceProduct.name} ${index + 1}`,
    };
  });
}

function withPaymentTotal(invoice: Invoice, totalCostAmount: number): Invoice {
  return {
    ...invoice,
    paymentInformation: {
      ...invoice.paymentInformation,
      totalCostAmount,
      currency: {code: "RON", symbol: "RON", name: "Romanian Leu"},
    },
  };
}

/**
 * Storybook wrapper that makes the print-only header visible in canvas/docs.
 * Uses a scoped style override to display the header without modifying production code.
 */
function StorybookPrintHeaderWrapper({children}: Readonly<{children: React.ReactNode}>): React.JSX.Element {
  return (
    <>
      <style>{`
        /* Storybook-only override: make print header visible in canvas/docs */
        .sb-show-main [class^="_printHeader_"],
        .sb-show-main [class*=" _printHeader_"],
        #storybook-docs [class^="_printHeader_"],
        #storybook-docs [class*=" _printHeader_"] {
          display: block !important;
        }
      `}</style>
      {children}
    </>
  );
}

const groceryInvoice: Invoice = {
  ...withPaymentTotal(storyInvoice, 245.67),
  id: "invoice-print-grocery",
  name: "Carrefour Grocery Shopping",
  category: InvoiceCategory.GROCERY,
  items: repeatedProducts(15),
};

const restaurantInvoice: Invoice = {
  ...withPaymentTotal(storyInvoice, 128.5),
  id: "invoice-print-restaurant",
  name: "Dinner at La Mama Restaurant",
  category: InvoiceCategory.FAST_FOOD,
  items: repeatedProducts(5),
  paymentInformation: {
    ...storyInvoice.paymentInformation,
    totalCostAmount: 128.5,
    currency: {code: "RON", symbol: "lei", name: "Romanian Leu"},
    transactionDate: new Date("2024-06-15T19:30:00.000Z"),
  },
};

const highValueInvoice: Invoice = {
  ...withPaymentTotal(storyOnlineInvoice, 5499.99),
  id: "invoice-print-high-value",
  name: "Electronics Purchase - Laptop & Accessories",
  category: InvoiceCategory.OTHER,
  items: repeatedProducts(8),
};

const longNameInvoice: Invoice = {
  ...storyInvoice,
  id: "invoice-print-long-name",
  name: "Monthly Grocery Shopping Including Fresh Produce, Dairy Products, Beverages, Household Cleaning Supplies and Personal Care Items",
  items: repeatedProducts(20),
};

const singleItemInvoice: Invoice = {
  ...withPaymentTotal(storyInvoice, 12.5),
  id: "invoice-print-single-item",
  name: "Coffee Purchase",
  items: repeatedProducts(1),
};

/**
 * Print header component - only visible when printing.
 */
const meta = {
  title: "Invoices/View Invoice/Components/PrintHeader",
  component: PrintHeader,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Print-only header component displaying deterministic invoice summary information at the top of printed pages. Includes invoice name, date, merchant, total, and item count with clean formatting optimized for print media.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    invoice: {
      description: "The invoice data to display in the print header",
      control: false,
    },
    merchant: {
      description: "The merchant associated with the invoice (nullable)",
      control: false,
    },
  },
  decorators: [
    (Story) => (
      <StorybookPrintHeaderWrapper>
        <Story />
      </StorybookPrintHeaderWrapper>
    ),
  ],
  beforeEach: () => useFixedPrintDate(),
} satisfies Meta<typeof PrintHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    invoice: storyInvoice,
    merchant: storyMerchant,
  },
  parameters: {
    docs: {
      description: {
        story: "Default print header with complete deterministic invoice and merchant information.",
      },
    },
  },
};

export const WithoutMerchant: Story = {
  args: {
    invoice: storyInvoice,
    merchant: null,
  },
  parameters: {
    docs: {
      description: {
        story: "Print header when merchant information is not available. The merchant field is displayed but left empty.",
      },
    },
  },
};

export const GroceryInvoice: Story = {
  args: {
    invoice: groceryInvoice,
    merchant: storyMerchant,
  },
  parameters: {
    docs: {
      description: {
        story: "Print header for a grocery store invoice with 15 deterministic line items and a total of 245.67 RON.",
      },
    },
  },
};

export const RestaurantInvoice: Story = {
  args: {
    invoice: restaurantInvoice,
    merchant: storyMerchant,
  },
  parameters: {
    docs: {
      description: {
        story: "Print header for a restaurant invoice with 5 deterministic items and dinner timestamp. Total amount: 128.50 lei.",
      },
    },
  },
};

export const HighValueInvoice: Story = {
  args: {
    invoice: highValueInvoice,
    merchant: storyOnlineMerchant,
  },
  parameters: {
    docs: {
      description: {
        story: "Print header for a high-value electronics purchase with 8 deterministic items and a total of 5,499.99 RON.",
      },
    },
  },
};

export const WithLongName: Story = {
  args: {
    invoice: longNameInvoice,
    merchant: storyMerchant,
  },
  parameters: {
    docs: {
      description: {
        story: "Print header with a very long invoice name to test text wrapping and layout resilience.",
      },
    },
  },
};

export const SingleItem: Story = {
  args: {
    invoice: singleItemInvoice,
    merchant: storyMerchant,
  },
  parameters: {
    docs: {
      description: {
        story: "Print header for a minimal deterministic invoice with one item and a total of 12.50 lei.",
      },
    },
  },
};
